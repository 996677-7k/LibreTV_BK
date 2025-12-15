/**
 * M3U8 下载器 - 用于在浏览器中直接下载HLS/M3U8视频
 * 支持并发下载、进度显示、自动合并
 *
 * M3U8Downloader 类已合并到此文件中，以解决加载问题。
 */

(function() {
    // ====================================================================
    // M3U8Downloader Class (Merged from m3u8-downloader.js)
    // ====================================================================
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

        parseM3U8(content, baseUrl) {
            const lines = content.split(/\r?\n/);
            const segments = [];
            
            try {
                const baseUrlObj = new URL(baseUrl);
                const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);

                for (let i = 0; i < lines.length; i++) {
                    let line = lines[i].trim();
                    
                    if (!line || line.startsWith('#')) continue;
                    
                    if (this.isSegmentLine(line)) {
                        let segmentUrl = line;
                        
                        if (!segmentUrl.startsWith('http://') && !segmentUrl.startsWith('https://')) {
                            if (segmentUrl.startsWith('/')) {
                                segmentUrl = baseUrlObj.protocol + '//' + baseUrlObj.host + segmentUrl;
                            } else if (!segmentUrl.startsWith('data:')) {
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

        isSegmentLine(line) {
            if (line.startsWith('#') || line.startsWith('http') && line.includes('m3u8')) {
                return false;
            }
            
            const videoExtensions = ['.ts', '.m4s', '.vtt', '.aac', '.mp4'];
            for (const ext of videoExtensions) {
                if (line.includes(ext)) {
                    return true;
                }
            }
            
            if ((line.includes('/') || line.includes('.')) && !line.startsWith('//')) {
                return true;
            }
            
            return false;
        }

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

        calculateSpeed(completed, total) {
            return `${completed}/${total}`;
        }

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

        async triggerDownload(blob, filename) {
            // 默认下载方式
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
        }

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

    // ====================================================================
    // DownloadManager Class (UI and Queue Logic)
    // ====================================================================
    class DownloadManager {
        constructor() {
            this.tasks = [];
            this.activeDownloads = 0;
            this.MAX_CONCURRENT_DOWNLOADS = 3;
            this.ui = this.createUI();
            this.injectUI();
            this.loadSettings(); // 加载本地路径设置
            this.processQueue();
        }

        createUI() {
            const panel = document.createElement('div');
            panel.id = 'downloadManagerPanel';
            panel.className = 'fixed right-0 top-1/2 transform -translate-y-1/2 w-80 bg-gray-800 text-white shadow-2xl z-50 transition-transform duration-300 ease-in-out hidden';
            panel.style.maxHeight = '80vh';
            panel.style.overflowY = 'auto';
            panel.innerHTML = `
                <div class="p-3 border-b border-gray-700 flex justify-between items-center">
                    <h2 class="text-lg font-bold">下载管理器</h2>
                    <button id="closeDownloadManager" class="text-gray-400 hover:text-white">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div class="p-3">
                    <div id="downloadSettingsContainer" class="mb-4">
                        <h3 class="text-sm font-semibold mb-2">下载设置</h3>
                        <div class="flex items-center justify-between mb-2">
                            <label class="text-xs">本地路径:</label>
                            <span id="downloadPathDisplay" class="text-xs text-gray-400 truncate w-1/2">未选择</span>
                        </div>
                        <button id="selectPathBtn" class="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors">选择本地保存目录</button>
                        <p id="pathWarning" class="text-xs text-red-400 mt-1 hidden">注意：浏览器安全限制，您需要在每次启动时重新授权访问目录。</p>
                    </div>
                    <h3 class="text-sm font-semibold mb-2">下载队列 (<span id="queueCount">0</span>)</h3>
                    <div id="downloadQueue">
                        <p id="noTasks" class="text-gray-500 text-center text-sm">没有待处理的下载任务。</p>
                    </div>
                </div>
            `;

            panel.querySelector('#closeDownloadManager').addEventListener('click', () => this.hidePanel());
            panel.querySelector('#selectPathBtn').addEventListener('click', () => this.selectDownloadPath());

            return panel;
        }

        injectUI() {
            document.body.appendChild(this.ui);
        }

        showPanel() {
            this.ui.classList.remove('hidden');
        }

        hidePanel() {
            this.ui.classList.add('hidden');
        }

        addDownload(task) {
            this.tasks.push({
                id: Date.now() + Math.random(),
                title: task.title,
                url: task.url,
                filename: task.filename,
                status: 'queued',
                progress: 0,
                loaded: 0,
                total: 0,
                error: null,
                downloader: null
            });
            this.updateQueueUI();
            this.processQueue();
        }

        updateQueueUI() {
            const queueDiv = this.ui.querySelector('#downloadQueue');
            const queueCountSpan = this.ui.querySelector('#queueCount');
            const noTasksP = this.ui.querySelector('#noTasks');
            
            queueCountSpan.textContent = this.tasks.length;

            if (this.tasks.length === 0) {
                if (noTasksP) noTasksP.classList.remove('hidden');
                queueDiv.innerHTML = '';
                return;
            } else {
                if (noTasksP) noTasksP.classList.add('hidden');
            }

            queueDiv.innerHTML = this.tasks.map(task => `
                <div id="task-${task.id}" class="download-item p-2 border-b border-gray-700">
                    <div class="flex justify-between items-center">
                        <span class="font-medium text-sm text-white truncate">${task.title}</span>
                        <span class="text-xs text-${this.getStatusColor(task.status)}-400">${this.getStatusText(task.status)}</span>
                    </div>
                    <div class="progress-bar h-1 bg-gray-700 rounded mt-1">
                        <div class="progress-fill h-full bg-blue-500 rounded" style="width: ${task.progress}%"></div>
                    </div>
                    <div class="flex justify-between text-xs text-gray-400 mt-1">
                        <span>${task.status === 'downloading' ? `${task.loaded}/${task.total} 片段` : ''}</span>
                        <span>${task.progress.toFixed(1)}%</span>
                    </div>
                    ${task.error ? `<p class="text-xs text-red-400 mt-1">错误: ${task.error}</p>` : ''}
                </div>
            `).join('');
        }

        getStatusColor(status) {
            switch (status) {
                case 'queued': return 'gray';
                case 'downloading': return 'blue';
                case 'completed': return 'green';
                case 'failed': return 'red';
                default: return 'gray';
            }
        }

        getStatusText(status) {
            switch (status) {
                case 'queued': return '等待中';
                case 'downloading': return '正在下载';
                case 'completed': return '已完成';
                case 'failed': return '失败';
                default: return '未知';
            }
        }

        processQueue() {
            if (this.activeDownloads >= this.MAX_CONCURRENT_DOWNLOADS) {
                return;
            }

            const queuedTask = this.tasks.find(task => task.status === 'queued');

            if (queuedTask) {
                this.startDownload(queuedTask);
                this.processQueue();
            }
        }

        async startDownload(task) {
            task.status = 'downloading';
            this.activeDownloads++;
            this.updateQueueUI();

            try {
                const downloader = new M3U8Downloader({
                    onProgress: (progress) => {
                        task.progress = progress.percent || task.progress;
                        task.loaded = progress.loaded || task.loaded;
                        task.total = progress.total || task.total;
                        this.updateQueueUI();
                    },
                    onComplete: (result) => {
                        task.status = 'completed';
                        task.progress = 100;
                        this.activeDownloads--;
                        this.updateQueueUI();
                        this.processQueue();
                    },
                    onError: (error) => {
                        task.status = 'failed';
                        task.error = error.message;
                        this.activeDownloads--;
                        this.updateQueueUI();
                        this.processQueue();
                    }
                });
                task.downloader = downloader;

                await downloader.download(task.url, task.filename);

            } catch (error) {
                task.status = 'failed';
                task.error = error.message;
                this.activeDownloads--;
                this.updateQueueUI();
                this.processQueue();
            }
        }

        // =================================
        // 本地路径选择逻辑 (File System Access API)
        // =================================

        isFSApiSupported() {
            return 'showDirectoryPicker' in window;
        }

        async loadSettings() {
            if (!this.isFSApiSupported()) {
                this.ui.querySelector('#pathWarning').textContent = '您的浏览器不支持本地路径选择功能。';
                this.ui.querySelector('#pathWarning').classList.remove('hidden');
                return;
            }

            // 检查是否有保存的路径信息
            // 由于安全限制，我们不能直接恢复句柄，只能提示用户重新选择
            const pathName = localStorage.getItem('LibreTVDownloadPathName');
            if (pathName) {
                this.ui.querySelector('#downloadPathDisplay').textContent = pathName;
                this.ui.querySelector('#pathWarning').classList.remove('hidden');
            }
        }

        async selectDownloadPath() {
            if (!this.isFSApiSupported()) {
                alert('您的浏览器不支持本地路径选择功能。');
                return;
            }

            try {
                const handle = await window.showDirectoryPicker({
                    mode: 'readwrite'
                });

                const permission = await handle.queryPermission({ mode: 'readwrite' });
                if (permission === 'granted') {
                    // 存储路径名称，而不是句柄本身
                    localStorage.setItem('LibreTVDownloadPathName', handle.name);
                    
                    // 存储句柄到全局变量，供 M3U8Downloader 使用
                    window.DownloadSettings.set('directoryHandle', handle);

                    this.ui.querySelector('#downloadPathDisplay').textContent = handle.name;
                    this.ui.querySelector('#pathWarning').classList.add('hidden');
                    
                    alert(`已选择目录: ${handle.name}。下载将保存到此目录。`);
                } else {
                    alert('未获得写入权限，无法保存到本地目录。');
                }
            } catch (e) {
                if (e.name === 'AbortError') {
                    console.log('用户取消了目录选择。');
                } else {
                    console.error('选择目录失败:', e);
                    alert('选择目录失败，请检查浏览器设置。');
                }
            }
        }
    }

    // 导出 DownloadManager 类到全局
    window.DownloadManager = DownloadManager;

    // 自动实例化 DownloadManager
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof window.DownloadManager === 'function' && !window.downloadManager) {
            window.downloadManager = new window.DownloadManager();
            console.log('[Player] DownloadManager initialized.');
        }
    });

})();
