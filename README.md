# AI API 反向代理服务

一个轻量级的 AI API 反向代理服务，支持 OpenAI、Anthropic (Claude) 和 Google Gemini API 的中转访问。

## ✨ 特性

- 🚀 支持多个 AI 服务商 API 代理
- 🔒 CORS 支持，便于前端直接调用
- 💰 可部署到免费云平台
- 🐳 Docker 容器化部署
- 📊 健康检查端点
- ⚡ 轻量高效

## 🎯 支持的 API

| 服务商 | 代理路径 | 目标地址 |
|--------|---------|---------|
| OpenAI | `/v1/*` | `https://api.openai.com` |
| Anthropic | `/anthropic/*` | `https://api.anthropic.com` |
| Google Gemini | `/gemini/*` | `https://generativelanguage.googleapis.com` |

## 📦 部署方案

### 方案对比

| 平台 | 免费额度 | 优点 | 缺点 |
|------|---------|------|------|
| **Render** ⭐推荐 | Free 实例永久免费 | 简单易用，自动部署 | 15分钟无请求会休眠 |
| **Railway** | $5 一次性试用 | 部署快速，性能好 | 免费额度用完需付费 |
| **Fly.io** | 3个免费实例 | 全球节点，自动扩展 | 配置稍复杂 |

### 1️⃣ Render 部署（推荐）

**最简单的部署方式，推荐新手使用**

1. Fork 或推送此仓库到你的 GitHub
2. 访问 [Render Dashboard](https://dashboard.render.com)
3. 点击 **New +** → **Blueprint**
4. 连接你的 GitHub 仓库
5. Render 自动识别 `render.yaml` 并部署
6. 等待部署完成（约2-3分钟）
7. 复制分配的域名（如：`https://your-app.onrender.com`）

**注意事项：**
- Free 实例在15分钟无请求后会自动休眠
- 休眠后首次请求需要 10-30 秒唤醒
- 适合个人使用或低频调用场景

### 2️⃣ Railway 部署

**性能最好，但免费额度有限**

1. 访问 [Railway](https://railway.app)
2. 使用 GitHub 登录
3. 点击 **New Project** → **Deploy from GitHub repo**
4. 选择此仓库
5. Railway 自动检测 Dockerfile 并部署
6. 点击 **Generate Domain** 获取公网地址

**免费额度：**
- 一次性 $5 试用额度
- 按实际使用计费（CPU、内存、流量）
- 额度用完后需绑定信用卡

### 3️⃣ Fly.io 部署

**全球节点，适合国际访问**

```bash
# 安装 flyctl
curl -L https://fly.io/install.sh | sh

# 登录
flyctl auth login

# 初次部署
flyctl launch --no-deploy

# 部署应用
flyctl deploy

# 查看状态
flyctl status

# 查看日志
flyctl logs
```

**免费额度：**
- 最多 3 个共享 CPU 虚拟机
- 每月 160GB 出站流量
- 自动休眠机制

### 4️⃣ 本地部署

```bash
# 安装依赖
npm install

# 启动服务
npm start

# 或使用开发模式（自动重启）
npm run dev
```

服务将在 `http://localhost:3000` 启动

### 5️⃣ Docker 部署

```bash
# 构建镜像
docker build -t ai-api-proxy .

# 运行容器
docker run -p 3000:3000 ai-api-proxy

# 或使用环境变量指定端口
docker run -p 8080:8080 -e PORT=8080 ai-api-proxy
```

## 🔧 使用方法

部署完成后，将你的 AI API 请求地址替换为代理地址：

### OpenAI API

**原始请求：**
```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**使用代理：**
```bash
curl https://YOUR_DOMAIN/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Anthropic API (Claude)

**原始请求：**
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-opus-20240229",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**使用代理：**
```bash
curl https://YOUR_DOMAIN/anthropic/v1/messages \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-opus-20240229",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Google Gemini API

**使用代理：**
```bash
curl "https://YOUR_DOMAIN/gemini/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "Hello"}]}]
  }'
```

## 🔍 健康检查

访问 `/health` 端点检查服务状态：

```bash
curl https://YOUR_DOMAIN/health
```

响应：
```json
{
  "status": "ok",
  "timestamp": "2026-06-02T07:15:00.000Z"
}
```

## 📝 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | `3000` |

### 代理配置

所有代理配置在 `server.js` 中，你可以根据需要：

- 添加更多 AI 服务商
- 修改路径前缀
- 添加自定义请求/响应处理
- 添加速率限制或认证

## 🛠️ 开发

```bash
# 克隆仓库
git clone <your-repo-url>
cd vps

# 安装依赖
npm install

# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

## 📊 项目结构

```
vps/
├── server.js           # 主服务文件
├── package.json        # Node.js 配置
├── Dockerfile          # Docker 镜像配置
├── render.yaml         # Render 部署配置
├── railway.toml        # Railway 部署配置
├── fly.toml           # Fly.io 部署配置
├── deploy.sh          # 部署脚本
├── README.md          # 项目文档
├── .gitignore         # Git 忽略文件
└── .dockerignore      # Docker 忽略文件
```

## ⚠️ 注意事项

1. **API 密钥安全**：不要在代理服务器中硬编码 API 密钥，始终由客户端传递
2. **速率限制**：注意各 AI 服务商的 API 调用限制
3. **成本控制**：监控免费额度使用情况，避免意外费用
4. **服务休眠**：免费实例可能会休眠，生产环境建议使用付费方案
5. **合规使用**：遵守各 AI 服务商的使用条款

## 🚨 故障排查

### 服务无法启动

```bash
# 检查端口是否被占用
netstat -ano | findstr :3000

# 检查日志
npm start
```

### Render 部署失败

- 检查 `render.yaml` 配置
- 查看 Render Dashboard 的部署日志
- 确认 Dockerfile 正确

### API 请求失败

- 检查 API 密钥是否正确
- 确认请求路径是否正确
- 查看服务器日志
- 测试原始 API 是否可访问

## 📚 参考文档

- [Express.js](https://expressjs.com/)
- [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware)
- [Render Documentation](https://render.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Fly.io Documentation](https://fly.io/docs)

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**部署成功后，记得将 `YOUR_DOMAIN` 替换为实际分配的域名！**
