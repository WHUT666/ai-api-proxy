# 🚀 Kiro API 代理中转站使用指南

欢迎使用升级版的 **Kiro API 代理服务**！本中转站已获得全新架构重塑，完美支持 **OpenAI**、**Anthropic/Claude**、以及 **Responses** 三大业界主流协议格式（支持全功能流式 SSE 推流及自动 OIDC/社交 Token 刷新）。

---

## 📋 目录

1. [服务架构与地址](#-服务架构与地址)
2. [管理后台配置](#-管理后台配置)
3. [导入 Kiro 账号](#-导入-kiro-账号)
4. [API 详细使用方法](#-api-详细使用方法)
   - [1. OpenAI 格式 (流式/非流式)](#1-openai-格式-流式非流式)
   - [2. Anthropic/Claude 格式 (流式/非流式)](#2-anthropicclaude-格式-流式非流式)
   - [3. Responses 格式 (流式/非流式)](#3-responses-格式-流式非流式)
   - [4. Claude Code Token 计数](#4-claude-code-token-计数)
5. [高阶特性：故障隔离与断路器](#-高阶特性故障隔离与断路器)

---

## 🌐 服务架构与地址

本中转站支持 **Cloudflare Workers** 和 **本地 Node.js (VPS)** 两种环境并行部署。两端核心推流解包代码已完全对齐，彻底修复了流式（Stream）下透传 AWS 二进制 EventStream 导致客户端不可用的缺陷。

### 1. 线上 Cloudflare Workers 节点
- **API 统一根地址**：`https://ai-api-proxy.2358314123.workers.dev/kiro/v1`
- **健康检查**：`https://ai-api-proxy.2358314123.workers.dev/health`

### 2. 本地 Node.js / VPS 服务器 
- **本地启动方法**：在项目根目录下运行 `npm install`，然后运行 `node server.js`
- **API 统一根地址**：`http://localhost:3000/kiro/v1`
- **健康检查**：`http://localhost:3000/health`

---

## 🔧 管理后台配置

### 第一步：打开管理后台
访问：`https://8b08f538.ai-api-docs-bim.pages.dev/admin.html` 或您自主部署的管理页面。

### 第二步：配置管理员参数
1. 点击顶部的 **"设置"** 标签。
2. 填写以下信息：
   - **管理员密钥**：`kiro-admin-2024`（或您自定义的 `ADMIN_KEY` 环境变量）
   - **Worker/VPS 地址**：`https://ai-api-proxy.2358314123.workers.dev`（或 `http://localhost:3000`）
3. 点击 **"保存设置"**，验证成功后返回 **"账号管理"**。

---

## 📥 导入 Kiro 账号

进入 **"添加 Kiro 账号"** 页面，粘贴您从 Kiro Account Manager 中导出的 OIDC JSON：

```json
[
  {
    "email": "your-email@mail.com",
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret", 
    "refreshToken": "your-refresh-token",
    "region": "us-east-1"
  }
]
```
点击 **"批量导入"**，中转站将会自动托管这些账号。

---

## 🔑 API 详细使用方法

### 1. OpenAI 格式 (流式/非流式)

本端点完全兼容官方 OpenAI SDK 规范。

#### Python (OpenAI SDK)
```python
from openai import OpenAI

client = OpenAI(
    api_key="any-dummy-key",
    base_url="https://ai-api-proxy.2358314123.workers.dev/kiro/v1"
)

# 1. 测试流式 (Stream)
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "1+1等于几？用一句话回答。"}],
    stream=True
)
for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)

# 2. 测试非流式
# response = client.chat.completions.create(...)
```

#### Node.js (OpenAI SDK)
```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'any-dummy-key',
  baseURL: 'https://ai-api-proxy.2358314123.workers.dev/kiro/v1'
});

const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: '你好' }],
  stream: true
});

for await (const chunk of response) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

---

### 2. Anthropic/Claude 格式 (流式/非流式)

本中转站已完美移植原生的 Anthropic/Claude 协议互转。您可以直接将此 API 作为 Claude 官方接口的平替，用于 **Claude Code**、**Cursor** 或 **Artifacts** 等客户端中。

#### cURL 流式测试
```bash
curl -X POST https://ai-api-proxy.2358314123.workers.dev/kiro/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet",
    "messages": [
      {"role": "user", "content": "用两句话介绍一下什么是量子计算？"}
    ],
    "max_tokens": 500,
    "stream": true
  }'
```
> **输出效果**：您将会在终端实时接收到符合 Anthropic SSE 标准的 `content_block_start`、`content_block_delta` [text_delta]、`content_block_stop` 以及 `message_stop` 事件。

---

### 3. Responses 格式 (流式/非流式)

部分第三方轻量级客户端专门使用 `Responses` 终结点，中转站对此格式进行了极智支持。

#### 示例请求
```bash
curl -X POST https://ai-api-proxy.2358314123.workers.dev/kiro/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "input": "量子纠缠是什么？用一句话概括。",
    "stream": true
  }'
```
> **输出效果**：您将实时接收到转换自 OpenAI 内部代理的高阶 `output_delta` (类型为 `output_text_delta`) 响应块，完美贴合 Responses 协议。

---

### 4. Claude Code Token 计数

中转站对 Claude Code 等客户端请求的计数端点进行了伪装，避免客户端校验失败：
- **POST** `/kiro/v1/messages/count_tokens` -> 返回 `{ "input_tokens": 0 }`

---

## 🛠️ 高阶特性：故障隔离与断路器

本中转站的核心代理算法（`LocalAccountPool` / `AccountPool`）自带企业级的高可靠账号健康保障体系：

- **无感自动刷新**：每次请求发起前，系统会自动检查当前所分发的 Kiro 账号 Token 寿命，若在 5 分钟内到期，将在请求前自动触发 **OIDC/社交 OAuth token 双协议刷新**。
- **动态故障退避**：若账号在请求时触发 402（无配额）或 429（限流），系统将自动把该账号锁定冷却 1 小时；普通连接故障按指数退避冷却（$60\text{s} \times 2^{n-1}$）。
- **断路熔断保护**：当单个账号连续发生 5 次 401/403 认证错误，系统自动将其标记为 **SUSPENDED (拉黑)** 并予以剔除，同时自动漂移并无感重试账号池中的下一个可用健康账号，给您的生产访问提供坚如磐石的可用性保障！
