// Cloudflare Workers AI API 代理
// 支持 OpenAI, Anthropic, Google Gemini

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 健康检查
    if (path === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 根路径信息
    if (path === '/') {
      return new Response(JSON.stringify({
        name: 'AI API Proxy (Cloudflare Workers)',
        version: '1.0.0',
        endpoints: {
          openai: '/v1/*',
          anthropic: '/anthropic/*',
          gemini: '/gemini/*',
          health: '/health'
        },
        usage: {
          openai: 'Use /v1/chat/completions with your OpenAI API key in Authorization header',
          anthropic: 'Use /anthropic/v1/messages with your API key in x-api-key header',
          gemini: 'Use /gemini/v1beta/models/* with your API key as query parameter'
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 代理目标 URL
    let targetUrl;
    let newPath = path;

    if (path.startsWith('/v1')) {
      // OpenAI API
      targetUrl = 'https://api.openai.com';
    } else if (path.startsWith('/anthropic')) {
      // Anthropic API
      targetUrl = 'https://api.anthropic.com';
      newPath = path.replace('/anthropic', '');
    } else if (path.startsWith('/gemini')) {
      // Google Gemini API
      targetUrl = 'https://generativelanguage.googleapis.com';
      newPath = path.replace('/gemini', '');
    } else {
      return new Response('Not Found', { status: 404 });
    }

    // 构建代理请求
    const proxyUrl = `${targetUrl}${newPath}${url.search}`;
    
    // 复制请求头
    const headers = new Headers(request.headers);
    headers.set('Host', new URL(targetUrl).host);
    headers.delete('cf-connecting-ip');
    headers.delete('cf-ray');
    headers.delete('cf-visitor');

    // 创建代理请求
    const proxyRequest = new Request(proxyUrl, {
      method: request.method,
      headers: headers,
      body: request.body
    });

    try {
      // 发送请求
      const response = await fetch(proxyRequest);
      
      // 复制响应
      const proxyResponse = new Response(response.body, response);
      
      // 添加 CORS 头
      proxyResponse.headers.set('Access-Control-Allow-Origin', '*');
      proxyResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      proxyResponse.headers.set('Access-Control-Allow-Headers', '*');
      
      return proxyResponse;
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Proxy error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
