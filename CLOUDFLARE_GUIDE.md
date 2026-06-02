# Cloudflare Workers 部署指南

## 🌟 为什么选择 Cloudflare Workers？

- ✅ **完全免费，无需绑卡**
- ✅ 每天 10 万次免费请求
- ✅ 全球 CDN 加速
- ✅ 部署简单快速
- ✅ 自动 HTTPS

## 📦 部署方法

### 方法 1: 控制台部署（最简单，推荐）

#### 步骤 1: 注册 Cloudflare 账号

1. 访问 https://dash.cloudflare.com/sign-up
2. 使用邮箱注册（无需绑卡）
3. 验证邮箱

#### 步骤 2: 创建 Worker

1. 登录后，点击左侧菜单 **Workers & Pages**
2. 点击 **Create application**
3. 选择 **Create Worker**
4. 输入名称：`ai-api-proxy`（或其他名称）
5. 点击 **Deploy**

#### 步骤 3: 编辑 Worker 代码

1. 部署成功后，点击 **Edit code**
2. 删除默认代码
3. 打开本地文件 `worker.js`，复制全部内容
4. 粘贴到 Cloudflare 编辑器中
5. 点击右上角 **Save and Deploy**

#### 步骤 4: 获取服务地址

部署成功后，你会看到：
```
https://ai-api-proxy.YOUR_SUBDOMAIN.workers.dev
```

### 方法 2: 命令行部署（适合开发者）

#### 前置要求

需要安装 Node.js 和 npm

#### 步骤 1: 安装 Wrangler CLI

```bash
npm install -g wrangler
```

#### 步骤 2: 登录 Cloudflare

```bash
wrangler login
```

浏览器会打开授权页面，点击允许。

#### 步骤 3: 部署

```bash
# 在项目目录下运行
wrangler deploy
```

#### 步骤 4: 查看部署信息

```bash
wrangler deployments list
```

## 🧪 测试部署

### 测试健康检查

```bash
curl https://ai-api-proxy.YOUR_SUBDOMAIN.workers.dev/health
```

预期响应：
```json
{
  "status": "ok",
  "timestamp": "2026-06-02T08:00:00.000Z"
}
```

### 测试 OpenAI API

```bash
curl https://ai-api-proxy.YOUR_SUBDOMAIN.workers.dev/v1/chat/completions \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### 测试 Anthropic API

```bash
curl https://ai-api-proxy.YOUR_SUBDOMAIN.workers.dev/anthropic/v1/messages \
  -H "x-api-key: YOUR_ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## 📝 使用说明

### 在代码中使用

**OpenAI SDK:**
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://ai-api-proxy.YOUR_SUBDOMAIN.workers.dev/v1',
  apiKey: 'your-openai-key'
});

const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello' }]
});
```

**Anthropic SDK:**
```javascript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  baseURL: 'https://ai-api-proxy.YOUR_SUBDOMAIN.workers.dev/anthropic',
  apiKey: 'your-anthropic-key'
});

const message = await anthropic.messages.create({
  model: 'claude-3-haiku-20240307',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello' }]
});
```

## 🔧 管理和监控

### 查看日志

1. 在 Cloudflare Dashboard 打开你的 Worker
2. 点击 **Logs** 标签
3. 点击 **Begin log stream** 查看实时日志

### 查看使用统计

1. 在 Worker 页面点击 **Metrics** 标签
2. 可以看到：
   - 请求数量
   - 错误率
   - CPU 使用时间
   - 流量统计

### 设置自定义域名（可选）

1. 在 Worker 页面点击 **Settings** → **Triggers**
2. 点击 **Add Custom Domain**
3. 输入你的域名（需要域名托管在 Cloudflare）
4. 确认添加

## ⚙️ 高级配置

### 修改 Worker 代码

1. 在 Dashboard 中点击 **Edit code**
2. 修改代码
3. 点击 **Save and Deploy**

或者本地修改 `worker.js` 后运行：
```bash
wrangler deploy
```

### 添加环境变量

1. 在 Worker 页面点击 **Settings** → **Variables**
2. 添加需要的环境变量
3. 在代码中通过 `env.VARIABLE_NAME` 访问

## 📊 免费额度

- ✅ 每天 100,000 次请求
- ✅ 每次请求 10ms CPU 时间
- ✅ 无带宽限制
- ✅ 全球 CDN 分发

对于个人使用或小型项目，免费额度完全够用。

## ⚠️ 注意事项

1. **请求大小限制**：单次请求最大 100MB
2. **响应超时**：最长 30 秒（足够 AI API 使用）
3. **并发限制**：免费版无限制
4. **API 密钥安全**：Worker 不存储任何 API 密钥，所有密钥由客户端传递

## 🆚 与其他方案对比

| 特性 | Cloudflare Workers | Render | Railway |
|------|-------------------|--------|---------|
| 费用 | 完全免费 | 需要绑卡 | 需要绑卡 |
| 请求限制 | 10万/天 | 无限制 | 无限制 |
| 冷启动 | 无 | 15分钟休眠 | 无休眠 |
| 全球加速 | ✅ | ❌ | ❌ |
| 部署难度 | 简单 | 简单 | 简单 |

## 🚀 快速开始

1. 访问 https://dash.cloudflare.com
2. 创建 Worker
3. 复制 `worker.js` 代码
4. 保存并部署
5. 开始使用！

---

**部署完成后，你的 AI API 代理就可以立即使用了！** 🎉
