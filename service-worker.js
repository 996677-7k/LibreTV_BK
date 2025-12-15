// service-worker.js

// Service Worker 版本号
const CACHE_VERSION = 'v1';
const CACHE_NAME = `libretv-cache-${CACHE_VERSION}`;

// 监听安装事件
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    self.skipWaiting(); // 立即激活新的 Service Worker
});

// 监听激活事件
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 监听消息事件，接收来自主线程的下载任务
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'START_DOWNLOAD') {
        const { m3u8Url, filename } = event.data.payload;
        console.log(`[Service Worker] Received download task: ${filename}`);
        
        // 启动下载任务
        event.waitUntil(handleDownload(m3u8Url, filename));
    }
});

/**
 * 后台处理 M3U8 下载和合并
 * @param {string} m3u8Url - M3U8 播放列表 URL
 * @param {string} filename - 最终文件名
 */
async function handleDownload(m3u8Url, filename) {
    try {
        // 1. 获取 M3U8 播放列表
        const m3u8Response = await fetch(m3u8Url);
        if (!m3u8Response.ok) {
            throw new Error(`Failed to fetch M3U8: HTTP ${m3u8Response.status}`);
        }
        const m3u8Content = await m3u8Response.text();

        // 2. 解析 M3U8 获取片段列表
        const segments = parseM3U8(m3u8Content, m3u8Url);
        if (segments.length === 0) {
            throw new Error('No segments found in M3U8.');
        }
        
        // 3. 下载所有片段
        const segmentBlobs = await downloadAllSegments(segments, filename);

        // 4. 合并片段
        const mergedBlob = await mergeSegments(segmentBlobs);

        // 5. 触发下载
        triggerDownload(mergedBlob, filename);

        // 6. 通知主线程下载完成
        sendMessageToClient({
            type: 'DOWNLOAD_COMPLETE',
            payload: { filename, success: true }
        });

    } catch (error) {
        console.error(`[Service Worker] Download failed for ${filename}:`, error);
        // 通知主线程下载失败
        sendMessageToClient({
            type: 'DOWNLOAD_FAILED',
            payload: { filename, success: false, error: error.message }
        });
    }
}

/**
 * 解析 M3U8 播放列表
 * @param {string} m3u8Content 
 * @param {string} baseUrl 
 * @returns {Array<string>}
 */
function parseM3U8(m3u8Content, baseUrl) {
    const lines = m3u8Content.split('\n');
    const segments = [];
    for (const line of lines) {
        if (line.startsWith('#')) {
            continue;
        }
        if (line.trim().length > 0) {
            // 相对路径转绝对路径
            const segmentUrl = new URL(line.trim(), baseUrl).href;
            segments.push(segmentUrl);
        }
    }
    return segments;
}

/**
 * 下载所有片段
 * @param {Array<string>} segments 
 * @param {string} filename 
 * @returns {Array<Blob>}
 */
async function downloadAllSegments(segments, filename) {
    const segmentBlobs = [];
    const totalSegments = segments.length;

    for (let i = 0; i < totalSegments; i++) {
        const segmentUrl = segments[i];
        try {
            const response = await fetch(segmentUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const blob = await response.blob();
            segmentBlobs.push(blob);

            // 发送进度到主线程
            sendMessageToClient({
                type: 'DOWNLOAD_PROGRESS',
                payload: {
                    filename,
                    progress: Math.round(((i + 1) / totalSegments) * 100),
                    loaded: i + 1,
                    total: totalSegments
                }
            });

        } catch (error) {
            console.error(`[Service Worker] Failed to download segment ${i + 1}/${totalSegments}:`, error);
            // 简单的重试机制
            // 实际应用中需要更复杂的重试和错误处理
            throw new Error(`Segment download failed: ${error.message}`);
        }
    }
    return segmentBlobs;
}

/**
 * 合并片段
 * @param {Array<Blob>} segmentBlobs 
 * @returns {Blob}
 */
async function mergeSegments(segmentBlobs) {
    const totalLength = segmentBlobs.reduce((acc, blob) => acc + blob.size, 0);
    const mergedArray = new Uint8Array(totalLength);
    let offset = 0;

    for (const blob of segmentBlobs) {
        const buffer = await blob.arrayBuffer();
        mergedArray.set(new Uint8Array(buffer), offset);
        offset += buffer.byteLength;
    }

    // 使用 video/mp4 MIME type
    return new Blob([mergedArray], { type: 'video/mp4' });
}

/**
 * 触发下载（Service Worker 无法直接触发下载，需要通知主线程）
 * @param {Blob} blob 
 * @param {string} filename 
 */
function triggerDownload(blob, filename) {
    // Service Worker 无法直接触发下载，将 Blob 转换为 URL 并发送给主线程
    // 另一种方法是使用 Background Fetch API，但它更复杂
    // 这里我们直接将 Blob 发送给主线程，让主线程处理下载
    sendMessageToClient({
        type: 'TRIGGER_DOWNLOAD_BLOB',
        payload: {
            blob: blob,
            filename: filename
        }
    });
}

/**
 * 发送消息给主线程
 * @param {Object} message 
 */
function sendMessageToClient(message) {
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(clients => {
        clients.forEach(client => {
            client.postMessage(message);
        });
    });
}
