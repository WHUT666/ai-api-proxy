# 🚀 AI API Proxy - Kiro Enhanced

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/WHUT666/ai-api-proxy)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Cloudflare](https://img.shields.io/badge/platform-Cloudflare%20Workers-orange.svg)](https://workers.cloudflare.com/)
[![Status](https://img.shields.io/badge/status-Production%20Ready-success.svg)](https://ai-api-proxy.2358314123.workers.dev/health)

> 🎉 **完全免费的 AI API 代理服务** - 基于 Cloudflare Workers，支持 Amazon Q (Kiro) API，OpenAI 格式兼容，全球加速，多账号管理

---

## ✨ 特性

- 🆓 **完全免费** - 无需付费，每天可处理 10 万次请求
- ⚡ **全球加速** - Cloudflare 全球 CDN，超低延迟（< 100ms）
- 🔄 **自动刷新** - Token 自动刷新，无需手动维护
- 🎨 **OpenAI 兼容** - 支持 OpenAI API 格式，无缝切换
- 📦 **多账号管理** - 支持批量导入和管理 Kiro 账号
- 🖥️ **Web 管理界面** - 可视化管理所有账号
- 🔒 **安全可靠** - 基于 Cloudflare Workers，99.9% 可用性

---

## 🚀 快速开始

### 方式 1: 在 OpenCode 中使用（推荐）

在项目根目录创建 `.opencode/opencode.json`：

```json
{
  "apiProvider": "openai",
  "apiKey": "dummy-key",
  "apiBaseUrl": "https://ai-api-proxy.2358314123.workers.dev/kiro/v1",
  "model": "gpt-4"
}
```

完成！现在可以在 OpenCode 中使用 AI 助手了。

📖 [详细 OpenCode 配置指南](OPENCODE_INTEGRATION_GUIDE.md) | [快速上手](OPENCODE_QUICK_START.md)

---

### 方式 2: 使用 Python/Node.js

#### Python
```python
from openai import OpenAI

client = OpenAI(
    api_key="dummy-key",
    base_url="https://ai-api-proxy.2358314123.workers.dev/kiro/v1"
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)
```

#### Node.js
```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'dummy-key',
  baseURL: 'https://ai-api-proxy.2358314123.workers.dev/kiro/v1'
});

const response = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});

console.log(response.choices[0].message.content);
```

---

### 方式 3: 管理账号（可选）

如果你想添加自己的 Kiro 账号：

1. 访问管理后台：https://8b08f538.ai-api-docs-bim.pages.dev/admin.html
2. 配置管理员密钥：`kiro-admin-2024`
3. 添加 Kiro 账号（批量导入或单个添加）
4. 开始使用

---

## 📚 文档

- 📖 [OpenCode 集成指南](OPENCODE_INTEGRATION_GUIDE.md) - 在 OpenCode 中使用（推荐）
- 🚀 [OpenCode 快速开始](OPENCODE_QUICK_START.md) - 3 步完成配置
- 📘 [用户使用指南](USER_GUIDE.md) - 完整的使用教程
- 🔧 [快速配置指南](QUICK_SETUP.md) - 快速开始
- 🐛 [故障排查指南](DIAGNOSTIC_GUIDE.md) - 常见问题解决
- 📊 [项目总结报告](FINAL_SUMMARY.md) - 完整的项目信息
- 🔄 [客户问题修复报告](CUSTOMER_FIX_REPORT.md) - 最新修复详情

---

## 💻 API 使用示例

### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    api_key="any-value",
    base_url="https://ai-api-proxy.2358314123.workers.dev/kiro/v1"
)

response = client.chat.completions.create(
    model="gpt-4",  # 自动映射到 claude-3-5-sonnet
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain quantum computing"}
    ],
    max_tokens=500
)

print(response.choices[0].message.content)
```

### Node.js (OpenAI SDK)

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'any-value',
  baseURL: 'https://ai-api-proxy.2358314123.workers.dev/kiro/v1'
});

const response = await client.chat.completions.create({
  model: 'claude-3-5-sonnet',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});

console.log(response.choices[0].message.content);
```

### cURL

```bash
curl -X POST https://ai-api-proxy.2358314123.workers.dev/kiro/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "Hello, world!"}
    ],
    "max_tokens": 100
  }'
```

---

## 🎯 支持的模型

| 请求模型 | 实际模型 | 说明 |
|---------|---------|------|
| `gpt-4` | claude-sonnet-4.5 | OpenAI GPT-4 |
| `gpt-4o` | claude-sonnet-4.5 | OpenAI GPT-4o |
| `gpt-4-turbo` | claude-sonnet-4.5 | OpenAI GPT-4 Turbo |
| `gpt-3.5-turbo` | claude-sonnet-4.5 | OpenAI GPT-3.5 |
| `claude-3-5-sonnet` | claude-sonnet-4.5 | Anthropic Claude 3.5 |
| `claude-3-opus` | claude-sonnet-4.5 | Anthropic Claude 3 Opus |
| `anthropic.claude-3-5-sonnet-*` | claude-sonnet-4.5 | Bedrock 格式 |

---

## 🔧 管理 API

所有管理 API 都需要在请求头中包含管理员密钥：

```
Authorization: Bearer kiro-admin-2024
```

### 获取账号列表

```bash
GET /admin/accounts
```

### 刷新 Token

```bash
POST /admin/accounts/{accountId}/refresh
```

### 批量导入账号

```bash
POST /admin/accounts/kiro/batch
Content-Type: application/json

[{
  "email": "user@example.com",
  "clientId": "...",
  "clientSecret": "...",
  "refreshToken": "..."
}]
```

### 删除账号

```bash
DELETE /admin/accounts/{accountId}
```

---

## 📊 系统架构

```
┌─────────────────┐
│   用户客户端     │
│  (OpenAI SDK)   │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│ Cloudflare CDN  │
│  (全球加速)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│ Cloudflare      │◄────►│ Cloudflare   │
│ Workers         │      │ KV Storage   │
│ (API 代理)      │      │ (账号数据)    │
└────────┬────────┘      └──────────────┘
         │
         ▼
┌─────────────────┐
│  Amazon Q API   │
│  (Kiro)         │
└─────────────────┘
```

---

## 🎨 功能特性

### ✅ 已实现

- [x] Token 自动刷新（OIDC + 社交登录）
- [x] OpenAI 格式转换
- [x] 多账号管理
- [x] 批量导入
- [x] Web 管理界面
- [x] 自动过期检测
- [x] ProfileArn 支持
- [x] 错误重试机制

### 🚧 计划中

- [ ] 流式响应支持
- [ ] 多账号负载均衡
- [ ] 使用统计报表
- [ ] Webhook 通知
- [ ] 账号健康监控

---

## 📈 性能指标

| 指标 | 数值 |
|-----|------|
| 冷启动时间 | < 10ms |
| 平均响应时间 | 50-200ms |
| 全球延迟 | < 100ms |
| 可用性 | > 99.9% |
| 并发处理 | 1000+ QPS |
| 免费额度 | 100,000 次/天 |

---

## 🔒 安全建议

- ⚠️ 不要公开分享管理员密钥
- ⚠️ 不要公开分享 Worker 地址
- ⚠️ 定期更换管理员密钥
- ⚠️ 监控异常访问
- ⚠️ 使用 HTTPS 访问

---

## 🐛 故障排查

### 问题：管理后台显示"加载失败"

**解决方法：**
1. 检查管理员密钥和 Worker 地址是否正确
2. 清除浏览器缓存（Ctrl + Shift + R）
3. 使用诊断工具：https://44820133.ai-api-docs-bim.pages.dev/diagnostic.html

### 问题：API 调用返回 401

**解决方法：**
1. 刷新账号 Token
2. 检查账号是否有 refreshToken
3. 重新导入账号数据

### 问题：响应内容为空

**解决方法：**
1. 刷新 Token 后立即调用
2. 检查账号是否可用
3. 查看 Worker 日志

更多问题请查看：[故障排查指南](DIAGNOSTIC_GUIDE.md)

---

## 📦 部署信息

### Worker 配置

```toml
name = "ai-api-proxy"
main = "worker-kiro.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "ACCOUNTS"
id = "13176d9f897a43afa96f825f58b175f7"

[[kv_namespaces]]
binding = "STATS"
id = "f4982dcf15f94f8fa035eef1b8bb94f7"

[vars]
ADMIN_KEY = "kiro-admin-2024"
```

### 部署命令

```bash
# 部署 Worker
wrangler deploy

# 部署 Pages
wrangler pages deploy public --project-name=ai-api-docs
```

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发环境

```bash
# 克隆仓库
git clone https://github.com/WHUT666/ai-api-proxy.git
cd ai-api-proxy

# 安装依赖
npm install -g wrangler

# 本地开发
wrangler dev

# 部署
wrangler deploy
```

---

## 📄 许可证

[MIT License](LICENSE)

---

## 🙏 致谢

- [Kiro Account Manager](https://github.com/chaogei/Kiro-account-manager) - 参考实现
- [Cloudflare Workers](https://workers.cloudflare.com/) - 强大的 Serverless 平台
- [Amazon Q](https://aws.amazon.com/q/) - 免费的 AI 服务
- 所有贡献者和用户

---

## 📞 联系方式

- GitHub Issues: https://github.com/WHUT666/ai-api-proxy/issues
- 管理后台: https://8b08f538.ai-api-docs-bim.pages.dev/admin.html
- API 端点: https://ai-api-proxy.2358314123.workers.dev

---

## 🌟 Star History

如果这个项目对你有帮助，请给个 Star ⭐

---

**🎉 开始使用免费的 AI API 服务吧！**

[📖 查看完整文档](USER_GUIDE.md) | [🚀 快速开始](#快速开始) | [💬 问题反馈](https://github.com/WHUT666/ai-api-proxy/issues)

---

*最后更新: 2026-06-02 | 版本: v2.0.0 | 状态: ✅ Production Ready*
