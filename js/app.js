// 全局变量
let selectedAPIs = JSON.parse(localStorage.getItem('selectedAPIs') || '["wolong", "lzi", "kczy", "guangsu", "sony", "hongniu", "jinying", "feisu", "tiankong", "jisu", "huohu", "baofeng", "sakura", "wujin", "zuid", "ikun", "ffzy", "heimuer", "dbzy", "baidu", "dyttzy", "ruyi", "tyyszy", "xiaomaomi", "zy360", "iqiyi", "hwba", "mozhua", "mdzy", "maotai", "xinlang", "baozha", "wwzy", "lehuo", "modu", "migu", "youku", "tengxun", "m3u8zy", "kuaiyun", "haojiu", "henan", "shandong"]'); // 默认选中全能且高速的资源源
let customAPIs = JSON.parse(localStorage.getItem('customAPIs') || '[]'); // 存储自定义API列表

// 添加当前播放的集数索引
let currentEpisodeIndex = 0;

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function () {
    // 渲染API列表
    renderAPIList();

    // 初始化显示选中的API数量
    updateSelectedApiCount();

    // 渲染搜索历史
    renderSearchHistory();

    // --- 强制 API 同步逻辑：确保 43 个 API 全部加载 ---
    var latestAPIs = ["wolong", "lzi", "kczy", "guangsu", "sony", "hongniu", "jinying", "feisu", "tiankong", "jisu", "huohu", "baofeng", "sakura", "wujin", "zuid", "ikun", "ffzy", "heimuer", "dbzy", "baidu", "dyttzy", "ruyi", "tyyszy", "xiaomaomi", "zy360", "iqiyi", "hwba", "mozhua", "mdzy", "maotai", "xinlang", "baozha", "wwzy", "lehuo", "modu", "migu", "youku", "tengxun", "m3u8zy", "kuaiyun", "haojiu", "henan", "shandong"];
    
    if (!localStorage.getItem('hasInitializedDefaults_v5') || selectedAPIs.length < latestAPIs.length) {
        selectedAPIs = latestAPIs;
        localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));
        localStorage.setItem('hasInitializedDefaults_v5', 'true');
        localStorage.setItem('yellowFilterEnabled', 'true');
        localStorage.setItem(PLAYER_CONFIG.adFilteringStorage, 'true');
        console.log('API 列表已强制同步至最新 43 个源');
        // 重新渲染列表以更新UI
        renderAPIList();
        updateSelectedApiCount();
    }

    // 设置黄色内容过滤器开关初始状态
    const yellowFilterToggle = document.getElementById('yellowFilterToggle');
    if (yellowFilterToggle) {
        yellowFilterToggle.checked = localStorage.getItem('yellowFilterEnabled') === 'true';
        yellowFilterToggle.addEventListener('change', function (e) {
            localStorage.setItem('yellowFilterEnabled', e.target.checked);
        });
    }

    // 设置广告过滤开关初始状态
    const adFilterToggle = document.getElementById('adFilterToggle');
    if (adFilterToggle) {
        adFilterToggle.checked = localStorage.getItem(PLAYER_CONFIG.adFilteringStorage) === 'true';
        adFilterToggle.addEventListener('change', function (e) {
            localStorage.setItem(PLAYER_CONFIG.adFilteringStorage, e.target.checked);
        });
    }

    // 绑定搜索按钮点击事件
    document.getElementById('searchBtn').addEventListener('click', function () {
        const query = document.getElementById('searchInput').value.trim();
        if (query) {
            searchVideos(query);
        }
    });

    // 绑定搜索框回车事件
    document.getElementById('searchInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            const query = this.value.trim();
            if (query) {
                searchVideos(query);
            }
        }
    });

    // 绑定首页按钮点击事件
    document.getElementById('homeBtn').addEventListener('click', function () {
        showHomePage();
    });

    // 初始显示首页内容
    showHomePage();
});

// 渲染API列表
function renderAPIList() {
    const apiListContainer = document.getElementById('apiList');
    if (!apiListContainer) return;

    apiListContainer.innerHTML = '';
    
    // 合并内置和自定义API
    const allAPIs = { ...API_SITES };
    
    Object.keys(allAPIs).forEach(key => {
        const api = allAPIs[key];
        // 隐藏空内容测试源
        if (key === 'testSource') return;
        
        const apiItem = document.createElement('div');
        apiItem.className = 'api-item';
        
        const isChecked = selectedAPIs.includes(key);
        
        apiItem.innerHTML = `
            <label class="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" value="${key}" ${isChecked ? 'checked' : ''} class="api-checkbox rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500">
                <span class="text-sm text-gray-300">${api.name}</span>
            </label>
        `;
        
        apiListContainer.appendChild(apiItem);
    });

    // 绑定复选框点击事件
    document.querySelectorAll('.api-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const val = this.value;
            if (this.checked) {
                if (!selectedAPIs.includes(val)) {
                    selectedAPIs.push(val);
                }
            } else {
                selectedAPIs = selectedAPIs.filter(item => item !== val);
            }
            localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));
            updateSelectedApiCount();
        });
    });
}

// 更新选中的API数量显示
function updateSelectedApiCount() {
    const countElement = document.getElementById('selectedApiCount');
    if (countElement) {
        countElement.textContent = selectedAPIs.length;
    }
}

// 渲染搜索历史
function renderSearchHistory() {
    const historyContainer = document.getElementById('searchHistory');
    if (!historyContainer) return;

    const history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    historyContainer.innerHTML = '';

    if (history.length === 0) {
        historyContainer.innerHTML = '<span class="text-gray-500 text-sm">暂无搜索历史</span>';
        return;
    }

    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-tag px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-full text-xs text-gray-300 cursor-pointer flex items-center space-x-1';
        historyItem.innerHTML = `
            <span class="history-text">${item}</span>
            <span class="remove-history hover:text-red-400" data-val="${item}">×</span>
        `;
        
        historyItem.querySelector('.history-text').addEventListener('click', () => {
            document.getElementById('searchInput').value = item;
            searchVideos(item);
        });

        historyItem.querySelector('.remove-history').addEventListener('click', (e) => {
            e.stopPropagation();
            removeSearchHistory(item);
        });

        historyContainer.appendChild(historyItem);
    });
}

// 添加搜索历史
function addSearchHistory(query) {
    let history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    history = history.filter(item => item !== query);
    history.unshift(query);
    if (history.length > MAX_HISTORY_ITEMS) {
        history.pop();
    }
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    renderSearchHistory();
}

// 移除单条搜索历史
function removeSearchHistory(query) {
    let history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    history = history.filter(item => item !== query);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    renderSearchHistory();
}

// 清除所有搜索历史
function clearSearchHistory() {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    renderSearchHistory();
}

// 搜索视频
async function searchVideos(query) {
    if (!query) return;

    // --- 强制隐藏豆瓣区域 ---
    const doubanSection = document.getElementById('doubanSection');
    if (doubanSection) {
        doubanSection.style.display = 'none';
    }

    addSearchHistory(query);
    
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    resultsContainer.innerHTML = '';
    loadingOverlay.classList.remove('hidden');

    const searchPromises = selectedAPIs.map(apiKey => {
        const apiConfig = API_SITES[apiKey];
        if (!apiConfig) return Promise.resolve([]);
        return fetchVideos(apiConfig.api, query, apiKey);
    });

    try {
        const results = await Promise.all(searchPromises);
        // 合并并去重结果
        let allResults = results.flat();
        
        // --- 深度优化：绝对精准关键词过滤 ---
        // 只保留标题中包含搜索词的结果，剔除API自带的无关推荐
        const lowerQuery = query.toLowerCase();
        allResults = allResults.filter(item => {
            return item.name.toLowerCase().indexOf(lowerQuery) !== -1;
        });

        // 简单的去重逻辑（按名称）
        const uniqueResults = [];
        const names = new Set();
        
        // --- 优化排序逻辑：完全匹配和开头匹配优先 ---
        allResults.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            
            // 1. 完全匹配最优先
            if (aName === lowerQuery && bName !== lowerQuery) return -1;
            if (bName === lowerQuery && aName !== lowerQuery) return 1;
            
            // 2. 以搜索词开头优先
            const aStarts = aName.startsWith(lowerQuery);
            const bStarts = bName.startsWith(lowerQuery);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            
            return 0;
        });

        allResults.forEach(item => {
            const key = item.name + item.type;
            if (!names.has(key)) {
                names.add(key);
                uniqueResults.push(item);
            }
        });

        renderResults(uniqueResults);
    } catch (error) {
        console.error('搜索出错:', error);
        resultsContainer.innerHTML = `<div class="col-span-full text-center py-10 text-red-400">${ERROR_MESSAGES.UNKNOWN_ERROR}</div>`;
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}

// 获取视频数据
async function fetchVideos(apiUrl, query, sourceKey) {
    try {
        const url = `${PROXY_URL}${apiUrl}${API_CONFIG.search.path}${encodeURIComponent(query)}`;
        const response = await fetch(url);
        if (!response.ok) return [];
        
        const data = await response.json();
        if (!data || !data.list) return [];
        
        return data.list.map(item => ({
            id: item.vod_id,
            name: item.vod_name,
            type: item.type_name,
            pic: item.vod_pic,
            remarks: item.vod_remarks,
            year: item.vod_year,
            source: sourceKey,
            sourceName: API_SITES[sourceKey].name
        }));
    } catch (error) {
        console.error(`请求源 ${sourceKey} 出错:`, error);
        return [];
    }
}

// 渲染结果
function renderResults(results) {
    const resultsContainer = document.getElementById('resultsContainer');
    const resultCount = document.getElementById('resultCount');
    
    if (resultCount) {
        resultCount.textContent = `${results.length} 个结果`;
    }

    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">未找到相关资源</div>';
        return;
    }

    results.forEach(item => {
        const card = document.createElement('div');
        card.className = 'video-card bg-gray-800 rounded-lg overflow-hidden cursor-pointer shadow-lg hover:ring-2 hover:ring-blue-500 transition-all';
        card.innerHTML = `
            <div class="relative aspect-[3/4]">
                <img src="${item.pic}" alt="${item.name}" class="w-full h-full object-cover" onerror="this.src='image/nopic.jpg'">
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <span class="text-xs text-blue-400 font-bold">${item.remarks}</span>
                </div>
            </div>
            <div class="p-3">
                <h3 class="text-sm font-bold text-gray-100 truncate">${item.name}</h3>
                <div class="flex items-center justify-between mt-1">
                    <span class="text-[10px] text-gray-400 bg-gray-700 px-1.5 py-0.5 rounded">${item.type}</span>
                    <span class="text-[10px] text-gray-500">${item.year}</span>
                </div>
                <div class="mt-2 text-[10px] text-blue-500/80 font-medium">${item.sourceName}</div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            window.open(`player.html?id=${item.id}&source=${item.source}&title=${encodeURIComponent(item.name)}`, '_blank');
        });
        
        resultsContainer.appendChild(card);
    });
}

// 显示首页
function showHomePage() {
    document.getElementById('searchInput').value = '';
    document.getElementById('resultsContainer').innerHTML = '';
    const resultCount = document.getElementById('resultCount');
    if (resultCount) resultCount.textContent = '';
    
    // --- 首页恢复显示豆瓣区域 ---
    const doubanSection = document.getElementById('doubanSection');
    if (doubanSection) {
        doubanSection.style.display = 'block';
    }
}
