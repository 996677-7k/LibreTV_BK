// 确保 M3U8Downloader 在全局可用
if (typeof window.M3U8Downloader !== 'function' && window.opener && window.opener.M3U8Downloader) {
    window.M3U8Downloader = window.opener.M3U8Downloader;
}

// 确保 DownloadManager 在全局可用
if (typeof window.DownloadManager !== 'function' && window.opener && window.opener.DownloadManager) {
    window.DownloadManager = window.opener.DownloadManager;
}

// 确保 DownloadManager 实例被创建
if (typeof window.DownloadManager === 'function' && !window.downloadManager) {
    window.downloadManager = new window.DownloadManager();
    console.log('[Player] DownloadManager initialized.');
}

// ... (rest of player.js content)
