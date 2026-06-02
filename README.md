# 🚀 AI API 反向代理 - 快速开始

## 🎯 项目说明

这是一个 AI API 反向代理服务，支持 OpenAI、Anthropic (Claude) 和 Google Gemini API 的中转访问。

**✨ 最新更新：已添加 Cloudflare Workers 支持 - 完全免费，无需绑卡！**

## 📦 部署方案

### ⭐ 推荐：Cloudflare Workers（完全免费）

**优势：**
- ✅ 完全免费，无需信用卡
- ✅ 每天 10 万次免费请求
- ✅ 全球 CDN 加速
- ✅ 无冷启动，响应速度快
- ✅ 5 分钟完成部署

**部署指南：** 查看 [CLOUDFLARE_GUIDE.md](./CLOUDFLARE_GUIDE.md)

**快速开始：**
1. 访问 https://dash.cloudflare.com/sign-up 注册账号
2. 创建 Worker
3. 复制 `worker.js` 的内容到编辑器
4. 保存并部署
5. 立即使用！

### 其他方案

#### Docker 部署（Render/Railway/Fly.io）

**文件说明：**
- `server.js` - Node.js 反向代理服务器
- `Dockerfile` - Docker 镜像配置
- `render.yaml` - Render 部署配置
- `railway.toml` - Railway 部署配置
- `fly.toml` - Fly.io 部署配置

**注意：** 这些平台可能需要绑定信用卡验证

**部署指南：** 查看 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

#### 本地部署

```bash
# 安装依赖
npm install

# 启动服务
npm start

# 服务地址
http://localhost:3000
```

## 🔧 使用方法

部署完成后，将你的 AI API 请求地址替换为代理地址。

### OpenAI API

**原始地址：** `https://api.openai.com/v1/...`

**代理地址：** `https://YOUR_DOMAIN/v1/...`

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://YOUR_DOMAIN/v1',
  apiKey: 'your-openai-key'
});
```

### Anthropic API (Claude)

**原始地址：** `https://api.anthropic.com/v1/...`

**代理地址：** `https://YOUR_DOMAIN/anthropic/v1/...`

```javascript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  baseURL: 'https://YOUR_DOMAIN/anthropic',
  apiKey: 'your-anthropic-key'
});
```

### Google Gemini API

**原始地址：** `https://generativelanguage.googleapis.com/v1beta/...`

**代理地址：** `https://YOUR_DOMAIN/gemini/v1beta/...`

## 📊 支持的 API

| 服务商 | 代理路径 | 目标地址 |
|--------|---------|---------|
| OpenAI | `/v1/*` | `https://api.openai.com` |
| Anthropic | `/anthropic/*` | `https://api.anthropic.com` |
| Google Gemini | `/gemini/*` | `https://generativelanguage.googleapis.com` |
| 健康检查 | `/health` | 返回服务状态 |

## 🧪 测试服务

### 测试健康检查

```bash
curl https://YOUR_DOMAIN/health
```

### 测试 OpenAI 代理

```bash
curl https://YOUR_DOMAIN/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### 测试 Anthropic 代理

```bash
curl https://YOUR_DOMAIN/anthropic/v1/messages \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## 📁 项目结构

```
ai-api-proxy/
├── worker.js              # ⭐ Cloudflare Workers 代理（推荐）
├── wrangler.toml          # Cloudflare Workers 配置
├── CLOUDFLARE_GUIDE.md    # Cloudflare 部署详细指南
├── server.js              # Node.js 代理服务器
├── package.json           # Node.js 依赖配置
├── Dockerfile             # Docker 镜像配置
├── render.yaml            # Render 部署配置
├── railway.toml           # Railway 部署配置
├── fly.toml              # Fly.io 部署配置
├── deploy.sh             # 部署脚本
├── DEPLOYMENT_GUIDE.md   # Docker 部署指南
└── README.md             # 项目说明（本文件）
```

## 🆚 部署方案对比

| 特性 | Cloudflare Workers ⭐ | Render | Railway | Fly.io |
|------|---------------------|--------|---------|---------|
| 费用 | 完全免费 | 需要绑卡 | 需要绑卡 | 需要绑卡 |
| 请求限制 | 10万/天 | 无限制 | 无限制 | 无限制 |
| 冷启动 | 无 | 15分钟休眠 | 无休眠 | 自动休眠 |
| 全球加速 | ✅ | ❌ | ❌ | ✅ |
| 部署难度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 推荐指数 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

## ⚠️ 重要提示

1. **API 密钥安全**：代理服务器不存储任何 API 密钥，所有密钥由客户端传递
2. **合规使用**：遵守各 AI 服务商的使用条款
3. **速率限制**：注意各 AI 服务商的 API 调用限制
4. **成本控制**：使用 Cloudflare Workers 免费版即可满足个人使用

## 📚 详细文档

- [Cloudflare Workers 部署指南](./CLOUDFLARE_GUIDE.md) - 推荐阅读
- [Docker 部署指南](./DEPLOYMENT_GUIDE.md)
- [Express.js 文档](https://expressjs.com/)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**推荐使用 Cloudflare Workers 部署，5 分钟即可完成！** 🚀
