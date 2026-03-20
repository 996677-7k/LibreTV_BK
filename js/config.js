// 全局常量配置
const PROXY_URL = '/proxy/';    // 适用于 Cloudflare, Netlify (带重写), Vercel (带重写)
const SEARCH_HISTORY_KEY = 'videoSearchHistory';
const MAX_HISTORY_ITEMS = 5;

// 密码保护配置
const PASSWORD_CONFIG = {
    localStorageKey: 'passwordVerified',  // 存储验证状态的键名
    verificationTTL: 90 * 24 * 60 * 60 * 1000,  // 验证有效期（90天，约3个月）
    adminLocalStorageKey: 'adminPasswordVerified'  // 新增的管理员验证状态的键名
};

// 网站信息配置
const SITE_CONFIG = {
    name: 'LibreTV',
    url: 'https://libretv.is-an.org',
    description: '免费在线视频搜索与观看平台',
    logo: 'image/logo.png',
    version: '1.0.5'
};

// API站点配置 - 扩充至 44 个高质量、全面的 API 源
const API_SITES = {
    // --- 顶级大厂源 (1-10) ---
    wolong: { api: 'https://collect.wolongzyw.com/api.php/provide/vod/', name: '卧龙资源' },
    lzi: { api: 'https://cj.lziapi.com/api.php/provide/vod/', name: '量子资源' },
    kczy: { api: 'https://www.kczyapi.com/api.php/provide/vod/', name: '快车资源' },
    guangsu: { api: 'https://www.guangsuapi.com/api.php/provide/vod/', name: '光速资源' },
    sony: { api: 'https://suoniapi.com/api.php/provide/vod/', name: '索尼资源' },
    hongniu: { api: 'https://www.hongniuzyw.com/api.php/provide/vod/', name: '红牛资源' },
    jinying: { api: 'https://jyzyapi.com/provide/vod/', name: '金鹰资源' },
    feisu: { api: 'https://www.feisuzyapi.com/api.php/provide/vod/', name: '飞速资源' },
    tiankong: { api: 'https://m3u8.tiankongapi.com/api.php/provide/vod/', name: '天空资源' },
    jisu: { api: 'https://jszyapi.com/api.php/provide/vod/', name: '极速资源' },

    // --- 优质补充源 (11-20) ---
    huohu: { api: 'https://hhzyapi.com/api.php/provide/vod/', name: '火狐资源' },
    baofeng: { api: 'https://bfzyapi.com/api.php/provide/vod/', name: '暴风资源' },
    sakura: { api: 'https://m3u8.sakurazy.tv/api.php/provide/vod/', name: '樱花资源' },
    wujin: { api: 'https://api.wujinapi.me/api.php/provide/vod/', name: '无尽资源' },
    zuid: { api: 'https://api.zuidapi.com/api.php/provide/vod/', name: '最大资源' },
    ikun: { api: 'https://ikunzyapi.com/api.php/provide/vod/', name: 'iKun资源' },
    ffzy: { api: 'http://ffzy5.tv/api.php/provide/vod/', name: '非凡影视' },
    heimuer: { api: 'https://json.heimuer.xyz/api.php/provide/vod/', name: '黑木耳' },
    dbzy: { api: 'https://dbzy.tv/api.php/provide/vod/', name: '豆瓣资源' },
    baidu: { api: 'https://api.apibdzy.com/api.php/provide/vod/', name: '百度云资源' },

    // --- 稳定老牌源 (21-30) ---
    dyttzy: { api: 'http://caiji.dyttzyapi.com/api.php/provide/vod/', name: '电影天堂' },
    ruyi: { api: 'https://cj.rycjapi.com/api.php/provide/vod/', name: '如意资源' },
    tyyszy: { api: 'https://tyyszy.com/api.php/provide/vod/', name: '天涯资源' },
    xiaomaomi: { api: 'https://zy.xmm.hk/api.php/provide/vod/', name: '小猫咪资源' },
    zy360: { api: 'https://360zy.com/api.php/provide/vod/', name: '360资源' },
    iqiyi: { api: 'https://www.iqiyizyapi.com/api.php/provide/vod/', name: '爱奇艺资源' },
    hwba: { api: 'https://cjhwba.com/api.php/provide/vod/', name: '华为吧资源' },
    mozhua: { api: 'https://mozhuazy.com/api.php/provide/vod/', name: '魔爪资源' },
    mdzy: { api: 'https://www.mdzyapi.com/api.php/provide/vod/', name: '魔都资源' },
    maotai: { api: 'https://api.maotaizy.com/api.php/provide/vod/', name: '茅台资源' },

    // --- 高速及新增源 (31-44) ---
    xinlang: { api: 'https://api.xinlangapi.com/api.php/provide/vod/', name: '新浪资源' },
    baozha: { api: 'https://api.baozha.me/api.php/provide/vod/', name: '爆炸资源' },
    wwzy: { api: 'https://wwzy.tv/api.php/provide/vod/', name: '旺旺短剧' },
    lehuo: { api: 'https://api.lehuozy.com/api.php/provide/vod/', name: '乐活资源' },
    migu: { api: 'https://api.miguapi.com/api.php/provide/vod/', name: '咪咕资源' },
    youku: { api: 'https://api.youkuapi.com/api.php/provide/vod/', name: '优酷资源' },
    tengxun: { api: 'https://api.tengxunapi.com/api.php/provide/vod/', name: '腾讯资源' },
    m3u8zy: { api: 'https://api.m3u8zy.com/api.php/provide/vod/', name: 'M3U8资源' },
    kuaiyun: { api: 'https://api.kuaiyunzy.com/api.php/provide/vod/', name: '快云资源' },
    haojiu: { api: 'https://api.haojiuzuida.com/api.php/provide/vod/', name: '好久资源' },
    henan: { api: 'https://api.henanzy.com/api.php/provide/vod/', name: '河南资源' },
    shandong: { api: 'https://api.shandongzy.com/api.php/provide/vod/', name: '山东资源' },
    kuyun: { api: 'https://api.kuyunzy.com/api.php/provide/vod/', name: '酷云资源' },
    qihu: { api: 'https://api.qihuzy.com/api.php/provide/vod/', name: '奇虎资源' }
};

// 定义合并方法
function extendAPISites(newSites) {
    Object.assign(API_SITES, newSites);
}

// 暴露到全局
window.API_SITES = API_SITES;
window.extendAPISites = extendAPISites;

// 添加聚合搜索的配置选项
const AGGREGATED_SEARCH_CONFIG = {
    enabled: true,             // 是否启用聚合搜索
    timeout: 8000,            // 单个源超时时间（毫秒）
    maxResults: 10000,          // 最大结果数量
    parallelRequests: true,   // 是否并行请求所有源
    showSourceBadges: true    // 是否显示来源徽章
};

// 抽象API请求配置
const API_CONFIG = {
    search: {
        path: '?ac=videolist&wd=',
        pagePath: '?ac=videolist&wd={query}&pg={page}',
        maxPages: 50, // 最大获取页数
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    },
    detail: {
        path: '?ac=videolist&ids=',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    }
};

// 优化后的正则表达式模式
const M3U8_PATTERN = /\$https?:\/\/[^"'\s]+?\.m3u8/g;

// 添加自定义播放器URL
const CUSTOM_PLAYER_URL = 'player.html'; 

// 增加视频播放相关配置
const PLAYER_CONFIG = {
    autoplay: true,
    allowFullscreen: true,
    width: '100%',
    height: '600',
    timeout: 15000,  // 播放器加载超时时间
    filterAds: true,  // 是否启用广告过滤
    autoPlayNext: true,  // 默认启用自动连播功能
    adFilteringEnabled: true, // 默认开启分片广告过滤
    adFilteringStorage: 'adFilteringEnabled' // 存储广告过滤设置的键名
};

// 增加错误信息本地化
const ERROR_MESSAGES = {
    NETWORK_ERROR: '网络连接错误，请检查网络设置',
    TIMEOUT_ERROR: '请求超时，服务器响应时间过长',
    API_ERROR: 'API接口返回错误，请尝试更换数据源',
    PLAYER_ERROR: '播放器加载失败，请尝试其他视频源',
    UNKNOWN_ERROR: '发生未知错误，请刷新页面重试'
};

// 添加进一步安全设置
const SECURITY_CONFIG = {
    enableXSSProtection: true,  // 是否启用XSS保护
    sanitizeUrls: true,         // 是否清理URL
    maxQueryLength: 100,        // 最大搜索长度
};

// 添加多个自定义API源的配置
const CUSTOM_API_CONFIG = {
    separator: ',',           // 分隔符
    maxSources: 5,            // 最大允许的自定义源数量
    testTimeout: 5000,        // 测试超时时间(毫秒)
    namePrefix: 'Custom-',    // 自定义源名称前缀
    validateUrl: true,        // 验证URL格式
    cacheResults: true,       // 缓存测试结果
    cacheExpiry: 5184000000,  // 缓存过期时间(2个月)
    adultPropName: 'isAdult' // 用于标记成人内容的属性名
};

// 隐藏内置黄色采集站API的变量
const HIDE_BUILTIN_ADULT_APIS = false;
