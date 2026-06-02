const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 启用CORS
app.use(cors());

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
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AI API Proxy server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
