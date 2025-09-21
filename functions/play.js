// functions/play.js

export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        const songUrl = url.searchParams.get('url');

        if (!songUrl) {
            return new Response('Missing song URL', { status: 400 });
        }

        // 1. 打开默认的缓存对象。
        // Cache API 会自动处理缓存的地理位置和淘汰策略。
        const cache = caches.default;

        // 2. 创建一个基于原始请求的 Request 对象作为缓存的键。
        // 这能确保 Range 请求也被正确地缓存和区分。
        const cacheKey = new Request(songUrl, context.request);

        // 3. 尝试从缓存中匹配请求。
        let cachedResponse = await cache.match(cacheKey);

        if (cachedResponse) {
            // 4. 缓存命中！
            console.log(`Cache HIT for: ${songUrl}`);
            // 直接返回缓存的响应。这是一个完整的 Response 对象，
            // 包含了上次存储时的状态码、头信息和音频数据体。
            // Cache API 足够智能，能够正确处理 Range 请求的缓存。
            return cachedResponse;
        }

        // 5. 缓存未命中。
        console.log(`Cache MISS for: ${songUrl}`);

        // --- 接下来的逻辑与之前类似，但增加了写入缓存的步骤 ---

        const headers = new Headers();
        if (context.request.headers.has('range')) {
            headers.set('range', context.request.headers.get('range'));
        }
        headers.set('Referer', 'https://music.gdstudio.xyz/');
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

        // 向真实的 CDN URL 发起请求
        const originResponse = await fetch(songUrl, { headers });

        // 检查从源站获取的响应是否成功 (状态码 200 表示完整文件, 206 表示部分内容)
        if (!originResponse.ok) {
            // 如果源站返回错误，直接将错误透传给用户，并且不进行缓存
            return originResponse;
        }

        // 6. 关键步骤：克隆响应并存入缓存。
        // Response body 只能被读取一次。我们需要一份返回给用户，一份存入缓存。
        // 我们使用 context.waitUntil 来确保缓存操作在后台完成，
        // 而不会阻塞对用户的响应。
        context.waitUntil(cache.put(cacheKey, originResponse.clone()));

        // 7. 将原始响应返回给用户。
        return originResponse;

    } catch (error) {
        console.error('Audio Proxy & Cache Error:', error);
        return new Response('Audio proxy failed', { status: 500 });
    }
}
