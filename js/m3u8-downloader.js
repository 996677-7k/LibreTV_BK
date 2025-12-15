/**
 * M3U8 下载器 - 用于在浏览器中直接下载HLS/M3U8视频
 * 支持并发下载、进度显示、自动合并
 */

(function() {
    class M3U8Downloader {
    constructor(options = {}) {
        // 从DownloadSettings获取配置，如果没有则使用传入的options
        const settings = window.DownloadSettings ? window.DownloadSettings.getAll() : {};
        
        this.maxConcurrent = options.maxConcurrent || settings.maxConcurrent || 5;
        this.timeout = options.timeout || settings.timeout || 30000;
        this.retryCount = options.retryCount || settings.retryCount || 3;
        this.onProgress = options.onProgress || (() => {});
        this.onError = options.onError || (() => {});
        this.onComplete = options.onComplete || (() => {});
    }

    /**
     * 解析M3U8文件内容，提取所有.ts片段URL
     * 支持多种M3U8格式和注释
     */
    parseM3U8(content, baseUrl) {
        const lines = content.split(/\r?\n/);
        const segments = [];
        
        try {
            const baseUrlObj = new URL(baseUrl);
            const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                
                // 跳过空行和注释
                if (!line || line.startsWith('#')) continue;
                
                // 检查是否是视频片段URL
                // 支持 .ts, .m4s, .vtt 等格式
                if (this.isSegmentLine(line)) {
                    let segmentUrl = line;
                    
                    // 处理相对URL
                    if (!segmentUrl.startsWith('http://') && !segmentUrl.startsWith('https://')) {
                        if (segmentUrl.startsWith('/')) {
                            // 绝对路径
                            segmentUrl = baseUrlObj.protocol + '//' + baseUrlObj.host + segmentUrl;
                        } else if (!segmentUrl.startsWith('data:')) {
                            // 相对路径
                            segmentUrl = baseDir + segmentUrl;
                        }
                    }
                    
                    segments.push(segmentUrl);
                }
            }

            console.log(`[M3U8Parser] Found ${segments.length} segments`);
            return segments;
        } catch (error) {
            console.error('[M3U8Parser] Parse error:', error);
            throw new Error(`Failed to parse M3U8: ${error.message}`);
        }
    }

    /**
     * 判断是否是视频片段行
     */
    isSegmentLine(line) {
        // 排除特殊情况
        if (line.startsWith('#') || line.startsWith('http') && line.includes('m3u8')) {
            return false;
        }
        
        // 检查常见的视频片段扩展名
        const videoExtensions = ['.ts', '.m4s', '.vtt', '.aac', '.mp4'];
        for (const ext of videoExtensions) {
            if (line.includes(ext)) {
                return true;
            }
        }
        
        // 检查是否是URL格式（包含/或.）
        if ((line.includes('/') || line.includes('.')) && !line.startsWith('//')) {
            return true;
        }
        
        return false;
    }

    /**
     * 下载单个片段，支持重试
     */
    async downloadSegment(url, retries = this.retryCount) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.arrayBuffer();
        } catch (error) {
            if (retries > 0) {
                console.warn(`[M3U8Downloader] Retry segment: ${url} (${this.retryCount - retries + 1}/${this.retryCount})`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.downloadSegment(url, retries - 1);
            }
            throw error;
        }
    }

    /**
     * 下载所有片段，支持并发控制
     */
    async downloadAllSegments(segments) {
        const results = new Array(segments.length);
        let completed = 0;
        let failed = 0;

        const queue = segments.map((url, index) => ({ url, index }));
        let queueIndex = 0;

        const downloadWorker = async () => {
            while (queueIndex < queue.length) {
                const item = queue[queueIndex++];
                
                try {
                    const data = await this.downloadSegment(item.url);
                    results[item.index] = data;
                    completed++;
                    
                    this.onProgress({
                        loaded: completed,
                        total: segments.length,
                        percent: Math.round((completed / segments.length) * 100),
                        speed: this.calculateSpeed(completed, segments.length)
                    });
                } catch (error) {
                    failed++;
                    console.error(`[M3U8Downloader] Failed to download segment ${item.index}:`, error);
                    this.onError({
                        index: item.index,
                        url: item.url,
                        error: error.message
                    });
                }
            }
        };

        const workers = [];
        const workerCount = Math.min(this.maxConcurrent, segments.length);
        for (let i = 0; i < workerCount; i++) {
            workers.push(downloadWorker());
        }

        await Promise.all(workers);

        if (failed > 0) {
            console.warn(`[M3U8Downloader] ${failed} segments failed to download`);
        }

        return results;
    }

    /**
     * 计算下载速度（简化版）
     */
    calculateSpeed(completed, total) {
        return `${completed}/${total}`;
    }

    /**
     * 合并所有片段为一个Blob
     */
    mergeSegments(segmentArrays) {
        const totalLength = segmentArrays.reduce((sum, arr) => sum + (arr ? arr.byteLength : 0), 0);
        const merged = new Uint8Array(totalLength);
        
        let offset = 0;
        for (const arr of segmentArrays) {
            if (arr) {
                merged.set(new Uint8Array(arr), offset);
                offset += arr.byteLength;
            }
        }

        return new Blob([merged], { type: 'video/mp4' });
    }

    /**
     * 触发浏览器下载
     */
    async triggerDownload(blob, filename) {
        // 尝试使用自定义目录
        const directoryHandle = await this.getDirectoryHandle();
        
        if (directoryHandle) {
            try {
                // 使用 File System Access API 保存文件
                const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                console.log('[M3U8Downloader] File saved to custom directory:', filename);
                return;
            } catch (error) {
                console.warn('[M3U8Downloader] Failed to save to custom directory, falling back to default:', error);
            }
        }
        
        // 默认下载方式
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
    },
    
    /**
     * 获取保存的目录句柄
     */
    async getDirectoryHandle() {
        try {
            const dbName = 'LibreTV_DownloadSettings';
            const storeName = 'directoryHandles';
            
            return new Promise((resolve) => {
                const request = indexedDB.open(dbName, 1);
                
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(storeName)) {
                        resolve(null);
                        return;
                    }
                    
                    const transaction = db.transaction([storeName], 'readonly');
                    const store = transaction.objectStore(storeName);
                    const getRequest = store.get('downloadDirectory');
                    
                    getRequest.onsuccess = () => {
                        resolve(getRequest.result);
                    };
                    
                    getRequest.onerror = () => {
                        resolve(null);
                    };
                };
                
                request.onerror = () => {
                    resolve(null);
                };
            });
        } catch (error) {
            console.error('[M3U8Downloader] Failed to get directory handle:', error);
            return null;
        }
    },
    /**
     * 主下载函数
     */
    async download(m3u8Url, filename) {
        try {
            this.onProgress({ status: '正在获取播放列表...' });
            const m3u8Response = await fetch(m3u8Url, {
                mode: 'cors',
                credentials: 'omit'
            });

            if (!m3u8Response.ok) {
                throw new Error(`Failed to fetch M3U8: HTTP ${m3u8Response.status}`);
            }

            const m3u8Content = await m3u8Response.text();
            console.log('[M3U8Downloader] M3U8 content length:', m3u8Content.length);

            this.onProgress({ status: '正在解析播放列表...' });
            const segments = this.parseM3U8(m3u8Content, m3u8Url);

            if (segments.length === 0) {
                throw new Error('未找到视频片段。可能是M3U8格式不支持或链接无效。');
            }

            console.log(`[M3U8Downloader] Found ${segments.length} segments`);

            this.onProgress({ status: `正在下载 ${segments.length} 个视频片段...` });
            const segmentArrays = await this.downloadAllSegments(segments);

            this.onProgress({ status: '正在合并视频片段...' });
            const blob = this.mergeSegments(segmentArrays);

            this.onProgress({ status: '正在生成下载链接...' });
            this.triggerDownload(blob, filename);

            this.onComplete({
                filename: filename,
                size: blob.size,
                segments: segments.length
            });

        } catch (error) {
            console.error('[M3U8Downloader] Download Error:', error);
            this.onError({
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

// 导出 M3U8Downloader 类到全局
window.M3U8Downloader = M3U8Downloader;

})();

/**
 * 全局M3U8下载函数
 */
window.downloadM3U8Video = async function(m3u8Url, filename) {
    console.log('[downloadM3U8Video] Starting download:', m3u8Url, filename);
    
    const modal = document.getElementById('m3u8DownloadModal');
    if (!modal) {
        console.error('[downloadM3U8Video] M3U8 Download Modal not found');
        if (typeof showToast === 'function') {
            showToast('下载对话框未找到，请刷新页面', 'error');
        }
        return;
    }

    modal.classList.remove('hidden');
    const progressBar = document.getElementById('m3u8ProgressBar');
    const progressText = document.getElementById('m3u8ProgressText');
    const downloadStatus = document.getElementById('m3u8DownloadStatus');
    const closeBtn = document.getElementById('m3u8CloseBtn');

    const downloader = new M3U8Downloader({
        onProgress: (progress) => {
            if (progress.percent !== undefined) {
                if (progressBar) progressBar.style.width = progress.percent + '%';
                if (progressText) progressText.textContent = `${progress.percent}% (${progress.loaded}/${progress.total})`;
            } else if (progress.status) {
                if (downloadStatus) downloadStatus.textContent = progress.status;
            }
        },
        onError: (error) => {
            console.error('[downloadM3U8Video] Download error:', error);
            if (downloadStatus) {
                downloadStatus.textContent = `错误: ${error.message || error}`;
                downloadStatus.style.color = '#ef4444';
            }
        },
        onComplete: (info) => {
            if (downloadStatus) {
                downloadStatus.textContent = `下载完成！文件大小: ${(info.size / 1024 / 1024).toFixed(2)}MB`;
                downloadStatus.style.color = '#10b981';
            }
            if (progressBar) progressBar.style.width = '100%';
            if (progressText) progressText.textContent = '100%';
        }
    });

    try {
        await downloader.download(m3u8Url, filename);
    } catch (error) {
        console.error('[downloadM3U8Video] Download failed:', error);
    }
};
