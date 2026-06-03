# Kiro API 代理 - 快速命令参考

## 🚀 常用命令

### 部署与管理
```bash
# 部署到 Cloudflare Workers
npx wrangler deploy

# 查看实时日志
npx wrangler tail

# 查看部署信息
npx wrangler deployments list
```

### 账号管理（使用 ops.js）
```bash
# 查看账号池状态
node ops.js status

# 刷新所有过期账号
node ops.js refresh

# 重置账号状态（清除冷却/封禁）
node ops.js reset

# 测试 API
node ops.js test

# 健康检查
node ops.js health
```

### 批量操作
```bash
# 导入本地账号（从 accounts_part7.json）
node import-local-accounts.js

# 批量刷新所有账号 Token
node refresh-accounts.js

# 测试智能账号池功能
node test-smart-pooling.js
```

## 📡 API 端点

### 主要接口
- **聊天接口**: `POST /kiro/v1/chat/completions`
- **健康检查**: `GET /health`
- **账号列表**: `GET /admin/accounts`
- **刷新 Token**: `POST /admin/accounts/{id}/refresh`

### 快速测试
```bash
# 发送聊天请求
curl https://ai-api-proxy.2358314123.workers.dev/kiro/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4.5",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'

# 健康检查
curl https://ai-api-proxy.2358314123.workers.dev/health

# 查看账号（需要管理员密钥）
curl https://ai-api-proxy.2358314123.workers.dev/admin/accounts \
  -H "Authorization: Bearer kiro-admin-2024"
```

## ⚙️ 配置

### 环境变量
- `ADMIN_KEY`: `kiro-admin-2024`
- `ACCOUNTS`: KV namespace `13176d9f897a43afa96f825f58b175f7`
- `STATS`: KV namespace `f4982dcf15f94f8fa035eef1b8bb94f7`

### 账号池配置（worker-kiro.js）
```javascript
const ACCOUNT_POOL_CONFIG = {
  baseCooldownMs: 60000,          // 60s 基础冷却
  maxBackoffMultiplier: 1440,     // 最大 1440 倍 = 24h
  quotaResetMs: 3600000,          // 1h 配额重置
  probabilisticRetryChance: 0.1   // 10% 概率重试
};
```

## 🔍 故障排查

### 问题：所有账号不可用
```bash
# 1. 检查账号状态
node ops.js status

# 2. 重置所有账号
node ops.js reset

# 3. 刷新 Token
node ops.js refresh

# 4. 测试 API
node ops.js test
```

### 问题：Token 过期
```bash
# 刷新所有过期账号
node ops.js refresh

# 或手动刷新特定账号
curl -X POST https://ai-api-proxy.2358314123.workers.dev/admin/accounts/{id}/refresh \
  -H "Authorization: Bearer kiro-admin-2024"
```

### 问题：账号被封禁
```bash
# 查看被封禁的账号
node ops.js status | grep SUSPENDED

# 重置所有账号状态
node ops.js reset
```

### 问题：配额耗尽
```bash
# 查看配额状态
node ops.js status | grep QUOTA

# 等待 1 小时自动重置，或手动重置
node ops.js reset
```

## 📊 监控指标

### 关键指标
- **可用账号数**: 应保持 > 5
- **失败率**: 应 < 20%
- **Token 有效期**: 应提前 30 分钟刷新
- **冷却账号数**: 应 < 10%

### 每日检查清单
- [ ] 运行 `node ops.js status` 检查账号状态
- [ ] 确认可用账号 > 5 个
- [ ] 检查是否有被封禁账号
- [ ] 运行 `node ops.js test` 测试 API

### 每周维护
- [ ] 运行 `node ops.js refresh` 刷新过期 Token
- [ ] 清理无效账号
- [ ] 检查日志中的异常模式

## 🐛 调试技巧

### 查看实时日志
```bash
# 实时日志（包含账号切换信息）
npx wrangler tail

# 过滤特定关键词
npx wrangler tail | grep "AccountPool"
```

### 测试特定功能
```bash
# 测试智能池
node test-smart-pooling.js

# 测试双账号切换
node test-two-accounts.js
```

### 检查 KV 存储
```bash
# 列出所有账号 Key
npx wrangler kv:key list --binding=ACCOUNTS

# 查看特定账号
npx wrangler kv:key get {account-id} --binding=ACCOUNTS
```

## 📞 紧急响应

### 服务完全不可用
1. 检查 Cloudflare Workers 状态
2. 运行 `node ops.js health`
3. 运行 `node ops.js reset` 重置所有账号
4. 重新部署：`npx wrangler deploy`

### 账号全部失效
1. 检查本地是否有备份账号数据
2. 运行 `node import-local-accounts.js` 重新导入
3. 运行 `node ops.js refresh` 刷新 Token

### 需要回滚
1. 查看部署历史：`npx wrangler deployments list`
2. 回滚到上一版本：`npx wrangler rollback {version-id}`
3. 或使用备份：`cp worker-kiro.js.backup worker-kiro.js && npx wrangler deploy`

## 🔗 快速链接

- **API 地址**: https://ai-api-proxy.2358314123.workers.dev
- **健康检查**: https://ai-api-proxy.2358314123.workers.dev/health
- **GitHub 参考**: https://github.com/chaogei/Kiro-account-manager
- **Cloudflare Dashboard**: https://dash.cloudflare.com/

## 📝 版本信息

- **当前版本**: `bfc4b03d-3ce1-417c-b2fa-55c69d45d6a0`
- **部署时间**: 2026-06-03
- **功能状态**: ✅ 全部正常
- **账号数量**: 41 (40 可用)

---

**提示**: 将此文件保存在手边，以便快速查阅常用命令！
