# 🎉 Kiro (Amazon Q) 支持已完成！

## ✅ 新增功能

你的 AI API 代理现在已经支持 **Kiro (Amazon Q)** 账号管理和反向代理！

### 🔥 Kiro 特性

| 功能 | 状态 | 说明 |
|------|------|------|
| SSO Token 认证 | ✅ | 从 IDE 配置文件导入 |
| OIDC 认证 | ✅ | Builder ID / GitHub / Google |
| Bearer Token 认证 | ✅ | 直接使用 Access Token |
| Token 自动刷新 | ✅ | OIDC 账号支持自动刷新 |
| 多账号负载均衡 | ✅ | 自动选择最优账号 |
| 使用量统计 | ✅ | 跟踪每月配额使用 |
| Web 管理界面 | ✅ | 可视化管理 Kiro 账号 |

---

## 📁 新增文件

### 1. `worker-kiro.js` - Kiro 增强版 Worker
**完整功能：**
- ✅ 支持 OpenAI / Anthropic / Gemini / **Kiro** 四大服务
- ✅ Kiro 三种认证方式（SSO / OIDC / Bearer）
- ✅ Token 自动刷新机制
- ✅ 多账号负载均衡（LRU 策略）
- ✅ 自动故障转移
- ✅ 使用量跟踪和配额管理
- ✅ 管理 API 接口

### 2. `admin-kiro.html` - Kiro 管理界面
**界面功能：**
- ✅ 添加 Kiro 账号（三种认证类型）
- ✅ 账号列表和状态监控
- ✅ 使用量可视化（进度条）
- ✅ Token 手动刷新
- ✅ 账号启用/禁用
- ✅ 使用说明和示例代码

### 3. `KIRO_GUIDE.md` - 完整使用指南
**文档内容：**
- ✅ Kiro 账号类型详解
- ✅ 获取 Token 的三种方法
- ✅ 添加账号的步骤说明
- ✅ API 使用示例（Chat / 代码生成 / 计划生成）
- ✅ Token 自动刷新机制
- ✅ 常见问题解答

---

## 🚀 快速开始

### 步骤 1: 部署 Kiro 增强版 Worker

有两种部署方式：

#### 方式 A：替换现有 Worker（推荐）

1. 访问 Cloudflare Dashboard
2. 进入你的 Worker：`ai-api-proxy`
3. 点击 **Edit code**
4. 删除旧代码，粘贴 `worker-kiro.js` 的全部内容
5. 点击 **Save and Deploy**

#### 方式 B：创建新的 Worker

```bash
# 使用 wrangler 部署
wrangler deploy --config wrangler-kiro.toml
```

### 步骤 2: 配置 KV 命名空间

如果还没有创建 KV：

1. 在 Cloudflare Dashboard 创建两个 KV 命名空间：
   - `ACCOUNTS` - 存储账号
   - `STATS` - 存储统计

2. 绑定到 Worker：
   - 进入 Worker → Settings → Variables
   - 添加 KV Namespace Bindings：
     * 变量名 `ACCOUNTS` → 选择对应的 KV
     * 变量名 `STATS` → 选择对应的 KV

3. 设置管理员密钥：
   - 添加环境变量 `ADMIN_KEY` = `your-secure-key`

### 步骤 3: 获取 Kiro Token

从 VS Code / Cursor 配置文件中获取：

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

打开文件，复制 `accessToken` 字段的值。

### 步骤 4: 添加 Kiro 账号

#### 使用 Web 管理界面

1. **打开管理界面**
   - 在浏览器中打开 `admin-kiro.html`
   - 或访问 `https://your-worker.workers.dev/admin`（如果集成到 Worker）

2. **配置设置**
   - 点击"设置"标签
   - 输入管理员密钥（与 Worker 环境变量一致）
   - 输入 Worker 地址：`https://ai-api-proxy.2358314123.workers.dev`
   - 保存设置

3. **添加账号**
   - 点击"添加 Kiro 账号"标签
   - 选择 **SSO Token**
   - 填写邮箱和 Token
   - 选择 AWS 区域（默认 us-east-1）
   - 点击"添加账号"

#### 使用 API

```bash
curl https://ai-api-proxy.2358314123.workers.dev/admin/accounts/kiro \
  -H "Authorization: Bearer your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "region": "us-east-1",
    "ssoToken": "eyJ... 你的token"
  }'
```

### 步骤 5: 使用 Kiro API

**流式对话：**

```bash
curl https://ai-api-proxy.2358314123.workers.dev/kiro/api/v1/streaming-conversations \
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
  'https://ai-api-proxy.2358314123.workers.dev/kiro/api/v1/streaming-conversations',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationState: {
        currentMessage: {
          userInputMessage: {
            content: 'Create a React component for a todo list'
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

---

## 📊 完整功能清单

### 当前服务支持的所有 API

| 服务商 | 端点前缀 | 示例 | 状态 |
|--------|---------|------|------|
| **OpenAI** | `/v1/*` | `/v1/chat/completions` | ✅ |
| **Anthropic** | `/anthropic/*` | `/anthropic/v1/messages` | ✅ |
| **Google Gemini** | `/gemini/*` | `/gemini/v1beta/models` | ✅ |
| **Kiro (Amazon Q)** | `/kiro/*` | `/kiro/api/v1/streaming-conversations` | ✅ 新增 |

### Kiro 可用端点

| 端点 | 功能 | 方法 |
|------|------|------|
| `/kiro/api/v1/streaming-conversations` | 流式对话 | POST |
| `/kiro/api/v1/conversations` | 对话列表 | GET |
| `/kiro/api/v1/generate-plan` | 生成计划 | POST |
| `/kiro/api/v1/generate-code-snippet` | 生成代码片段 | POST |
| `/kiro/api/v1/user-context` | 用户上下文 | GET |
| `/kiro/api/v1/models` | 可用模型 | GET |

---

## 🔄 版本对比

| 功能 | 基础版 | 增强版 | Kiro 版 |
|------|--------|--------|---------|
| OpenAI 代理 | ✅ | ✅ | ✅ |
| Anthropic 代理 | ✅ | ✅ | ✅ |
| Gemini 代理 | ✅ | ✅ | ✅ |
| **Kiro 代理** | ❌ | ❌ | ✅ 新增 |
| 多账号管理 | ❌ | ✅ | ✅ |
| Token 自动刷新 | ❌ | ✅ | ✅ 增强 |
| 负载均衡 | ❌ | ✅ | ✅ |
| 使用统计 | ❌ | ✅ | ✅ 增强 |
| Web 管理界面 | ❌ | ✅ | ✅ 优化 |
| **Kiro 特性** | ❌ | ❌ | ✅ 专属 |

---

## 🎯 Kiro 特色功能

### 1. 三种认证方式

**SSO Token（最简单）**
- 从 IDE 配置文件直接获取
- 适合快速测试

**OIDC（推荐）**
- 支持自动刷新
- 长期稳定使用

**Bearer Token**
- 灵活方便
- 适合已有 Token 的场景

### 2. 智能负载均衡

```
请求 → 选择账号（LRU）→ 检查过期 → 自动刷新？
                                    ↓
                              发送请求
                                    ↓
                         401/403? → 切换账号 → 重试
                                    ↓
                              返回响应
```

### 3. 使用量监控

- 📊 实时跟踪每个账号的使用量
- 📈 可视化进度条显示配额百分比
- 🔄 接近限制时自动切换账号
- 📅 每月自动重置计数

### 4. 自动故障转移

- 账号 Token 过期 → 自动刷新或切换
- API 返回错误 → 切换到下一个账号
- 配额用尽 → 使用其他账号

---

## 📚 使用场景

### 场景 1: 在 VS Code 扩展中使用

```javascript
// 替换原始 Kiro API 端点
const kiroApiBase = 'https://ai-api-proxy.2358314123.workers.dev/kiro';

async function chatWithKiro(message) {
  const response = await fetch(`${kiroApiBase}/api/v1/streaming-conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationState: {
        currentMessage: {
          userInputMessage: { content: message }
        },
        chatTriggerType: 'MANUAL'
      }
    })
  });
  
  return response.body;
}
```

### 场景 2: 多服务统一接入

```javascript
// 同时使用 OpenAI、Claude、Gemini 和 Kiro
const API_BASE = 'https://ai-api-proxy.2358314123.workers.dev';

// OpenAI
const openaiResponse = await fetch(`${API_BASE}/v1/chat/completions`, {
  method: 'POST',
  body: JSON.stringify({ model: 'gpt-4', messages: [...] })
});

// Claude
const claudeResponse = await fetch(`${API_BASE}/anthropic/v1/messages`, {
  method: 'POST',
  body: JSON.stringify({ model: 'claude-3-opus', messages: [...] })
});

// Kiro
const kiroResponse = await fetch(`${API_BASE}/kiro/api/v1/streaming-conversations`, {
  method: 'POST',
  body: JSON.stringify({ conversationState: {...} })
});
```

### 场景 3: 团队共享 Kiro 账号

```
团队成员 A、B、C → 统一代理端点
                       ↓
                  Worker 负载均衡
                       ↓
              Kiro 账号 1、2、3
                       ↓
                  自动选择最优账号
```

---

## ⚠️ 重要提示

### Token 安全

1. **不要泄露 Token**
   - SSO Token 和 Access Token 是敏感信息
   - 管理员密钥妥善保管

2. **定期更新**
   - SSO Token 有效期 8-12 小时
   - 使用 OIDC 认证可自动刷新

3. **监控使用**
   - 定期检查账号状态
   - 关注异常使用情况

### 配额管理

1. **Kiro 免费配额**
   - 每月有一定的免费使用额度
   - 超出后可能被限流或收费

2. **多账号策略**
   - 添加多个账号分散负载
   - 避免单账号过载

3. **使用监控**
   - 在管理界面查看实时使用量
   - 设置合理的配额限制

---

## 🔧 故障排查

### 问题 1: Token 无效

**症状：** 返回 401 Unauthorized

**解决：**
1. 检查 Token 是否正确复制
2. 确认 Token 未过期
3. 尝试手动刷新 Token
4. 重新从 IDE 获取新的 Token

### 问题 2: 找不到配置文件

**症状：** 无法找到 `token_cache.json`

**解决：**
1. 确认已在 IDE 中登录 Amazon Q
2. 检查路径是否正确（不同 IDE 路径不同）
3. 搜索文件：`token_cache.json`
4. 使用 Kiro-account-manager 导出

### 问题 3: API 请求失败

**症状：** 请求超时或返回错误

**解决：**
1. 检查 Worker 是否正常运行
2. 确认 AWS 区域选择正确
3. 查看 Worker 日志
4. 测试账号是否有效

---

## 📖 相关文档

- **完整指南：** `KIRO_GUIDE.md`
- **基础版文档：** `CLOUDFLARE_GUIDE.md`
- **增强版文档：** `ENHANCED_GUIDE.md`
- **项目总结：** `PROJECT_SUMMARY.md`

---

## 🎊 恭喜！

你现在拥有一个支持 **四大 AI 服务** 的统一代理平台：

✅ **OpenAI** (GPT-4, GPT-3.5)
✅ **Anthropic** (Claude 3)
✅ **Google Gemini** (Gemini Pro)
✅ **Amazon Q** (Kiro) ⭐ 新增

**所有功能：**
- ✅ 多账号管理
- ✅ Token 自动刷新
- ✅ 负载均衡
- ✅ 使用统计
- ✅ Web 管理界面
- ✅ 完全免费

**GitHub 仓库：** https://github.com/WHUT666/ai-api-proxy
**当前服务：** https://ai-api-proxy.2358314123.workers.dev

---

**有任何问题或需要帮助，随时告诉我！** 🚀
