/**
 * 下载设置UI
 * 提供下载设置的用户界面
 */

const DownloadSettingsUI = {
    /**
     * 创建设置对话框
     */
    createSettingsModal() {
        const html = `
        <div id="downloadSettingsModal" class="fixed inset-0 bg-black/95 hidden flex items-center justify-center z-[10003]">
            <div class="bg-[#111] p-8 rounded-lg w-11/12 max-w-md border border-[#333] flex flex-col max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6 flex-none">
                    <h2 class="text-2xl font-bold gradient-text">下载设置</h2>
                    <button onclick="DownloadSettingsUI.hide()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                
                <div class="space-y-6 flex-1">
                    <!-- 最大并发数 -->
                    <div>
                        <label class="text-gray-300 text-sm font-medium mb-2 block">
                            最大并发下载数
                        </label>
                        <div class="flex items-center gap-2">
                            <input type="range" id="maxConcurrentSlider" min="1" max="20" value="5" 
                                   class="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                            <span id="maxConcurrentValue" class="text-gray-400 text-sm min-w-[40px] text-right">5</span>
                        </div>
                        <p class="text-gray-500 text-xs mt-1">更多并发 = 更快速度，但可能增加服务器负载</p>
                    </div>
                    
                    <!-- 超时时间 -->
                    <div>
                        <label class="text-gray-300 text-sm font-medium mb-2 block">
                            单片段超时时间（秒）
                        </label>
                        <div class="flex items-center gap-2">
                            <input type="range" id="timeoutSlider" min="5" max="300" step="5" value="30" 
                                   class="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                            <span id="timeoutValue" class="text-gray-400 text-sm min-w-[50px] text-right">30s</span>
                        </div>
                        <p class="text-gray-500 text-xs mt-1">网络差时可增加此值</p>
                    </div>
                    
                    <!-- 重试次数 -->
                    <div>
                        <label class="text-gray-300 text-sm font-medium mb-2 block">
                            失败重试次数
                        </label>
                        <div class="flex items-center gap-2">
                            <input type="range" id="retryCountSlider" min="0" max="10" value="3" 
                                   class="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                            <span id="retryCountValue" class="text-gray-400 text-sm min-w-[30px] text-right">3</span>
                        </div>
                        <p class="text-gray-500 text-xs mt-1">下载失败时的重试次数</p>
                    </div>
                    
                    <!-- 自动重命名 -->
                    <div>
                        <label class="text-gray-300 text-sm font-medium mb-2 flex items-center">
                            <input type="checkbox" id="autoRenameCheckbox" checked 
                                   class="mr-2 w-4 h-4 cursor-pointer" />
                            <span>自动重命名重复文件</span>
                        </label>
                        <p class="text-gray-500 text-xs mt-1">如果文件已存在，自动添加后缀</p>
                    </div>
                    
                    <!-- 显示进度 -->
                    <div>
                        <label class="text-gray-300 text-sm font-medium mb-2 flex items-center">
                            <input type="checkbox" id="showProgressCheckbox" checked 
                                   class="mr-2 w-4 h-4 cursor-pointer" />
                            <span>显示下载进度</span>
                        </label>
                        <p class="text-gray-500 text-xs mt-1">下载时显示进度条和状态信息</p>
                    </div>
                    
                    <!-- 本地下载路径 -->
                    <div>
                        <label class="text-gray-300 text-sm font-medium mb-2 block">
                            本地下载路径
                        </label>
                        <div class="flex items-center gap-2">
                            <input type="text" id="downloadPathInput" readonly 
                                   class="flex-1 bg-[#1a1a1a] border border-[#333] text-gray-400 px-3 py-2 rounded text-sm cursor-not-allowed" 
                                   placeholder="使用浏览器默认下载目录" />
                            <button onclick="DownloadSettingsUI.selectDownloadPath()" 
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition-colors whitespace-nowrap">
                                选择目录
                            </button>
                        </div>
                        <p class="text-gray-500 text-xs mt-1">选择本地下载目录（需要浏览器支持 File System Access API）</p>
                        <p id="downloadPathStatus" class="text-yellow-400 text-xs mt-1 hidden">浏览器不支持此功能</p>
                    </div>
                </div>
                
                <div class="flex gap-2 mt-6 flex-none">
                    <button onclick="DownloadSettingsUI.resetSettings()" 
                            class="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors">
                        重置为默认
                    </button>
                    <button onclick="DownloadSettingsUI.saveSettings()" 
                            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors">
                        保存设置
                    </button>
                </div>
            </div>
        </div>
        `;
        return html;
    },

    /**
     * 选择下载路径
     */
    async selectDownloadPath() {
        // 检查浏览器是否支持 File System Access API
        if (!('showDirectoryPicker' in window)) {
            const statusEl = document.getElementById('downloadPathStatus');
            if (statusEl) {
                statusEl.classList.remove('hidden');
                statusEl.textContent = '您的浏览器不支持此功能，请使用 Chrome/Edge 86+ 或其他支持的浏览器';
            }
            if (typeof showToast === 'function') {
                showToast('浏览器不支持目录选择功能', 'error');
            }
            return;
        }

        try {
            // 打开目录选择器
            const directoryHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'downloads'
            });

            // 保存目录句柄
            if (window.DownloadSettings) {
                window.DownloadSettings.set('directoryHandle', directoryHandle.name);
                // 尝试保存句柄到 IndexedDB（由于安全限制，不能直接存储到 localStorage）
                this.saveDirectoryHandle(directoryHandle);
            }

            // 更新 UI
            const pathInput = document.getElementById('downloadPathInput');
            if (pathInput) {
                pathInput.value = directoryHandle.name;
                pathInput.classList.remove('cursor-not-allowed');
                pathInput.classList.add('text-white');
            }

            const statusEl = document.getElementById('downloadPathStatus');
            if (statusEl) {
                statusEl.classList.remove('hidden', 'text-yellow-400');
                statusEl.classList.add('text-green-400');
                statusEl.textContent = '目录选择成功！下载将保存到此目录';
            }

            if (typeof showToast === 'function') {
                showToast(`已选择下载目录: ${directoryHandle.name}`, 'success');
            }
        } catch (error) {
            console.error('[DownloadSettingsUI] Failed to select directory:', error);
            if (error.name !== 'AbortError') {
                if (typeof showToast === 'function') {
                    showToast('选择目录失败', 'error');
                }
            }
        }
    },

    /**
     * 保存目录句柄到 IndexedDB
     */
    async saveDirectoryHandle(handle) {
        try {
            // 使用 IndexedDB 存储目录句柄
            const dbName = 'LibreTV_DownloadSettings';
            const storeName = 'directoryHandles';
            
            const request = indexedDB.open(dbName, 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName);
                }
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                store.put(handle, 'downloadDirectory');
                console.log('[DownloadSettingsUI] Directory handle saved to IndexedDB');
            };
            
            request.onerror = (error) => {
                console.error('[DownloadSettingsUI] Failed to save directory handle:', error);
            };
        } catch (error) {
            console.error('[DownloadSettingsUI] IndexedDB error:', error);
        }
    },

    /**
     * 从 IndexedDB 加载目录句柄
     */
    async loadDirectoryHandle() {
        try {
            const dbName = 'LibreTV_DownloadSettings';
            const storeName = 'directoryHandles';
            
            return new Promise((resolve, reject) => {
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
            console.error('[DownloadSettingsUI] Failed to load directory handle:', error);
            return null;
        }
    },

    /**
     * 初始化设置UI
     */
    init() {
        console.log('[DownloadSettingsUI] Initializing...');
        
        // 检查是否已经创建了modal
        if (document.getElementById('downloadSettingsModal')) {
            console.log('[DownloadSettingsUI] Modal already exists');
            return;
        }

        // 创建modal
        const container = document.createElement('div');
        container.innerHTML = this.createSettingsModal();
        document.body.appendChild(container.firstElementChild);

        console.log('[DownloadSettingsUI] Modal created');

        // 绑定事件
        this.bindEvents();
        this.loadSettings();
    },

    /**
     * 绑定事件
     */
    bindEvents() {
        // 最大并发数
        const maxConcurrentSlider = document.getElementById('maxConcurrentSlider');
        const maxConcurrentValue = document.getElementById('maxConcurrentValue');
        if (maxConcurrentSlider) {
            maxConcurrentSlider.addEventListener('input', (e) => {
                if (maxConcurrentValue) maxConcurrentValue.textContent = e.target.value;
            });
        }

        // 超时时间
        const timeoutSlider = document.getElementById('timeoutSlider');
        const timeoutValue = document.getElementById('timeoutValue');
        if (timeoutSlider) {
            timeoutSlider.addEventListener('input', (e) => {
                if (timeoutValue) timeoutValue.textContent = (e.target.value / 10) + 's';
            });
        }

        // 重试次数
        const retryCountSlider = document.getElementById('retryCountSlider');
        const retryCountValue = document.getElementById('retryCountValue');
        if (retryCountSlider) {
            retryCountSlider.addEventListener('input', (e) => {
                if (retryCountValue) retryCountValue.textContent = e.target.value;
            });
        }
    },

    /**
     * 加载设置到UI
     */
    loadSettings() {
        if (!window.DownloadSettings) {
            console.warn('[DownloadSettingsUI] DownloadSettings not available');
            return;
        }

        const settings = window.DownloadSettings.getAll();
        console.log('[DownloadSettingsUI] Loading settings:', settings);

        // 最大并发数
        const maxConcurrentSlider = document.getElementById('maxConcurrentSlider');
        const maxConcurrentValue = document.getElementById('maxConcurrentValue');
        if (maxConcurrentSlider) {
            maxConcurrentSlider.value = settings.maxConcurrent;
            if (maxConcurrentValue) maxConcurrentValue.textContent = settings.maxConcurrent;
        }

        // 超时时间
        const timeoutSlider = document.getElementById('timeoutSlider');
        const timeoutValue = document.getElementById('timeoutValue');
        if (timeoutSlider) {
            const timeoutSeconds = settings.timeout / 1000;
            timeoutSlider.value = timeoutSeconds;
            if (timeoutValue) timeoutValue.textContent = timeoutSeconds + 's';
        }

        // 重试次数
        const retryCountSlider = document.getElementById('retryCountSlider');
        const retryCountValue = document.getElementById('retryCountValue');
        if (retryCountSlider) {
            retryCountSlider.value = settings.retryCount;
            if (retryCountValue) retryCountValue.textContent = settings.retryCount;
        }

        // 自动重命名
        const autoRenameCheckbox = document.getElementById('autoRenameCheckbox');
        if (autoRenameCheckbox) {
            autoRenameCheckbox.checked = settings.autoRename;
        }

        // 显示进度
        const showProgressCheckbox = document.getElementById('showProgressCheckbox');
        if (showProgressCheckbox) {
            showProgressCheckbox.checked = settings.showProgress;
        }
        
        // 加载下载目录
        const downloadPathInput = document.getElementById('downloadPathInput');
        if (downloadPathInput && settings.directoryHandle) {
            downloadPathInput.value = settings.directoryHandle;
            downloadPathInput.classList.remove('cursor-not-allowed');
            downloadPathInput.classList.add('text-white');
        }
        
        // 尝试从 IndexedDB 加载目录句柄
        this.loadDirectoryHandle().then(handle => {
            if (handle && downloadPathInput) {
                downloadPathInput.value = handle.name;
                downloadPathInput.classList.remove('cursor-not-allowed');
                downloadPathInput.classList.add('text-white');
            }
        });
    },

    /**
     * 保存设置
     */
    saveSettings() {
        if (!window.DownloadSettings) {
            console.error('[DownloadSettingsUI] DownloadSettings not available');
            return;
        }

        const maxConcurrent = parseInt(document.getElementById('maxConcurrentSlider')?.value || 5);
        const timeout = parseInt(document.getElementById('timeoutSlider')?.value || 30) * 1000;
        const retryCount = parseInt(document.getElementById('retryCountSlider')?.value || 3);
        const autoRename = document.getElementById('autoRenameCheckbox')?.checked || true;
        const showProgress = document.getElementById('showProgressCheckbox')?.checked || true;

        console.log('[DownloadSettingsUI] Saving settings:', {
            maxConcurrent, timeout, retryCount, autoRename, showProgress
        });

        window.DownloadSettings.setMultiple({
            maxConcurrent,
            timeout,
            retryCount,
            autoRename,
            showProgress,
        });

        // 关闭对话框
        this.hide();
        
        if (typeof showToast === 'function') {
            showToast('下载设置已保存', 'success');
        }
    },

    /**
     * 重置为默认设置
     */
    resetSettings() {
        if (confirm('确定要重置为默认设置吗？')) {
            window.DownloadSettings?.reset();
            this.loadSettings();
            if (typeof showToast === 'function') {
                showToast('已重置为默认设置', 'success');
            }
        }
    },

    /**
     * 显示设置对话框
     */
    show() {
        console.log('[DownloadSettingsUI] Showing settings modal');
        const modal = document.getElementById('downloadSettingsModal');
        if (!modal) {
            console.log('[DownloadSettingsUI] Modal not found, initializing...');
            this.init();
        }
        const m = document.getElementById('downloadSettingsModal');
        if (m) {
            m.classList.remove('hidden');
            this.loadSettings();
        } else {
            console.error('[DownloadSettingsUI] Failed to find or create modal');
        }
    },

    /**
     * 隐藏设置对话框
     */
    hide() {
        console.log('[DownloadSettingsUI] Hiding settings modal');
        const modal = document.getElementById('downloadSettingsModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },
};

// 导出为全局对象
window.DownloadSettingsUI = DownloadSettingsUI;

// 页面加载完成后初始化
function initDownloadSettingsUI() {
    console.log('[DownloadSettingsUI] Page ready, initializing UI');
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            DownloadSettingsUI.init();
        });
    } else {
        DownloadSettingsUI.init();
    }
}

// 延迟初始化以确保DOM已加载
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDownloadSettingsUI);
} else {
    setTimeout(initDownloadSettingsUI, 100);
}
