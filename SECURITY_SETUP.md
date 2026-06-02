# 安全配置指南

本文档说明如何配置 AI API 代理服务的安全设置。

## 已实施的安全措施

### 1. 管理后台密码保护

**admin-kiro.html** 现在包含以下安全功能：

- ✅ 访问时需要输入管理员密码
- ✅ 密码存储在浏览器 localStorage（首次访问后记住）
- ✅ 通过验证 API 调用来确认密码正确性
- ✅ 提供"退出登录"功能清除保存的密码

**使用方法：**
1. 首次访问管理后台时，会提示输入密码
2. 输入的密码必须与 Worker 的 `ADMIN_KEY` 环境变量一致
3. 如果密码错误，系统会拒绝访问并要求重新输入

### 2. API 端点访问控制

**worker-kiro.js** 的改进：

- ✅ 管理接口 (`/admin/*`) 需要 Bearer Token 认证
- ✅ 移除了默认密码，必须设置环境变量 `ADMIN_KEY`
- ✅ 如果未设置 `ADMIN_KEY`，管理接口将完全禁用
- ✅ 无效的 API 端点返回 404 错误

### 3. Kiro API 安全

- ✅ Token 和密钥不会在 API 响应中暴露
- ✅ 账号列表接口会过滤敏感信息（ssoToken, accessToken 等）
- ✅ 支持自动 Token 刷新机制

## 配置步骤

### 步骤 1: 设置强密码

编辑 `wrangler.toml` 文件，修改 `ADMIN_KEY`：

```toml
[vars]
ADMIN_KEY = "your-strong-password-here"
```

**建议使用强密码：**
- 至少 16 个字符
- 包含大小写字母、数字和特殊字符
- 示例：`Kir0@Adm1n#2024$Secur3!`

### 步骤 2: 部署到 Cloudflare Workers

```bash
# 部署 Worker
npx wrangler deploy

# 或使用 npm 脚本（如果已配置）
npm run deploy
```

### 步骤 3: 部署管理后台

将 `admin-kiro.html` 部署到 Cloudflare Pages：

```bash
# 如果使用 wrangler pages
npx wrangler pages deploy public --project-name=ai-api-admin
```

或者手动上传到 Cloudflare Pages Dashboard。

### 步骤 4: 使用 Cloudflare Access（可选，推荐）

为了更强的安全性，可以使用 Cloudflare Access 保护管理后台：

1. 登录 Cloudflare Dashboard
2. 进入 Access > Applications
3. 点击 "Add an Application"
4. 选择 "Self-hosted"
5. 配置：
   - **Application name**: AI API Admin
   - **Session Duration**: 24 hours
   - **Application domain**: 你的 Pages 域名
   - **Path**: `/admin-kiro.html`
6. 设置访问策略：
   - 允许特定邮箱地址
   - 或使用 One-Time PIN
   - 或集成 GitHub/Google 等 OAuth

### 步骤 5: 配置环境变量（生产环境）

在 Cloudflare Workers Dashboard 中设置环境变量：

1. 进入 Workers & Pages
2. 选择你的 Worker
3. 进入 Settings > Variables
4. 添加环境变量：
   - **Name**: `ADMIN_KEY`
   - **Value**: 你的强密码
   - **Type**: Secret（推荐，加密存储）

## 安全最佳实践

### 1. 定期更换密码

建议每 3-6 个月更换一次 `ADMIN_KEY`：

```bash
# 更新 wrangler.toml
# 然后重新部署
npx wrangler deploy
```

### 2. 监控访问日志

在 Cloudflare Dashboard 中检查：
- Workers Analytics > Requests
- Security Events（如果使用 Cloudflare Access）

### 3. IP 白名单（可选）

在 Worker 中添加 IP 限制：

```javascript
// 在 handleAdminRequest 函数开头添加
const clientIP = request.headers.get('CF-Connecting-IP');
const allowedIPs = ['your.ip.address.here'];

if (!allowedIPs.includes(clientIP)) {
  return jsonResponse({ error: 'Access denied from this IP' }, 403);
}
```

### 4. 使用 Secret 而非 Plain Text

在生产环境中，使用 Cloudflare Secret 存储敏感信息：

```bash
# 设置 secret（不会出现在代码中）
npx wrangler secret put ADMIN_KEY
# 然后输入密码
```

修改 `wrangler.toml`，移除明文密码：

```toml
# 删除或注释掉
# [vars]
# ADMIN_KEY = "..."
```

### 5. 限流保护

考虑添加访问频率限制：

```javascript
// 使用 Cloudflare KV 存储访问计数
const rateLimitKey = `ratelimit:${clientIP}`;
const count = await env.STATS.get(rateLimitKey);

if (count && parseInt(count) > 100) {
  return jsonResponse({ error: 'Rate limit exceeded' }, 429);
}
```

## 验证安全配置

### 测试 1: 未认证访问应被拒绝

```bash
curl https://your-worker.workers.dev/admin/accounts
# 应返回 401 Unauthorized
```

### 测试 2: 错误密码应被拒绝

```bash
curl -H "Authorization: Bearer wrong-password" \
  https://your-worker.workers.dev/admin/accounts
# 应返回 401 Unauthorized
```

### 测试 3: 正确密码应成功

```bash
curl -H "Authorization: Bearer your-strong-password-here" \
  https://your-worker.workers.dev/admin/accounts
# 应返回账号列表
```

### 测试 4: 管理后台密码验证

1. 访问 `https://your-pages.pages.dev/admin-kiro.html`
2. 应看到密码提示框
3. 输入错误密码应被拒绝
4. 输入正确密码应能访问

## 应急响应

### 如果密码泄露：

1. **立即更换密码**
   ```bash
   npx wrangler secret put ADMIN_KEY
   npx wrangler deploy
   ```

2. **检查访问日志**
   - Cloudflare Dashboard > Workers > Analytics

3. **删除可疑账号**
   ```bash
   curl -X DELETE \
     -H "Authorization: Bearer new-password" \
     https://your-worker.workers.dev/admin/accounts/SUSPICIOUS_ID
   ```

4. **清空所有客户端缓存**
   - 通知用户清除浏览器 localStorage
   - 或者添加版本检查强制重新登录

## 常见问题

**Q: 忘记了管理员密码怎么办？**

A: 在 Cloudflare Workers Dashboard 中查看或重置 `ADMIN_KEY` 环境变量。

**Q: 可以设置多个管理员吗？**

A: 当前版本只支持单一密钥。如需多用户，建议使用 Cloudflare Access。

**Q: 管理后台可以完全禁用吗？**

A: 可以。删除 `wrangler.toml` 中的 `ADMIN_KEY` 配置，管理接口将返回 503 错误。

**Q: Kiro API 端点需要认证吗？**

A: 当前 Kiro API (`/kiro/api/v1/*`) 不需要额外认证，使用存储的账号凭证。如需保护，可以添加自定义 API Key。

## 进一步增强

如需更强的安全性，可考虑：

1. **实施 JWT 认证**
2. **添加审计日志**
3. **集成 Cloudflare Zero Trust**
4. **使用 API Gateway（如 Kong、Tyk）**
5. **实施 mTLS（双向 TLS）**

## 支持

如有安全问题或发现漏洞，请：
1. 不要公开披露
2. 通过私密渠道联系项目维护者
3. 提供详细的复现步骤
