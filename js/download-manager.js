/**
 * 下载管理器 - 后台下载任务管理
 * 支持批量下载、下载队列、进度跟踪
 */

class DownloadManager {
    constructor() {
        this.downloads = []; // 下载任务列表
        this.activeDownloads = 0; // 当前活动下载数
        this.maxConcurrentDownloads = 3; // 最大并发下载任务数
        this.isProcessing = false; // 是否正在处理队列
        
        // 从 localStorage 恢复下载历史
        this.loadDownloadHistory();
        
        // 初始化 UI
        this.initUI();
    }

    /**
     * 初始化下载管理器 UI
     */
    initUI() {
        // 检查是否已经存在下载管理器面板
        if (document.getElementById('downloadManagerPanel')) {
            return;
        }

        // 创建下载管理器面板
        const panel = document.createElement('div');
        panel.id = 'downloadManagerPanel';
        panel.className = 'fixed right-4 bottom-4 w-96 bg-[#111] border border-[#333] rounded-lg shadow-2xl z-[9999] hidden';
        panel.innerHTML = `
            <div class="flex justify-between items-center p-4 border-b border-[#333]">
                <h3 class="text-lg font-bold gradient-text">下载管理器</h3>
                <div class="flex items-center space-x-2">
                    <button onclick="downloadManager.togglePanel()" class="text-gray-400 hover:text-white">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>
                    <button onclick="downloadManager.closePanel()" class="text-gray-400 hover:text-white">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div id="downloadManagerContent" class="max-h-96 overflow-y-auto">
                <div id="downloadList" class="p-4 space-y-3">
                    <div class="text-center text-gray-500 py-8">暂无下载任务</div>
                </div>
            </div>
            <div class="p-3 border-t border-[#333] flex justify-between items-center text-sm">
                <span class="text-gray-400">活动: <span id="activeDownloadCount">0</span> / 总计: <span id="totalDownloadCount">0</span></span>
                <button onclick="downloadManager.clearCompleted()" class="text-blue-400 hover:text-blue-300">清除已完成</button>
            </div>
        `;
        document.body.appendChild(panel);

        // 创建浮动按钮
        const floatBtn = document.createElement('button');
        floatBtn.id = 'downloadManagerFloatBtn';
        floatBtn.className = 'fixed right-4 bottom-4 w-14 h-14 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-lg hover:shadow-xl transition-all z-[9998] flex items-center justify-center';
        floatBtn.onclick = () => this.showPanel();
        floatBtn.innerHTML = `
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            <span id="downloadBadge" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center hidden">0</span>
        `;
        document.body.appendChild(floatBtn);
    }

    /**
     * 显示下载管理器面板
     */
    showPanel() {
        const panel = document.getElementById('downloadManagerPanel');
        const floatBtn = document.getElementById('downloadManagerFloatBtn');
        if (panel && floatBtn) {
            panel.classList.remove('hidden');
            floatBtn.classList.add('hidden');
        }
    }

    /**
     * 关闭下载管理器面板
     */
    closePanel() {
        const panel = document.getElementById('downloadManagerPanel');
        const floatBtn = document.getElementById('downloadManagerFloatBtn');
        if (panel && floatBtn) {
            panel.classList.add('hidden');
            floatBtn.classList.remove('hidden');
        }
    }

    /**
     * 切换面板展开/收起
     */
    togglePanel() {
        const content = document.getElementById('downloadManagerContent');
        if (content) {
            content.classList.toggle('hidden');
        }
    }

    /**
     * 添加下载任务
     */
    addDownload(task) {
        const download = {
            id: Date.now() + Math.random(),
            title: task.title || '未命名视频',
            episode: task.episode || '',
            url: task.url,
            filename: task.filename || 'video.mp4',
            status: 'pending', // pending, downloading, completed, failed, paused
            progress: 0,
            loaded: 0,
            total: 0,
            speed: '',
            error: null,
            createdAt: new Date().toISOString(),
            completedAt: null
        };

        this.downloads.unshift(download);
        this.updateUI();
        this.saveDownloadHistory();
        this.processQueue();

        // 显示通知
        if (typeof showToast === 'function') {
            showToast(`已添加到下载队列: ${download.title}${download.episode ? ' - ' + download.episode : ''}`, 'success');
        }

        return download.id;
    }

    /**
     * 批量添加下载任务
     */
    addBatchDownloads(tasks) {
        tasks.forEach(task => this.addDownload(task));
        if (typeof showToast === 'function') {
            showToast(`已添加 ${tasks.length} 个任务到下载队列`, 'success');
        }
    }

    /**
     * 处理下载队列
     */
    async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (true) {
            // 检查是否有待下载任务且未达到并发上限
            if (this.activeDownloads >= this.maxConcurrentDownloads) {
                break;
            }

            const pendingDownload = this.downloads.find(d => d.status === 'pending');
            if (!pendingDownload) {
                break;
            }

            // 开始下载
            this.startDownload(pendingDownload);
        }

        this.isProcessing = false;
    }

    /**
     * 开始单个下载任务
     */
        async startDownload(download) {
        download.status = 'downloading';
        this.activeDownloads++;
        this.updateUI();

        try {
            // 确保 M3U8Downloader 是一个可实例化的类
            if (typeof window.M3U8Downloader !== 'function') {
                throw new Error('M3U8Downloader 类未正确加载或不是一个构造函数。');
            }
            
            const downloader = new window.M3U8Downloader({r({
                onProgress: (progress) => {
                    if (progress.percent !== undefined) {
                        download.progress = progress.percent;
                        download.loaded = progress.loaded;
                        download.total = progress.total;
                        download.speed = progress.speed;
                    }
                    this.updateDownloadItem(download);
                },
                onError: (error) => {
                    console.error('[DownloadManager] Download error:', error);
                },
                onComplete: (info) => {
                    download.status = 'completed';
                    download.progress = 100;
                    download.completedAt = new Date().toISOString();
                    this.activeDownloads--;
                    this.updateUI();
                    this.saveDownloadHistory();
                    this.processQueue(); // 继续处理队列
                }
            });

            await downloader.download(download.url, download.filename);

        } catch (error) {
            download.status = 'failed';
            download.error = error.message;
            this.activeDownloads--;
            this.updateUI();
            this.saveDownloadHistory();
            this.processQueue(); // 继续处理队列
        }
    }

    /**
     * 重试下载
     */
    retryDownload(downloadId) {
        const download = this.downloads.find(d => d.id === downloadId);
        if (download && (download.status === 'failed' || download.status === 'paused')) {
            download.status = 'pending';
            download.progress = 0;
            download.error = null;
            this.updateUI();
            this.processQueue();
        }
    }

    /**
     * 取消下载
     */
    cancelDownload(downloadId) {
        const download = this.downloads.find(d => d.id === downloadId);
        if (download) {
            if (download.status === 'downloading') {
                download.status = 'paused';
                this.activeDownloads--;
            } else if (download.status === 'pending') {
                download.status = 'paused';
            }
            this.updateUI();
            this.saveDownloadHistory();
        }
    }

    /**
     * 删除下载任务
     */
    removeDownload(downloadId) {
        const index = this.downloads.findIndex(d => d.id === downloadId);
        if (index !== -1) {
            const download = this.downloads[index];
            if (download.status === 'downloading') {
                this.activeDownloads--;
            }
            this.downloads.splice(index, 1);
            this.updateUI();
            this.saveDownloadHistory();
            this.processQueue();
        }
    }

    /**
     * 清除已完成的下载
     */
    clearCompleted() {
        this.downloads = this.downloads.filter(d => d.status !== 'completed');
        this.updateUI();
        this.saveDownloadHistory();
    }

    /**
     * 更新 UI
     */
    updateUI() {
        const downloadList = document.getElementById('downloadList');
        const activeCount = document.getElementById('activeDownloadCount');
        const totalCount = document.getElementById('totalDownloadCount');
        const badge = document.getElementById('downloadBadge');

        if (!downloadList) return;

        // 更新统计
        const activeDownloads = this.downloads.filter(d => d.status === 'downloading' || d.status === 'pending').length;
        if (activeCount) activeCount.textContent = activeDownloads;
        if (totalCount) totalCount.textContent = this.downloads.length;

        // 更新徽章
        if (badge) {
            if (activeDownloads > 0) {
                badge.textContent = activeDownloads;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        // 更新下载列表
        if (this.downloads.length === 0) {
            downloadList.innerHTML = '<div class="text-center text-gray-500 py-8">暂无下载任务</div>';
            return;
        }

        downloadList.innerHTML = this.downloads.map(download => this.renderDownloadItem(download)).join('');
    }

    /**
     * 渲染单个下载项
     */
    renderDownloadItem(download) {
        const statusColors = {
            pending: 'text-yellow-400',
            downloading: 'text-blue-400',
            completed: 'text-green-400',
            failed: 'text-red-400',
            paused: 'text-gray-400'
        };

        const statusTexts = {
            pending: '等待中',
            downloading: '下载中',
            completed: '已完成',
            failed: '失败',
            paused: '已暂停'
        };

        const color = statusColors[download.status] || 'text-gray-400';
        const statusText = statusTexts[download.status] || download.status;

        return `
            <div class="bg-[#1a1a1a] rounded-lg p-3 border border-[#333]" data-download-id="${download.id}">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-white truncate">${download.title}</div>
                        ${download.episode ? `<div class="text-xs text-gray-400">${download.episode}</div>` : ''}
                    </div>
                    <span class="text-xs ${color} ml-2">${statusText}</span>
                </div>
                
                ${download.status === 'downloading' || download.status === 'completed' ? `
                    <div class="mb-2">
                        <div class="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                            <div class="bg-blue-500 h-full transition-all duration-300" style="width: ${download.progress}%"></div>
                        </div>
                        <div class="flex justify-between text-xs text-gray-400 mt-1">
                            <span>${download.progress}%</span>
                            <span>${download.speed || ''}</span>
                        </div>
                    </div>
                ` : ''}
                
                ${download.error ? `
                    <div class="text-xs text-red-400 mb-2">${download.error}</div>
                ` : ''}
                
                <div class="flex justify-end space-x-2">
                    ${download.status === 'failed' || download.status === 'paused' ? `
                        <button onclick="downloadManager.retryDownload(${download.id})" class="text-xs text-blue-400 hover:text-blue-300">重试</button>
                    ` : ''}
                    ${download.status === 'downloading' || download.status === 'pending' ? `
                        <button onclick="downloadManager.cancelDownload(${download.id})" class="text-xs text-yellow-400 hover:text-yellow-300">暂停</button>
                    ` : ''}
                    <button onclick="downloadManager.removeDownload(${download.id})" class="text-xs text-red-400 hover:text-red-300">删除</button>
                </div>
            </div>
        `;
    }

    /**
     * 更新单个下载项
     */
    updateDownloadItem(download) {
        const item = document.querySelector(`[data-download-id="${download.id}"]`);
        if (item) {
            const newHTML = this.renderDownloadItem(download);
            const temp = document.createElement('div');
            temp.innerHTML = newHTML;
            item.replaceWith(temp.firstElementChild);
        }
    }

    /**
     * 保存下载历史
     */
    saveDownloadHistory() {
        try {
            // 只保存最近100条记录
            const toSave = this.downloads.slice(0, 100);
            localStorage.setItem('downloadHistory', JSON.stringify(toSave));
        } catch (e) {
            console.error('[DownloadManager] Failed to save download history:', e);
        }
    }

    /**
     * 加载下载历史
     */
    loadDownloadHistory() {
        try {
            const stored = localStorage.getItem('downloadHistory');
            if (stored) {
                this.downloads = JSON.parse(stored);
                // 将所有未完成的任务标记为暂停
                this.downloads.forEach(d => {
                    if (d.status === 'downloading' || d.status === 'pending') {
                        d.status = 'paused';
                    }
                });
            }
        } catch (e) {
            console.error('[DownloadManager] Failed to load download history:', e);
            this.downloads = [];
        }
    }
}

// 导出 DownloadManager 类到全局
window.DownloadManager = DownloadManager;


