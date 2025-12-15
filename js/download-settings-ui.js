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
