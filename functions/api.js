// functions/api.js

const REAL_API_BASE = 'https://music-api.gdstudio.xyz/api.php';

export async function onRequest(context) {
    try {
        // 1. 获取前端请求的 URL
        const url = new URL(context.request.url);

        // 2. 构建指向真实 API 的 URL，保留所有查询参数
        // 例如，前端请求 /api?types=search&name=...
        // 这里会构建成 https://.../api.php?types=search&name=...
        const targetUrl = REAL_API_BASE + url.search;

        // 3. 创建一个新的请求，发往真实 API
        // 关键：我们必须传递一个正确的 Referer 头，否则某些 API 可能会拒绝请求
        const request = new Request(targetUrl, {
            headers: {
                ...context.request.headers, // 可以选择性地传递原始请求头
                'Referer': 'https://music.gdstudio.xyz/', // 伪造一个 Referer
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
            },
            method: context.request.method,
            body: context.request.body,
            redirect: 'follow'
        });

        // 4. 发起请求并获取响应
        const response = await fetch(request);

        // 5. 将真实 API 的响应直接返回给前端
        // 我们创建一个新的 Response 对象，以确保可以修改头信息
        const newResponse = new Response(response.body, response);

        // 6. 设置 CORS 头，允许您的前端访问
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');

        return newResponse;

    } catch (error) {
        console.error('API Proxy Error:', error);
        return new Response(JSON.stringify({ error: 'Proxy failed', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
