/**
 * 批量下载功能
 * 支持选择多个集数进行批量下载
 */

let batchDownloadMode = false;
let selectedEpisodes = new Set();

/**
 * 切换批量下载模式
 */
function toggleBatchDownloadMode() {
    batchDownloadMode = !batchDownloadMode;
    selectedEpisodes.clear();
    
    const button = document.getElementById('batchDownloadButton');
    
    if (batchDownloadMode) {
        // 进入批量下载模式
        button.classList.add('!bg-blue-600', '!border-blue-500');
        button.title = '退出批量下载';
        
        // 显示批量操作面板
        showBatchDownloadPanel();
        
        // 重新渲染集数列表，添加复选框
        renderEpisodesWithCheckbox();
        
        if (typeof showToast === 'function') {
            showToast('批量下载模式：点击集数选择，然后点击"开始下载"', 'info');
        }
    } else {
        // 退出批量下载模式
        button.classList.remove('!bg-blue-600', '!border-blue-500');
        button.title = '批量下载';
        
        // 隐藏批量操作面板
        hideBatchDownloadPanel();
        
        // 恢复正常集数列表
        if (typeof renderEpisodes === 'function') {
            renderEpisodes();
        }
    }
}

/**
 * 显示批量操作面板
 */
function showBatchDownloadPanel() {
    // 检查是否已存在面板
    let panel = document.getElementById('batchDownloadPanel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'batchDownloadPanel';
        panel.className = 'player-container mb-2 p-4 bg-[#1a1a1a] border border-blue-500 rounded-lg';
        panel.innerHTML = `
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center space-x-3">
                    <span class="text-sm text-gray-300">已选择: <span id="selectedCount" class="text-blue-400 font-bold">0</span> 集</span>
                    <button onclick="selectAllEpisodes()" class="px-3 py-1 bg-[#222] hover:bg-[#333] border border-[#333] rounded text-sm transition-colors">全选</button>
                    <button onclick="deselectAllEpisodes()" class="px-3 py-1 bg-[#222] hover:bg-[#333] border border-[#333] rounded text-sm transition-colors">取消全选</button>
                    <button onclick="selectRangeEpisodes()" class="px-3 py-1 bg-[#222] hover:bg-[#333] border border-[#333] rounded text-sm transition-colors">选择范围</button>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="startBatchDownload()" class="px-4 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" id="startBatchDownloadBtn">
                        开始下载
                    </button>
                    <button onclick="toggleBatchDownloadMode()" class="px-4 py-2 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg transition-colors">
                        取消
                    </button>
                </div>
            </div>
        `;
        
        // 插入到集数网格之前
        const episodesGrid = document.querySelector('.episode-grid');
        if (episodesGrid && episodesGrid.parentNode) {
            episodesGrid.parentNode.insertBefore(panel, episodesGrid);
        }
    } else {
        panel.classList.remove('hidden');
    }
}

/**
 * 隐藏批量操作面板
 */
function hideBatchDownloadPanel() {
    const panel = document.getElementById('batchDownloadPanel');
    if (panel) {
        panel.classList.add('hidden');
    }
}

/**
 * 渲染带复选框的集数列表
 */
function renderEpisodesWithCheckbox() {
    const episodesList = document.getElementById('episodesList');
    if (!episodesList) return;

    if (!currentEpisodes || currentEpisodes.length === 0) {
        episodesList.innerHTML = '<div class="col-span-full text-center text-gray-400 py-8">没有可用的集数</div>';
        return;
    }

    const episodes = episodesReversed ? [...currentEpisodes].reverse() : currentEpisodes;
    let html = '';

    episodes.forEach((episode, index) => {
        const realIndex = episodesReversed ? currentEpisodes.length - 1 - index : index;
        const isSelected = selectedEpisodes.has(realIndex);
        const isActive = realIndex === currentEpisodeIndex;

        html += `
            <div class="relative">
                <button id="episode-${realIndex}" 
                        onclick="toggleEpisodeSelection(${realIndex})" 
                        class="w-full px-4 py-2 ${isSelected ? '!bg-blue-600 !border-blue-500' : (isActive ? 'episode-active' : '!bg-[#222] hover:!bg-[#333]')} !border ${isActive && !isSelected ? '!border-blue-500' : '!border-[#333]'} rounded-lg transition-colors text-center episode-btn relative">
                    ${isSelected ? '<span class="absolute top-1 right-1 text-xs">✓</span>' : ''}
                    ${realIndex + 1}
                </button>
            </div>
        `;
    });

    episodesList.innerHTML = html;
}

/**
 * 切换集数选择状态
 */
function toggleEpisodeSelection(index) {
    if (selectedEpisodes.has(index)) {
        selectedEpisodes.delete(index);
    } else {
        selectedEpisodes.add(index);
    }
    
    updateSelectedCount();
    renderEpisodesWithCheckbox();
}

/**
 * 全选集数
 */
function selectAllEpisodes() {
    selectedEpisodes.clear();
    for (let i = 0; i < currentEpisodes.length; i++) {
        selectedEpisodes.add(i);
    }
    updateSelectedCount();
    renderEpisodesWithCheckbox();
}

/**
 * 取消全选
 */
function deselectAllEpisodes() {
    selectedEpisodes.clear();
    updateSelectedCount();
    renderEpisodesWithCheckbox();
}

/**
 * 选择范围
 */
function selectRangeEpisodes() {
    const start = prompt('请输入起始集数（从1开始）:', '1');
    if (!start) return;
    
    const end = prompt('请输入结束集数:', currentEpisodes.length.toString());
    if (!end) return;
    
    const startIndex = parseInt(start) - 1;
    const endIndex = parseInt(end) - 1;
    
    if (isNaN(startIndex) || isNaN(endIndex) || startIndex < 0 || endIndex >= currentEpisodes.length || startIndex > endIndex) {
        if (typeof showToast === 'function') {
            showToast('无效的范围', 'error');
        }
        return;
    }
    
    selectedEpisodes.clear();
    for (let i = startIndex; i <= endIndex; i++) {
        selectedEpisodes.add(i);
    }
    
    updateSelectedCount();
    renderEpisodesWithCheckbox();
    
    if (typeof showToast === 'function') {
        showToast(`已选择第 ${start} 到 ${end} 集`, 'success');
    }
}

/**
 * 更新已选择数量显示
 */
function updateSelectedCount() {
    const countElement = document.getElementById('selectedCount');
    if (countElement) {
        countElement.textContent = selectedEpisodes.size;
    }
    
    // 更新开始下载按钮状态
    const startBtn = document.getElementById('startBatchDownloadBtn');
    if (startBtn) {
        if (selectedEpisodes.size === 0) {
            startBtn.disabled = true;
        } else {
            startBtn.disabled = false;
        }
    }
}

/**
 * 开始批量下载
 */
function startBatchDownload() {
    if (selectedEpisodes.size === 0) {
        if (typeof showToast === 'function') {
            showToast('请先选择要下载的集数', 'warning');
        }
        return;
    }
    
    const selectedArray = Array.from(selectedEpisodes).sort((a, b) => a - b);
    const tasks = [];
    let tasksCount = 0;
    
    selectedArray.forEach(index => {
        const episode = currentEpisodes[index];
        
        // 构造文件名
        let filename = currentVideoTitle;
        let episodeName = episode.name || `第${index + 1}集`;
        filename += ` - ${episodeName}`;
        filename = filename.replace(/[\\/:*?"<>|]/g, '_');
        filename += '.mp4';

        // 检查 URL 是否存在
        const episodeUrl = episode.url || episode.link; // 兼容 link 属性
        
        if (episodeUrl) {
            tasks.push({
                title: currentVideoTitle,
                url: episodeUrl,
                filename: filename
            });
            tasksCount++;
        }
    });
    
    if (tasks.length === 0) {
        if (typeof showToast === 'function') {
            showToast('没有有效的下载任务', 'warning');
        }
        return;
    }

    // 将任务数据编码为 URL 参数
    const taskParam = encodeURIComponent(JSON.stringify(tasks));
    
    // 打开下载工作页面
    window.open(`/download-worker.html?tasks=${taskParam}`, 'LibreTVDownloadWorker', 'width=400,height=600,left=0,top=0');

    // 退出批量下载模式
    toggleBatchDownloadMode();
    
    if (typeof showToast === 'function') {
        showToast(`已将 ${tasksCount} 个任务发送至后台窗口`, 'success');
    }
}
