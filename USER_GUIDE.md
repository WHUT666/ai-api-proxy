# 🚀 Kiro API 代理使用指南

欢迎使用 Kiro API 代理服务！本文档将帮助你快速上手使用免费的 Amazon Q (Kiro) AI 服务。

---

## 📋 目录

1. [快速开始](#快速开始)
2. [管理后台配置](#管理后台配置)
3. [添加 Kiro 账号](#添加-kiro-账号)
4. [API 使用方法](#api-使用方法)
5. [常见问题](#常见问题)
6. [故障排查](#故障排查)

---

## 🎯 快速开始

### 什么是 Kiro API 代理？

这是一个基于 Cloudflare Workers 的 AI API 代理服务，可以：

- ✅ **完全免费** - 无需付费，每天可处理 10 万次请求
- ✅ **全球加速** - Cloudflare 全球 CDN，超低延迟
- ✅ **多账号管理** - 支持批量导入和管理 Kiro 账号
- ✅ **OpenAI 兼容** - 支持 OpenAI API 格式，无缝切换
- ✅ **自动刷新** - Token 自动刷新，无需手动维护

### 服务地址

```
管理后台：https://8b08f538.ai-api-docs-bim.pages.dev/admin.html
API 端点：https://ai-api-proxy.2358314123.workers.dev/kiro/v1/chat/completions
健康检查：https://ai-api-proxy.2358314123.workers.dev/health
```

---

## 🔧 管理后台配置

### 第一步：打开管理后台

访问：https://8b08f538.ai-api-docs-bim.pages.dev/admin.html

### 第二步：配置管理员设置

1. 点击页面顶部的 **"设置"** 标签
2. 填写以下信息：

```
管理员密钥：kiro-admin-2024
Worker 地址：https://ai-api-proxy.2358314123.workers.dev
```

3. 点击 **"保存设置"** 按钮
4. 看到 ✅ "设置已保存" 提示后，返回 **"账号管理"** 标签

### 第三步：验证配置

返回账号管理页面后，你应该能看到：
- 账号列表（如果已导入账号）
- 或 "暂无 Kiro 账号" 提示（需要添加账号）

---

## 📥 添加 Kiro 账号

### 方法 1：批量导入（推荐）

如果你有从 Kiro Account Manager 导出的 JSON 文件：

1. 点击 **"添加 Kiro 账号"** 标签
2. 选择 **"批量导入 OIDC JSON"** 
3. 将 JSON 内容粘贴到文本框
4. 点击 **"批量导入"**
5. 等待导入完成，查看成功/失败统计

**支持的 JSON 格式：**

```json
[
  {
    "email": "your@email.com",
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret", 
    "refreshToken": "your-refresh-token",
    "region": "us-east-1"
  }
]
```

### 方法 2：单个添加

1. 点击 **"添加 Kiro 账号"** 标签
2. 选择认证方式：
   - **SSO Token**：适用于 IAM Identity Center
   - **OIDC 认证**：适用于 Builder ID / GitHub / Google
3. 填写账号信息
4. 点击 **"添加账号"**

---

## 🔑 刷新账号 Token

### 自动刷新（推荐）

API 调用时会自动检测 Token 是否过期并自动刷新，无需手动操作。

### 手动刷新

如果需要手动刷新某个账号的 Token：

1. 进入 **"账号管理"** 页面
2. 找到需要刷新的账号
3. 点击账号卡片上的 **"刷新 Token"** 按钮
4. 等待刷新完成

---

## 💻 API 使用方法

### OpenAI SDK（Python）

```python
from openai import OpenAI

client = OpenAI(
    api_key="dummy-key",  # 可以填任意值
    base_url="https://ai-api-proxy.2358314123.workers.dev/kiro/v1"
)

response = client.chat.completions.create(
    model="claude-3-5-sonnet",
    messages=[
        {"role": "user", "content": "你好，请介绍一下自己"}
    ],
    max_tokens=500
)

print(response.choices[0].message.content)
```

### OpenAI SDK（Node.js）

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'dummy-key',  // 可以填任意值
  baseURL: 'https://ai-api-proxy.2358314123.workers.dev/kiro/v1'
});

const response = await client.chat.completions.create({
  model: 'claude-3-5-sonnet',
  messages: [
    { role: 'user', content: '你好，请介绍一下自己' }
  ],
  max_tokens: 500
});

console.log(response.choices[0].message.content);
```

### cURL 命令

```bash
curl -X POST https://ai-api-proxy.2358314123.workers.dev/kiro/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet",
    "messages": [
      {"role": "user", "content": "你好"}
    ],
    "max_tokens": 100
  }'
```

### 支持的模型

```
GPT 系列（自动映射到 Claude）：
- gpt-4
- gpt-4o
- gpt-4-turbo
- gpt-3.5-turbo

Claude 系列：
- claude-3-5-sonnet
- claude-3-opus
- claude-3-sonnet
- claude-3-haiku

Anthropic 格式：
- anthropic.claude-3-5-sonnet-20241022-v2:0
```

---

## 🔍 常见问题

### Q1: 如何获取 Kiro 账号？

**A:** 有以下几种方式：

1. **使用 Kiro Account Manager**
   - 下载：https://github.com/chaogei/Kiro-account-manager
   - 自动注册并导出 OIDC JSON
   - 批量导入到本系统

2. **手动注册**
   - 访问 AWS Builder ID：https://profile.aws.amazon.com/
   - 或使用 GitHub/Google 社交登录
   - 手动提取认证信息

### Q2: Token 多久会过期？

**A:** 
- OIDC Token：通常 1 小时后过期
- 系统会自动在过期前 5 分钟刷新
- 刷新失败时会自动切换到其他账号

### Q3: 为什么 API 调用失败？

**A:** 可能的原因：

1. **Token 已过期**
   - 解决：在管理后台手动刷新 Token
   
2. **账号配额用完**
   - 解决：等待配额重置或添加更多账号
   
3. **refreshToken 失效**
   - 解决：重新导出账号数据并导入

### Q4: 如何查看账号使用情况？

**A:** 
1. 进入管理后台的 **"账号管理"** 页面
2. 每个账号卡片显示：
   - 最后使用时间
   - 当前月使用量
   - 配额限制

### Q5: 支持流式响应吗？

**A:** 
- 当前版本：仅支持非流式响应
- 未来版本：将支持 SSE 流式响应

---

## 🛠️ 故障排查

### 问题 1：管理后台显示"加载失败，请检查设置"

**解决方法：**

1. 检查设置是否正确：
   ```
   管理员密钥：kiro-admin-2024
   Worker 地址：https://ai-api-proxy.2358314123.workers.dev
   ```

2. 确保填写的是 **Worker 地址**，不是 Pages 地址

3. 清除浏览器缓存并强制刷新（Ctrl + Shift + R）

4. 使用诊断工具检查：
   ```
   https://44820133.ai-api-docs-bim.pages.dev/diagnostic.html
   ```

### 问题 2：API 调用返回 401 错误

**解决方法：**

1. 刷新账号 Token：
   ```bash
   POST /admin/accounts/{accountId}/refresh
   Authorization: Bearer kiro-admin-2024
   ```

2. 检查账号是否有 refreshToken

3. 如果 refreshToken 失效，重新导入账号数据

### 问题 3：API 调用返回 503 错误

**解决方法：**

1. 检查是否已添加账号
2. 检查账号是否启用
3. 检查账号 Token 是否有效

### 问题 4：响应内容为空

**当前已知问题：**
- Kiro API 响应解析需要优化
- 临时解决方案：刷新 Token 后立即调用

---

## 📞 技术支持

### 管理 API 参考

所有管理 API 都需要在请求头中包含管理员密钥：

```
Authorization: Bearer kiro-admin-2024
```

**获取账号列表：**
```
GET /admin/accounts
```

**刷新 Token：**
```
POST /admin/accounts/{accountId}/refresh
```

**删除账号：**
```
DELETE /admin/accounts/{accountId}
```

**批量导入：**
```
POST /admin/accounts/kiro/batch
Content-Type: application/json

[账号数据数组]
```

### 健康检查

```bash
curl https://ai-api-proxy.2358314123.workers.dev/health
```

返回：
```json
{
  "status": "ok",
  "timestamp": "2026-06-02T12:00:00.000Z",
  "version": "2.0.0-kiro",
  "supported": ["openai", "anthropic", "gemini", "kiro"]
}
```

---

## 🎓 最佳实践

### 1. 账号管理

- ✅ 导入多个账号以提高可用性
- ✅ 定期检查账号状态
- ✅ 及时刷新失效的 Token
- ✅ 删除长期不可用的账号

### 2. API 使用

- ✅ 处理 API 错误并实现重试机制
- ✅ 合理设置 max_tokens 避免超时
- ✅ 监控响应时间和成功率
- ✅ 使用连接池提高性能

### 3. 安全建议

- ⚠️ 不要公开分享管理员密钥
- ⚠️ 不要公开分享 Worker 地址
- ⚠️ 定期更换管理员密钥
- ⚠️ 监控异常访问

---

## 📊 系统限制

### Cloudflare Workers 限制

```
免费计划：
- 每天 100,000 次请求
- 每次请求 10ms CPU 时间
- 无流量费用

付费计划（$5/月）：
- 每月 10,000,000 次请求
- 每次请求 30ms CPU 时间
- 超出部分 $0.50/百万请求
```

### Kiro 账号限制

```
免费账号：
- 每月约 50-100 次对话
- 每次对话最多约 4000 tokens
- 支持 Claude 3.5 Sonnet 模型
```

---

## 🚀 更新日志

### v2.0.0 (2026-06-02)

- ✅ 完整的 Token 刷新逻辑
- ✅ OpenAI 格式到 Kiro 格式转换
- ✅ 批量账号导入功能
- ✅ Web 管理界面
- ✅ 自动 Token 过期检测
- ✅ ProfileArn 支持
- ✅ 多端点容错

### 未来计划

- ⏳ 流式响应支持
- ⏳ 多账号负载均衡
- ⏳ 使用统计报表
- ⏳ Webhook 通知
- ⏳ 账号健康监控

---

## 💡 提示与技巧

### 提高响应质量

1. **使用清晰的提示词**
2. **合理设置 max_tokens**
3. **利用系统提示 (system message)**

### 示例：优质提示词

```python
messages = [
    {
        "role": "system",
        "content": "你是一个专业的编程助手，擅长 Python 和 JavaScript。"
    },
    {
        "role": "user",
        "content": "请用 Python 实现一个二分查找算法，并添加详细注释。"
    }
]
```

---

## 📚 相关资源

- **项目地址**：https://github.com/WHUT666/ai-api-proxy
- **Kiro Account Manager**：https://github.com/chaogei/Kiro-account-manager
- **Cloudflare Workers 文档**：https://developers.cloudflare.com/workers/
- **OpenAI API 文档**：https://platform.openai.com/docs/api-reference

---

## 🎉 开始使用

现在你已经了解了所有必要的信息，开始使用 Kiro API 代理吧！

1. 配置管理后台
2. 添加 Kiro 账号
3. 调用 API 享受免费的 AI 服务！

**祝你使用愉快！** 🚀

---

*最后更新：2026-06-02*
