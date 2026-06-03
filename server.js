const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const kiroProxy = require('./kiro-proxy');

const app = express();
const PORT = process.env.PORT || 3000;

// 启用CORS
app.use(cors());

// Kiro 反向代理与管理路由 (仅对它们应用 express.json() 中间件以避免干扰其他代理的 raw stream 转发)
app.use('/kiro', express.json(), kiroProxy.router);
app.use('/admin', express.json(), kiroProxy.adminRouter);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OpenAI API 代理
app.use('/v1', createProxyMiddleware({
  target: 'https://api.openai.com',
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    // 转发Authorization头
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: err.message 
    });
  }
}));

// Anthropic API 代理
app.use('/anthropic', createProxyMiddleware({
  target: 'https://api.anthropic.com',
  changeOrigin: true,
  pathRewrite: {
    '^/anthropic': '' // 移除/anthropic前缀
  },
  onProxyReq: (proxyReq, req, res) => {
    if (req.headers['x-api-key']) {
      proxyReq.setHeader('x-api-key', req.headers['x-api-key']);
    }
    if (req.headers['anthropic-version']) {
      proxyReq.setHeader('anthropic-version', req.headers['anthropic-version']);
    }
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: err.message 
    });
  }
}));

// Google AI (Gemini) 代理
app.use('/gemini', createProxyMiddleware({
  target: 'https://generativelanguage.googleapis.com',
  changeOrigin: true,
  pathRewrite: {
    '^/gemini': ''
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: err.message 
    });
  }
}));

// 根路径信息
app.get('/', (req, res) => {
  res.json({
    name: 'AI API Proxy',
    version: '2.0.0-vps-kiro',
    endpoints: {
      openai: '/v1/*',
      anthropic: '/anthropic/*',
      gemini: '/gemini/*',
      kiro: '/kiro/v1/*',
      admin: '/admin/*',
      health: '/health'
    },
    usage: {
      openai: 'Use /v1/chat/completions with your OpenAI API key in Authorization header',
      anthropic: 'Use /anthropic/v1/messages with your API key in x-api-key header',
      gemini: 'Use /gemini/v1beta/models/* with your API key as query parameter',
      kiro: 'Use /kiro/v1/chat/completions with compatible models (gpt-4o, claude-3-5-sonnet)',
      admin: 'Use admin endpoints with your ADMIN_KEY in Authorization Bearer'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AI API Proxy server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
