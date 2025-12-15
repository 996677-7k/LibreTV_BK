/**
 * M3U8 下载器 - 用于在浏览器中直接下载HLS/M3U8视频
 * 支持并发下载、进度显示、自动合并
 */

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
     */
    parseM3U8(content, baseUrl) {
        const lines = content.split('\n');
        const segments = [];
        const baseUrlObj = new URL(baseUrl);
        const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);

        for (let line of lines) {
            line = line.trim();
            
            if (!line || line.startsWith('#')) continue;
            
            if (line.endsWith('.ts') || line.includes('.ts?')) {
                let segmentUrl = line;
                
                if (!segmentUrl.startsWith('http')) {
                    if (segmentUrl.startsWith('/')) {
                        segmentUrl = baseUrlObj.protocol + '//' + baseUrlObj.host + segmentUrl;
                    } else {
                        segmentUrl = baseDir + segmentUrl;
                    }
                }
                
                segments.push(segmentUrl);
            }
        }

        return segments;
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
                    console.error(`Failed to download segment ${item.index}:`, error);
                    this.onError({
                        index: item.index,
                        url: item.url,
                        error: error.message
                    });
                }
            }
        };

        const workers = [];
        for (let i = 0; i < Math.min(this.maxConcurrent, segments.length); i++) {
            workers.push(downloadWorker());
        }

        await Promise.all(workers);

        if (failed > 0) {
            throw new Error(`Failed to download ${failed} segments`);
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

        return new Blob([merged], { type: 'video/mp2t' });
    }

    /**
     * 触发浏览器下载
     */
    triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

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

            this.onProgress({ status: '正在解析播放列表...' });
            const segments = this.parseM3U8(m3u8Content, m3u8Url);

            if (segments.length === 0) {
                throw new Error('No video segments found in M3U8 file');
            }

            console.log(`Found ${segments.length} segments`);

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
            console.error('M3U8 Download Error:', error);
            this.onError({
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

/**
 * 全局M3U8下载函数
 */
window.downloadM3U8Video = async function(m3u8Url, filename) {
    const modal = document.getElementById('m3u8DownloadModal');
    if (!modal) {
        console.error('M3U8 Download Modal not found');
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
                progressBar.style.width = progress.percent + '%';
                progressText.textContent = `${progress.percent}% (${progress.loaded}/${progress.total})`;
            } else if (progress.status) {
                downloadStatus.textContent = progress.status;
            }
        },
        onError: (error) => {
            console.error('Download error:', error);
            downloadStatus.textContent = `错误: ${error.message || error}`;
            downloadStatus.style.color = '#ef4444';
        },
        onComplete: (info) => {
            downloadStatus.textContent = `下载完成！文件大小: ${(info.size / 1024 / 1024).toFixed(2)}MB`;
            downloadStatus.style.color = '#10b981';
            progressBar.style.width = '100%';
            progressText.textContent = '100%';
        }
    });

    try {
        await downloader.download(m3u8Url, filename);
    } catch (error) {
        console.error('Download failed:', error);
    }
};
