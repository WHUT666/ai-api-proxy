# AI API 代理 - 增强版部署指南

## 🎯 新增功能

相比基础版，增强版新增：

### ✨ 核心功能
- **多账号管理**：支持添加、编辑、删除多个 AI 服务账号
- **Token 自动刷新**：检测 Token 过期并自动刷新（需配置 Refresh Token）
- **负载均衡**：自动选择最少使用的账号，避免单账号过载
- **账号轮询**：多个账号之间智能轮询，提高可用性
- **使用统计**：记录每个账号的请求次数、成功率等
- **Web 管理界面**：可视化管理所有账号和配置

### 🔐 安全功能
- **管理员认证**：所有管理接口需要管理员密钥
- **敏感信息保护**：API 返回时自动隐藏 Token 等敏感信息
- **账号状态管理**：可随时启用/禁用账号

## 📦 部署步骤

### 1. 创建 Cloudflare KV 命名空间

在 Cloudflare Dashboard 中：

1. 进入 **Workers & Pages** → **KV**
2. 点击 **Create a namespace**
3. 创建两个命名空间：
   - `ACCOUNTS` - 存储账号信息
   - `STATS` - 存储统计数据

### 2. 绑定 KV 到 Worker

编辑 `wrangler.toml`：

```toml
name = "ai-api-proxy-enhanced"
main = "worker-enhanced.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "ACCOUNTS"
id = "your-accounts-namespace-id"  # 替换为实际 ID

[[kv_namespaces]]
binding = "STATS"
id = "your-stats-namespace-id"     # 替换为实际 ID

[env.production]
name = "ai-api-proxy-enhanced"

# 环境变量
[env.production.vars]
ADMIN_KEY = "your-secure-admin-key-here"  # 设置管理员密钥
```

### 3. 部署 Worker

有两种部署方式：

#### 方式 A：通过 Dashboard（推荐）

1. 访问 Cloudflare Dashboard
2. 进入之前创建的 Worker：`ai-api-proxy`
3. 点击 **Edit code**
4. 删除旧代码，粘贴 `worker-enhanced.js` 的内容
5. 点击 **Settings** → **Variables**
6. 添加环境变量：
   - `ADMIN_KEY` = `your-secure-admin-key`（自己设置一个安全的密钥）
7. 点击 **Settings** → **Bindings**
8. 添加 KV 绑定：
   - 变量名：`ACCOUNTS`，选择对应的 KV 命名空间
   - 变量名：`STATS`，选择对应的 KV 命名空间
9. 点击 **Save and Deploy**

#### 方式 B：通过命令行

```bash
# 编辑 wrangler.toml，填入 KV 命名空间 ID 和管理员密钥
nano wrangler.toml

# 部署
wrangler deploy
```

### 4. 部署管理界面

管理界面是一个静态 HTML 文件，有三种部署方式：

#### 方式 1：直接打开本地文件（测试用）

```bash
# 直接在浏览器中打开
start admin.html  # Windows
open admin.html   # macOS
```

#### 方式 2：部署到 Cloudflare Pages

```bash
# 创建一个简单的项目目录
mkdir admin-panel
cp admin.html admin-panel/index.html

# 使用 Wrangler 部署到 Pages
cd admin-panel
wrangler pages deploy . --project-name=ai-proxy-admin
```

#### 方式 3：集成到 Worker 中

修改 `worker-enhanced.js`，添加以下代码：

```javascript
// 在 fetch 函数开头添加
if (path === '/admin' || path === '/admin/') {
  // 返回管理界面 HTML
  return new Response(ADMIN_HTML, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// 在文件末尾添加 HTML 内容
const ADMIN_HTML = `
<!-- 这里粘贴 admin.html 的全部内容 -->
`;
```

## 🔧 配置管理界面

1. 打开管理界面：`https://your-worker.workers.dev/admin`（如果集成到 Worker）
2. 点击 **设置** 标签
3. 填写：
   - **管理员密钥**：与 Worker 环境变量中的 `ADMIN_KEY` 一致
   - **Worker 地址**：你的 Worker 地址，如 `https://ai-api-proxy.2358314123.workers.dev`
4. 点击 **保存设置**

## 📝 使用指南

### 1. 添加账号

在管理界面中：

1. 点击 **添加账号** 标签
2. 填写账号信息：
   - **服务商**：选择 OpenAI/Anthropic/Gemini
   - **邮箱**：账号邮箱（用于识别）
   - **Access Token**：当前有效的 API Token
   - **Refresh Token**（可选）：用于自动刷新
   - **启用**：勾选以启用此账号
3. 点击 **添加账号**

### 2. 查看统计

**仪表盘**标签显示：
- 总账号数
- 活跃账号数
- 总请求数
- 成功率

**账号管理**标签显示每个账号的：
- 状态（启用/禁用）
- 服务商
- 最后使用时间
- 操作按钮

### 3. 使用 API

所有 API 请求保持不变，Worker 会自动：

1. 选择可用账号
2. 检查 Token 是否过期
3. 如果即将过期（5分钟内），自动刷新
4. 将请求转发到目标 API
5. 记录使用统计

**示例：**

```bash
# OpenAI API（自动使用账号池中的 OpenAI 账号）
curl https://ai-api-proxy.2358314123.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello"}]
  }'

# Anthropic API（自动使用账号池中的 Anthropic 账号）
curl https://ai-api-proxy.2358314123.workers.dev/anthropic/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## 🔌 管理 API 接口

所有管理接口都需要在请求头中包含管理员密钥：

```bash
Authorization: Bearer your-admin-key
```

### 可用接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/accounts` | 列出所有账号 |
| POST | `/admin/accounts` | 添加新账号 |
| PUT | `/admin/accounts/:id` | 更新账号信息 |
| DELETE | `/admin/accounts/:id` | 删除账号 |
| GET | `/admin/stats` | 获取统计信息 |
| POST | `/admin/refresh/:id` | 手动刷新 Token |

### 示例：通过 API 添加账号

```bash
curl https://your-worker.workers.dev/admin/accounts \
  -H "Authorization: Bearer your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "email": "test@example.com",
    "accessToken": "sk-...",
    "refreshToken": "...",
    "enabled": true
  }'
```

## 📊 数据结构

### Account（账号）

```typescript
{
  id: string;              // 唯一ID
  email: string;           // 邮箱
  provider: string;        // 'openai' | 'anthropic' | 'gemini'
  accessToken: string;     // 访问令牌
  refreshToken?: string;   // 刷新令牌（可选）
  expiresAt?: number;      // 过期时间戳（可选）
  enabled: boolean;        // 是否启用
  lastUsed?: number;       // 最后使用时间
  createdAt: number;       // 创建时间
}
```

### AccountStats（统计）

```typescript
{
  totalRequests: number;      // 总请求数
  successRequests: number;    // 成功请求数
  failedRequests: number;     // 失败请求数
  lastError?: string;         // 最后错误信息
}
```

## ⚠️ 注意事项

### 1. Token 刷新功能

当前版本的 Token 刷新功能是**示例实现**，需要根据具体 AI 服务商的刷新 API 进行适配：

- **OpenAI**：需要 OAuth 刷新端点
- **Anthropic**：API Key 通常不需要刷新
- **Gemini**：需要 Google OAuth 刷新流程

**建议**：在生产环境中，完善 `refreshAccountToken` 函数的实现。

### 2. 安全建议

- ✅ 使用强密码作为 `ADMIN_KEY`
- ✅ 定期更换管理员密钥
- ✅ 限制管理界面访问（可使用 Cloudflare Access）
- ✅ 不要在公共场所访问管理界面
- ✅ 定期检查账号使用情况

### 3. KV 存储限制

Cloudflare KV 免费版限制：
- 每天 100,000 次读取
- 每天 1,000 次写入
- 1 GB 存储空间

对于个人使用完全足够。如果超出限制，考虑升级到付费版。

### 4. 性能优化

- KV 读取有一定延迟（通常 <50ms）
- 建议在 Worker 中添加内存缓存
- 频繁访问的账号数据可以缓存 5-10 分钟

## 🔄 从基础版升级

如果你已经部署了基础版（`worker.js`），升级到增强版：

1. **保留基础版 Worker**（作为备份）
2. **创建新的 Worker** 或直接替换代码
3. **创建 KV 命名空间**并绑定
4. **设置管理员密钥**
5. **通过管理界面添加账号**
6. **测试功能**正常后，更新客户端配置

## 🆚 功能对比

| 功能 | 基础版 | 增强版 |
|------|--------|--------|
| API 反向代理 | ✅ | ✅ |
| 多服务支持 | ✅ | ✅ |
| CORS 支持 | ✅ | ✅ |
| 多账号管理 | ❌ | ✅ |
| Token 自动刷新 | ❌ | ✅ |
| 负载均衡 | ❌ | ✅ |
| 使用统计 | ❌ | ✅ |
| Web 管理界面 | ❌ | ✅ |
| 账号状态管理 | ❌ | ✅ |

## 🐛 故障排查

### 问题：管理界面无法连接

**检查：**
1. Worker 地址是否正确
2. 管理员密钥是否匹配
3. Worker 是否正常运行
4. 浏览器控制台是否有错误

### 问题：账号添加失败

**检查：**
1. KV 命名空间是否正确绑定
2. 管理员密钥是否有效
3. Token 格式是否正确

### 问题：API 请求失败

**检查：**
1. 是否有启用的账号
2. 账号 Token 是否有效
3. 查看 Worker 日志（Dashboard → Logs）

## 📚 相关链接

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare KV 文档](https://developers.cloudflare.com/kv/)
- [OpenAI API 文档](https://platform.openai.com/docs)
- [Anthropic API 文档](https://docs.anthropic.com/)
- [Google Gemini API 文档](https://ai.google.dev/docs)

---

**祝你使用愉快！如有问题，请查看项目 GitHub 仓库的 Issues。** 🚀
