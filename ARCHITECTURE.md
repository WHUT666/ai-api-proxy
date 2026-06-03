# Kiro API 代理 - 架构设计文档

## 📐 系统架构

### 整体架构
```
┌─────────────────────────────────────────────────────────────┐
│                         客户端                                │
│              (OpenAI SDK / curl / 任何 HTTP 客户端)          │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         │ POST /kiro/v1/chat/completions
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare Workers (Edge Runtime)               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Request Handler & Format Converter          │  │
│  │         (OpenAI format → Kiro format)                 │  │
│  └──────────────────────┬────────────────────────────────┘  │
│                         │                                    │
│  ┌──────────────────────▼────────────────────────────────┐  │
│  │            Smart Account Pool Manager                 │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ - Circuit Breaker (断路器)                      │  │  │
│  │  │ - Exponential Backoff (指数退避)                │  │  │
│  │  │ - Probabilistic Retry (概率重试)                │  │  │
│  │  │ - Auto Token Refresh (自动刷新)                 │  │  │
│  │  │ - Account Suspension (账号封禁)                 │  │  │
│  │  │ - Load Balancing (负载均衡)                     │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └──────────────────────┬────────────────────────────────┘  │
│                         │                                    │
│  ┌──────────────────────▼────────────────────────────────┐  │
│  │              KV Storage (账号数据库)                  │  │
│  │  - ACCOUNTS: 41 个账号数据                            │  │
│  │  - STATS: 统计数据                                    │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         │ POST /generateAssistantResponse
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          AWS CodeWhisperer API (Kiro Backend)                │
│          https://codewhisperer.us-east-1.amazonaws.com       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 核心模块

### 1. 账号池管理器 (Account Pool Manager)

#### 数据结构
```javascript
ProxyAccount {
  id: string                    // 唯一标识
  email: string                 // 账号邮箱
  provider: 'kiro'              // 提供商
  authMethod: 'oidc' | 'social' // 认证方式
  
  // Token 信息
  accessToken: string           // 访问令牌
  refreshToken: string          // 刷新令牌
  idToken?: string              // ID 令牌（OIDC）
  expiresAt: number             // 过期时间戳
  
  // OIDC 凭证
  clientId: string              // 客户端 ID
  clientSecret: string          // 客户端密钥
  
  // 状态管理
  enabled: boolean              // 是否启用
  lastUsed: number              // 最后使用时间
  errorCount: number            // 连续失败次数
  
  // 配额管理
  quotaUsed?: number            // 已使用配额
  quotaLimit?: number           // 配额上限
  quotaResetAt?: number         // 配额重置时间
  quotaExhaustedAt?: number     // 配额耗尽时间
  
  // 封禁管理
  suspendedAt?: number          // 封禁时间
  suspendReason?: string        // 封禁原因
  suspendMessage?: string       // 封禁消息
  
  // 其他
  region: 'us-east-1'           // AWS 区域
  profileArn: string            // AWS Profile ARN
}
```

#### 账号选择算法
```javascript
function selectAccount(excludeIds = new Set()) {
  // 1. 过滤可用账号
  candidates = accounts.filter(account => {
    // 跳过排除的账号
    if (excludeIds.has(account.id)) return false;
    
    // 检查封禁状态
    if (isSuspended(account)) return false;
    
    // 检查配额
    if (isQuotaExhausted(account)) return false;
    
    // 检查 Token 有效性
    if (isTokenExpired(account)) return false;
    
    // 检查断路器状态（指数退避）
    if (!isCircuitClosed(account)) return false;
    
    return true;
  });
  
  // 2. 优先级排序
  candidates.sort((a, b) => {
    // 优先级 1: 有 expiresAt 且未过期
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // 优先级 2: 最少使用（负载均衡）
    return (a.lastUsed || 0) - (b.lastUsed || 0);
  });
  
  // 3. 返回最佳账号
  return candidates[0] || null;
}
```

#### 断路器机制
```javascript
// 状态转换图:
//
//   [CLOSED] ──失败──> [OPEN] ──时间到期──> [HALF-OPEN]
//       ▲                                      │
//       └──────────────成功────────────────────┘

function isCircuitClosed(account) {
  const failures = account.errorCount || 0;
  
  if (failures === 0) return true; // CLOSED
  
  const timeSinceFailure = Date.now() - account.lastUsed;
  
  // 计算退避时间: 60s * 2^(failures-1)
  const backoff = 60000 * Math.pow(2, failures - 1);
  const maxBackoff = 60000 * 1440; // 24 小时
  const cooldown = Math.min(backoff, maxBackoff);
  
  if (timeSinceFailure < cooldown) {
    // OPEN 状态，10% 概率尝试（概率重试）
    return Math.random() < 0.1; // HALF-OPEN
  }
  
  return true; // 冷却期已过，允许重试
}
```

### 2. 错误分类系统

```javascript
ErrorType {
  FATAL: 'fatal',           // 请求本身有问题
  RECOVERABLE: 'recoverable' // 账号问题，可切换
}

function classifyError(statusCode, reason) {
  // 认证/权限错误 → 可恢复（切换账号）
  if ([401, 403].includes(statusCode)) {
    return ErrorType.RECOVERABLE;
  }
  
  // 配额/限流错误 → 可恢复（切换账号）
  if ([402, 429].includes(statusCode)) {
    return ErrorType.RECOVERABLE;
  }
  
  // 请求格式错误 → 致命（不切换）
  if ([400, 422].includes(statusCode)) {
    return ErrorType.FATAL;
  }
  
  // 服务器错误 → 致命（不切换）
  if (statusCode >= 500) {
    return ErrorType.FATAL;
  }
  
  return ErrorType.FATAL;
}
```

### 3. 自动重试机制

```javascript
async function handleRequestWithRetry(request, env) {
  const maxRetries = 3;
  const triedAccounts = new Set();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // 获取可用账号（排除已尝试的）
    const account = await getAvailableAccount(env, 'kiro', triedAccounts);
    
    if (!account) {
      return errorResponse('No available accounts', 503);
    }
    
    triedAccounts.add(account.id);
    
    // 发送请求
    const response = await sendKiroRequest(account, request);
    const statusCode = response.status;
    
    // 记录结果
    await recordRequest(env, account.id, response.ok, null, statusCode);
    
    // 检查错误类型
    const errorType = classifyError(statusCode);
    
    if (response.ok) {
      // 成功：重置断路器，返回响应
      await recordSuccess(env, account.id);
      return response;
    }
    
    if (errorType === ErrorType.FATAL) {
      // 致命错误：直接返回，不重试
      return response;
    }
    
    // RECOVERABLE 错误：继续重试下一个账号
    console.log(`[Retry] Attempt ${attempt} failed, trying next account...`);
  }
  
  return errorResponse('All retry attempts failed', 503);
}
```

### 4. Token 自动刷新

```javascript
async function refreshTokenIfNeeded(env, account) {
  const now = Date.now();
  const expiresIn = account.expiresAt - now;
  
  // 如果 Token 在 30 分钟内过期，自动刷新
  if (expiresIn < 30 * 60 * 1000) {
    console.log(`[TokenRefresh] Auto-refreshing for ${account.email}`);
    
    try {
      if (account.authMethod === 'oidc') {
        // OIDC 刷新（BuilderId）
        const response = await fetch(
          `https://oidc.${account.region}.amazonaws.com/token`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId: account.clientId,
              clientSecret: account.clientSecret,
              refreshToken: account.refreshToken,
              grantType: 'refresh_token'
            })
          }
        );
        
        const data = await response.json();
        
        // 更新账号
        await updateAccount(env, account.id, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || account.refreshToken,
          idToken: data.idToken,
          expiresAt: now + (data.expiresIn || 3600) * 1000
        });
        
        return true;
      } else if (account.authMethod === 'social') {
        // Social 刷新（GitHub/Google）
        const response = await fetch(
          'https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              refreshToken: account.refreshToken
            })
          }
        );
        
        const data = await response.json();
        
        await updateAccount(env, account.id, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || account.refreshToken,
          expiresAt: now + (data.expiresIn || 3600) * 1000
        });
        
        return true;
      }
    } catch (error) {
      console.error(`[TokenRefresh] Failed: ${error.message}`);
      return false;
    }
  }
  
  return true; // Token 仍然有效
}
```

---

## 🔐 安全设计

### 1. 认证与授权
- **管理接口**: 使用 Bearer Token (`ADMIN_KEY`)
- **客户端接口**: 无需认证（内部使用）
- **Token 存储**: 加密存储在 KV（Cloudflare 自动加密）

### 2. 数据保护
- **敏感信息脱敏**: 管理接口返回时移除 `accessToken`, `refreshToken`, `clientSecret`
- **HTTPS 强制**: 所有通信使用 TLS 1.3
- **CORS 配置**: 允许所有源（可根据需求限制）

### 3. 防滥用
- **账号封禁**: 连续 5 次认证失败自动封禁
- **指数退避**: 失败账号冷却时间指数增长
- **配额管理**: 追踪和限制每账号使用量

---

## 📊 性能优化

### 1. 边缘计算
- **全球分发**: Cloudflare Workers 部署在 300+ 边缘节点
- **低延迟**: 请求在最近的边缘处理（< 50ms）

### 2. 连接复用
- **HTTP/2**: 使用 HTTP/2 多路复用
- **Keep-Alive**: 保持连接以减少握手开销

### 3. 负载均衡
- **最少使用优先**: 选择最少使用的可用账号
- **故障隔离**: 失败账号自动进入冷却，不影响其他账号

### 4. 缓存策略
- **KV 缓存**: 账号数据缓存在 KV（全球复制）
- **边缘缓存**: 静态响应（健康检查）缓存 5 分钟

---

## 📈 可扩展性

### 1. 水平扩展
- **无状态设计**: Workers 无状态，可无限扩展
- **账号池**: 支持添加无限数量账号
- **多区域**: 支持多个 AWS 区域

### 2. 垂直扩展
- **KV 容量**: 支持 1GB 数据（可升级到无限）
- **请求限制**: 每天 100,000 请求（免费版）→ 无限（付费版）

### 3. 功能扩展
- **多提供商**: 架构支持添加 OpenAI、Anthropic、Google Gemini
- **多租户**: 可扩展为 SaaS 多租户服务
- **插件系统**: 模块化设计便于添加新功能

---

## 🔧 配置管理

### 环境变量
```toml
# wrangler.toml
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

### 账号池配置
```javascript
const ACCOUNT_POOL_CONFIG = {
  baseCooldownMs: 60000,          // 基础冷却时间 60s
  maxBackoffMultiplier: 1440,     // 最大退避倍数（24h）
  quotaResetMs: 3600000,          // 配额重置时间 1h
  probabilisticRetryChance: 0.1   // 概率重试几率 10%
};
```

---

## 🧪 测试策略

### 1. 单元测试
- 账号选择算法
- 错误分类逻辑
- 断路器状态转换
- Token 过期检查

### 2. 集成测试
- OpenAI 格式转换
- Kiro API 调用
- 账号自动切换
- Token 自动刷新

### 3. 端到端测试
- 完整请求流程
- 流式响应
- 并发请求
- 故障恢复

### 4. 负载测试
- 单账号 QPS 限制
- 账号池负载均衡
- 高并发场景
- 故障场景

---

## 📝 监控指标

### 关键指标 (KPI)
1. **可用率**: `(成功请求 / 总请求) * 100%` → 目标 > 99%
2. **响应时间**: P50, P95, P99 → 目标 < 1s
3. **账号可用率**: `(可用账号 / 总账号) * 100%` → 目标 > 80%
4. **Token 刷新成功率**: `(成功刷新 / 总刷新) * 100%` → 目标 > 95%

### 业务指标
1. **总请求数**: 累计请求量
2. **账号使用分布**: 每个账号的使用次数
3. **错误分布**: 各类错误的数量和占比
4. **配额使用率**: 各账号配额消耗情况

---

## 🚀 未来规划

### Phase 1: 稳定性增强（1-2周）
- [ ] 添加详细日志和追踪
- [ ] 实现 Webhook 告警
- [ ] 优化错误处理

### Phase 2: 功能扩展（1-2月）
- [ ] 支持更多 AI 提供商（OpenAI, Anthropic, Gemini）
- [ ] 实现使用配额精确追踪
- [ ] 添加请求缓存层

### Phase 3: 企业特性（3月+）
- [ ] 多租户支持
- [ ] API Key 管理
- [ ] 使用统计仪表板
- [ ] 成本优化建议

---

**文档版本**: v1.0  
**最后更新**: 2026-06-03  
**维护者**: Kiro AI Assistant
