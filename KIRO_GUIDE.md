# 🔥 Kiro (Amazon Q) 账号管理指南

## 📖 目录

1. [Kiro 账号类型](#kiro-账号类型)
2. [获取 Kiro Token](#获取-kiro-token)
3. [添加 Kiro 账号](#添加-kiro-账号)
4. [使用 Kiro API](#使用-kiro-api)
5. [Token 自动刷新](#token-自动刷新)
6. [常见问题](#常见问题)

---

## 🎯 Kiro 账号类型

Kiro (Amazon Q) 支持三种认证方式：

### 1. SSO Token（AWS IAM Identity Center）

**特点：**
- ✅ 最常用的认证方式
- ✅ 从 VS Code / Cursor 配置文件中获取
- ❌ 无法自动刷新，需要重新登录

**适用场景：**
- 已在 IDE 中登录 Amazon Q
- 快速测试和使用

### 2. OIDC（Builder ID / GitHub / Google）

**特点：**
- ✅ 支持自动刷新 Token
- ✅ 长期有效，无需频繁手动更新
- ⚠️ 需要提供 Client ID、Client Secret 和 Refresh Token

**适用场景：**
- 长期稳定使用
- 生产环境部署
- 需要自动刷新功能

### 3. Bearer Token

**特点：**
- ✅ 直接使用 Access Token
- ✅ 简单直接
- ❌ 无法自动刷新
- ⚠️ 需要手动管理过期时间

**适用场景：**
- 临时测试
- 已有有效的 Access Token

---

## 🔍 获取 Kiro Token

### 方法 1：从 VS Code / Cursor 配置文件获取（推荐）

Kiro Token 存储在以下位置：

**Windows:**
```
%APPDATA%\Code\User\globalStorage\amazon.q-for-vscode\sso\token_cache.json
```

**macOS:**
```
~/Library/Application Support/Code/User/globalStorage/amazon.q-for-vscode/sso/token_cache.json
```

**Linux:**
```
~/.config/Code/User/globalStorage/amazon.q-for-vscode/sso/token_cache.json
```

**Cursor:**
```
# Windows
%APPDATA%\Cursor\User\globalStorage\amazon.q-for-vscode\sso\token_cache.json

# macOS
~/Library/Application Support/Cursor/User/globalStorage/amazon.q-for-vscode/sso/token_cache.json

# Linux
~/.config/Cursor/User/globalStorage/amazon.q-for-vscode/sso/token_cache.json
```

**打开文件后，查找以下字段：**

```json
{
  "accessToken": "eyJ...",         // 这就是你需要的 SSO Token
  "expiresAt": "2024-12-31T...",   // 过期时间
  "region": "us-east-1",           // AWS 区域
  "startUrl": "https://..."        // SSO 登录地址
}
```

### 方法 2：使用 Kiro-account-manager 导出

如果你安装了 [Kiro-account-manager](https://github.com/chaogei/Kiro-account-manager)：

1. 打开 Kiro Account Manager
2. 选择账号
3. 点击"导出"或"查看详情"
4. 复制 SSO Token 或 OIDC 凭证

### 方法 3：从浏览器开发者工具获取

1. 在浏览器中登录 [AWS IAM Identity Center](https://console.aws.amazon.com/)
2. 打开开发者工具（F12）→ Network 标签
3. 刷新页面，查找包含 `token` 的请求
4. 在请求头或响应中找到 `accessToken`

---

## ➕ 添加 Kiro 账号

### 使用 Web 管理界面（推荐）

1. **打开管理界面**
   ```
   https://your-worker.workers.dev/admin
   # 或本地打开 admin-kiro.html
   ```

2. **配置设置**
   - 点击"设置"标签
   - 输入管理员密钥（与 Worker 环境变量一致）
   - 输入 Worker 地址
   - 点击"保存设置"

3. **添加账号**
   - 点击"添加 Kiro 账号"标签
   - 选择认证类型（SSO Token / OIDC / Bearer Token）
   - 填写必要信息：
     * 邮箱：账号标识
     * AWS 区域：选择最近的区域
     * Token 信息：根据认证类型填写
   - 点击"添加账号"

### 使用 API 添加（高级）

**添加 SSO Token 账号：**

```bash
curl https://your-worker.workers.dev/admin/accounts/kiro \
  -H "Authorization: Bearer your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "region": "us-east-1",
    "ssoToken": "eyJ..."
  }'
```

**添加 OIDC 账号：**

```bash
curl https://your-worker.workers.dev/admin/accounts/kiro \
  -H "Authorization: Bearer your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "region": "us-east-1",
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "refreshToken": "your-refresh-token",
    "accessToken": "current-access-token"
  }'
```

**添加 Bearer Token 账号：**

```bash
curl https://your-worker.workers.dev/admin/accounts/kiro \
  -H "Authorization: Bearer your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "region": "us-east-1",
    "accessToken": "eyJ...",
    "expiresAt": 1735689600000
  }'
```

---

## 🚀 使用 Kiro API

部署完成后，所有 Kiro API 请求通过 `/kiro` 前缀访问。

### 1. 流式对话（Chat）

**端点：** `/kiro/api/v1/streaming-conversations`

**示例请求：**

```bash
curl https://your-worker.workers.dev/kiro/api/v1/streaming-conversations \
  -H "Content-Type: application/json" \
  -d '{
    "conversationState": {
      "currentMessage": {
        "userInputMessage": {
          "content": "Write a hello world program in Python"
        }
      },
      "chatTriggerType": "MANUAL"
    }
  }'
```

**JavaScript 示例：**

```javascript
const response = await fetch(
  'https://your-worker.workers.dev/kiro/api/v1/streaming-conversations',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationState: {
        currentMessage: {
          userInputMessage: {
            content: 'Your question here'
          }
        },
        chatTriggerType: 'MANUAL'
      }
    })
  }
);

// 处理流式响应
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  console.log(chunk);
}
```

### 2. 获取对话列表

**端点：** `/kiro/api/v1/conversations`

```bash
curl https://your-worker.workers.dev/kiro/api/v1/conversations
```

### 3. 生成计划

**端点：** `/kiro/api/v1/generate-plan`

```bash
curl https://your-worker.workers.dev/kiro/api/v1/generate-plan \
  -H "Content-Type: application/json" \
  -d '{
    "conversationState": {
      "currentMessage": {
        "userInputMessage": {
          "content": "Create a web scraper"
        }
      }
    }
  }'
```

### 4. 生成代码片段

**端点：** `/kiro/api/v1/generate-code-snippet`

```bash
curl https://your-worker.workers.dev/kiro/api/v1/generate-code-snippet \
  -H "Content-Type: application/json" \
  -d '{
    "programmingLanguage": {
      "languageName": "python"
    },
    "leftFileContent": "",
    "rightFileContent": "",
    "cursorState": {
      "position": {
        "line": 0,
        "character": 0
      }
    }
  }'
```

### 5. 获取可用模型

**端点：** `/kiro/api/v1/models`

```bash
curl https://your-worker.workers.dev/kiro/api/v1/models
```

---

## 🔄 Token 自动刷新

### OIDC 账号自动刷新

如果你使用 OIDC 认证（Builder ID / GitHub / Google），Worker 会自动刷新 Token：

1. **自动检测过期**
   - 每次请求前检查 Token 是否在 5 分钟内过期
   - 如果即将过期，自动调用刷新接口

2. **刷新流程**
   ```
   客户端请求 → 检查 Token → 即将过期？
                              ↓ 是
                        调用刷新接口
                              ↓
                        更新 Token → 继续请求
   ```

3. **手动刷新**
   ```bash
   curl https://your-worker.workers.dev/admin/refresh/{accountId} \
     -H "Authorization: Bearer your-admin-key" \
     -X POST
   ```

### SSO Token 刷新

SSO Token **无法自动刷新**，过期后需要：

1. 在 VS Code / Cursor 中重新登录 Amazon Q
2. 从配置文件中获取新的 SSO Token
3. 在管理界面中更新账号信息

---

## 🔐 多账号负载均衡

当添加多个 Kiro 账号时，Worker 会自动进行负载均衡：

### 轮询策略

1. **最少使用优先（LRU）**
   - 选择 `lastUsed` 时间最早的账号
   - 避免单个账号过载

2. **自动故障转移**
   - 如果当前账号返回 401/403，自动切换到下一个
   - 失败的账号会被暂时禁用

3. **配额检测**
   - 跟踪每个账号的使用量
   - 接近配额限制时自动切换

### 使用示例

```javascript
// 无需指定账号，Worker 自动选择最优账号
const response = await fetch(
  'https://your-worker.workers.dev/kiro/api/v1/streaming-conversations',
  {
    method: 'POST',
    body: JSON.stringify({ /* ... */ })
  }
);

// 如果失败，会自动切换到其他账号并重试
```

---

## ❓ 常见问题

### Q1: 如何知道 Token 是否有效？

**A:** 添加账号后，在管理界面查看账号状态：
- 🟢 **绿色边框**：账号正常
- 🔴 **红色边框**：账号已禁用（可能 Token 过期）

或者测试请求：
```bash
curl https://your-worker.workers.dev/kiro/api/v1/models
```

### Q2: SSO Token 多久过期？

**A:** 通常 SSO Token 有效期为 **8-12 小时**。建议：
- 使用 OIDC 认证以获得自动刷新
- 或定期从 IDE 配置文件更新 Token

### Q3: 为什么返回 401 Unauthorized？

**可能原因：**
1. Token 已过期
2. Token 格式错误
3. AWS 区域选择错误
4. 账号被 AWS 暂停

**解决方法：**
1. 刷新 Token（OIDC 账号）
2. 重新获取 SSO Token
3. 检查区域设置
4. 查看账号状态

### Q4: 如何切换 AWS 区域？

**A:** 不同区域的 Kiro API 端点不同：
- `us-east-1`: `codewhisperer.us-east-1.amazonaws.com`（默认）
- `us-west-2`: `codewhisperer.us-west-2.amazonaws.com`
- `eu-west-1`: `codewhisperer.eu-west-1.amazonaws.com`

在添加账号时选择最近的区域可获得更好的延迟。

### Q5: 支持哪些 Kiro 模型？

**A:** 当前支持的模型包括：
- Amazon Q Developer
- CodeWhisperer
- Claude (通过 Kiro)

调用 `/kiro/api/v1/models` 获取完整列表。

### Q6: 如何监控使用量？

**A:** 在管理界面的"账号管理"标签中：
- 查看每个账号的本月使用量
- 进度条显示配额使用百分比
- 接近限制时会自动切换到其他账号

### Q7: 可以同时使用多个服务吗？

**A:** 可以！同一个 Worker 支持：
- OpenAI API (`/v1/*`)
- Anthropic API (`/anthropic/*`)
- Google Gemini API (`/gemini/*`)
- Kiro API (`/kiro/*`)

所有服务共享相同的管理系统和负载均衡。

---

## 🚀 下一步

### 完成 Kiro 配置后，你可以：

1. **集成到应用**
   - 在你的项目中配置 Kiro API 端点
   - 替换原始 API 地址为代理地址

2. **监控使用情况**
   - 定期查看管理界面
   - 关注配额使用情况

3. **优化配置**
   - 添加更多账号提高可用性
   - 使用 OIDC 认证实现自动刷新

4. **升级功能**
   - 参考 `ENHANCED_GUIDE.md` 添加更多功能
   - 自定义负载均衡策略

---

## 📚 相关文档

- [Kiro-account-manager 项目](https://github.com/chaogei/Kiro-account-manager)
- [AWS CodeWhisperer 文档](https://docs.aws.amazon.com/codewhisperer/)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [项目 GitHub](https://github.com/WHUT666/ai-api-proxy)

---

**如有问题，欢迎在 GitHub 提 Issue！** 🎉
