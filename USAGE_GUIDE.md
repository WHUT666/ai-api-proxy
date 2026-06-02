# 🎉 AI API 中转站使用指南

## ✅ 部署成功！

你的 AI API 反向代理服务已成功部署到 Cloudflare Workers！

**服务地址：** `https://ai-api-proxy.2358314123.workers.dev`

## 📊 服务状态

访问根路径查看服务信息：
```
https://ai-api-proxy.2358314123.workers.dev/
```

健康检查：
```
https://ai-api-proxy.2358314123.workers.dev/health
```

## 🔧 如何使用

### 1. OpenAI API 代理

**原始调用方式：**
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'your-openai-api-key'
});
```

**使用中转站：**
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://ai-api-proxy.2358314123.workers.dev/v1',
  apiKey: 'your-openai-api-key'
});
```

**cURL 测试：**
```bash
curl https://ai-api-proxy.2358314123.workers.dev/v1/chat/completions \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### 2. Anthropic (Claude) API 代理

**原始调用方式：**
```javascript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: 'your-anthropic-api-key'
});
```

**使用中转站：**
```javascript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  baseURL: 'https://ai-api-proxy.2358314123.workers.dev/anthropic',
  apiKey: 'your-anthropic-api-key'
});
```

**cURL 测试：**
```bash
curl https://ai-api-proxy.2358314123.workers.dev/anthropic/v1/messages \
  -H "x-api-key: YOUR_ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### 3. Google Gemini API 代理

**使用中转站：**
```bash
curl "https://ai-api-proxy.2358314123.workers.dev/gemini/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "Hello"}]}]
  }'
```

## 🌐 API 路径映射

| 服务商 | 原始地址 | 中转地址 |
|--------|---------|---------|
| OpenAI | `https://api.openai.com/v1/*` | `https://ai-api-proxy.2358314123.workers.dev/v1/*` |
| Anthropic | `https://api.anthropic.com/v1/*` | `https://ai-api-proxy.2358314123.workers.dev/anthropic/v1/*` |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/*` | `https://ai-api-proxy.2358314123.workers.dev/gemini/v1beta/*` |

## 📈 服务特性

- ✅ **完全免费**：Cloudflare Workers 免费版
- ✅ **每天 10 万次请求**：足够个人使用
- ✅ **全球 CDN 加速**：访问速度快
- ✅ **无冷启动**：响应迅速
- ✅ **自动 HTTPS**：安全可靠
- ✅ **支持 CORS**：前端可直接调用

## 🔐 安全说明

1. **API 密钥安全**：中转站不会记录或存储你的 API 密钥
2. **请求透传**：所有请求直接转发到目标 API
3. **无日志记录**：不记录请求内容

## 📊 监控和管理

### 查看实时日志

1. 访问 https://dash.cloudflare.com
2. 进入 **Workers & Pages**
3. 点击 **ai-api-proxy**
4. 点击 **Logs** 标签
5. 点击 **Begin log stream**

### 查看使用统计

在 Worker 页面点击 **Metrics** 标签，可以看到：
- 请求数量
- 错误率
- CPU 使用时间
- 流量统计

### 修改代码

1. 在 Worker 页面点击 **Edit code**
2. 修改代码
3. 点击 **Save and Deploy**

## ⚠️ 使用限制

Cloudflare Workers 免费版限制：
- 每天 100,000 次请求
- 每次请求最多 10ms CPU 时间
- 单次请求最大 100MB

对于个人使用，这些限制完全够用。如果超出限制，可以升级到付费版（$5/月，1000 万次请求）。

## 🆘 常见问题

**Q: 为什么访问速度比直接调用 API 慢？**
A: 首次访问可能有轻微延迟，后续请求会很快。Cloudflare 的全球 CDN 会自动优化路由。

**Q: 可以添加自定义域名吗？**
A: 可以！在 Worker 设置中添加 Custom Domain（需要域名托管在 Cloudflare）。

**Q: 如何更新代码？**
A: 在 Cloudflare Dashboard 中直接编辑，或在本地修改后运行 `wrangler deploy`。

**Q: 会被封禁吗？**
A: 只要遵守各 AI 服务商的使用条款，不会有问题。

## 📞 技术支持

- GitHub 仓库：https://github.com/WHUT666/ai-api-proxy
- Cloudflare Workers 文档：https://developers.cloudflare.com/workers/

## 🎯 快速测试

```bash
# 测试健康检查
curl https://ai-api-proxy.2358314123.workers.dev/health

# 测试服务信息
curl https://ai-api-proxy.2358314123.workers.dev/
```

---

**恭喜！你的 AI API 中转站已成功搭建并运行！** 🚀

现在你可以在任何项目中使用这个中转地址来访问 OpenAI、Anthropic 和 Google Gemini 的 API 了。
