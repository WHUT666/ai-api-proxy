# 🔍 Kiro Account Manager 核心逻辑分析报告

根据对 Kiro Account Manager 仓库的深入分析，我已经提取出了关键的 Token 刷新和 API 格式转换逻辑。

---

## 1. 📡 Token 刷新核心逻辑

### 1.1 OIDC Token 刷新（BuilderId/IdC 账号）

**API 端点：**
```
https://oidc.{region}.amazonaws.com/token
```

**请求格式：**
```typescript
{
  "clientId": "账号的 clientId",
  "clientSecret": "账号的 clientSecret", 
  "refreshToken": "账号的 refreshToken",
  "grantType": "refresh_token"  // 固定值
}
```

**响应格式：**
```typescript
{
  "accessToken": "新的 accessToken",
  "refreshToken": "新的 refreshToken（可能不返回）",
  "expiresIn": 3600  // 秒，Token 有效期
}
```

### 1.2 社交登录 Token 刷新（GitHub/Google 账号）

**API 端点：**
```
https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken
```

**请求格式：**
```typescript
{
  "refreshToken": "账号的 refreshToken"
}
```

**请求头：**
```typescript
{
  "Content-Type": "application/json",
  "User-Agent": "aws-toolkit-vscode/1.2.3 OS/darwin.22.1.0"
}
```

### 1.3 Token 过期检测

**检测逻辑：**
```typescript
// 提前 5 分钟刷新（可配置）
const refreshBeforeMs = 300 * 1000  // 5 分钟
const isExpiringSoon = Date.now() + refreshBeforeMs >= account.expiresAt
```

**自动刷新时机：**
1. API 调用前检查 Token 是否即将过期
2. 返回 403 错误时立即尝试刷新
3. 定期后台检查所有账号状态

---

## 2. 🔄 格式转换核心逻辑

### 2.1 模型 ID 映射

**支持的模型映射：**
```typescript
const MODEL_ID_MAP = {
  // Claude 系列
  'claude-3-5-sonnet': 'claude-sonnet-4.5',
  'claude-3-opus': 'claude-sonnet-4.5',
  'claude-3-sonnet': 'claude-sonnet-4',
  'claude-3-haiku': 'claude-haiku-4.5',
  
  // GPT 系列（映射到 Claude）
  'gpt-4': 'claude-sonnet-4.5',
  'gpt-4o': 'claude-sonnet-4.5',
  'gpt-4-turbo': 'claude-sonnet-4.5',
  'gpt-3.5-turbo': 'claude-sonnet-4.5',
  
  // 默认
  'default': 'claude-sonnet-4.5'
}
```

### 2.2 OpenAI → Kiro 格式转换

**核心转换步骤：**

1. **提取系统提示：**
```typescript
// 合并所有 system 角色的消息
let systemPrompt = ''
for (const msg of request.messages) {
  if (msg.role === 'system') {
    systemPrompt += msg.content + '\n'
  }
}

// 添加时间戳和执行指令
const timestamp = new Date().toISOString()
systemPrompt = `[Context: Current time is ${timestamp}]\n\n${systemPrompt}`
```

2. **构建历史消息：**
```typescript
const history: KiroHistoryMessage[] = []

for (const msg of nonSystemMessages) {
  if (msg.role === 'user') {
    history.push({
      userInputMessage: {
        content: msg.content,
        userInputMessageContext: {
          // 处理图片、文档、工具结果
        }
      }
    })
  } else if (msg.role === 'assistant') {
    history.push({
      assistantResponseMessage: {
        content: msg.content,
        // 处理工具调用
      }
    })
  }
}
```

3. **构建 Kiro Payload：**
```typescript
const payload = {
  conversationState: {
    currentMessage: {
      userInputMessage: {
        content: lastUserMessage,
        userInputMessageContext: {
          appStudioState: { programmingLanguage: { languageName: 'plaintext' } }
        }
      }
    },
    chatTriggerType: 'MANUAL',
    history: history
  },
  profileArn: account.profileArn,
  origin: 'AI_EDITOR',
  modelId: mapModelId(request.model)
}
```

### 2.3 Kiro → OpenAI 格式转换

**响应转换：**
```typescript
function kiroToOpenaiResponse(
  content: string,
  toolUses: KiroToolUse[],
  usage: KiroUsage,
  model: string
): OpenAIChatResponse {
  return {
    id: `chatcmpl-${uuidv4()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: toolUses.length > 0 ? null : content,
        tool_calls: toolUses.map(tu => ({
          id: tu.toolUseId,
          type: 'function',
          function: {
            name: tu.name,
            arguments: JSON.stringify(tu.input)
          }
        }))
      },
      finish_reason: toolUses.length > 0 ? 'tool_calls' : 'stop'
    }],
    usage: {
      prompt_tokens: usage.inputTokens,
      completion_tokens: usage.outputTokens,
      total_tokens: usage.inputTokens + usage.outputTokens
    }
  }
}
```

### 2.4 流式响应处理

**OpenAI 流式 chunk：**
```typescript
function createOpenaiStreamChunk(
  id: string,
  model: string,
  delta: { content?: string; tool_calls?: any[] },
  finishReason: 'stop' | 'tool_calls' | null = null
): OpenAIStreamChunk {
  return {
    id: id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [{
      index: 0,
      delta: delta,
      finish_reason: finishReason
    }]
  }
}
```

---

## 3. 🔑 Kiro API 调用格式

### 3.1 API 端点配置

**支持的端点：**
```typescript
const KIRO_ENDPOINTS = [
  {
    url: 'https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse',
    origin: 'AI_EDITOR',
    amzTarget: 'AmazonCodeWhispererStreamingService.GenerateAssistantResponse'
  },
  {
    url: 'https://q.us-east-1.amazonaws.com/generateAssistantResponse',
    origin: 'AI_EDITOR',
    amzTarget: 'AmazonCodeWhispererStreamingService.GenerateAssistantResponse'
  },
  {
    url: 'https://q.us-east-1.amazonaws.com/SendMessageStreaming',
    origin: 'CLI',
    amzTarget: 'AmazonQDeveloperStreamingService.SendMessage'
  }
]
```

### 3.2 认证请求头

**必需的请求头：**
```typescript
{
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${account.accessToken}`,
  'x-amzn-kiro-agent-mode': 'SPECIFICATION',
  'x-amz-user-agent': 'aws-toolkit-vscode/1.2.3 OS/darwin.22.1.0',
  'user-agent': 'AWS-Toolkit-For-VSCode/3.148.0',
  'amz-sdk-invocation-id': uuidv4(),
  'amz-sdk-request': 'attempt=1; max=3'
}
```

---

## 4. ⚠️ 关键发现和注意事项

### 4.1 Token 刷新失败的常见原因

1. **530 错误** - refreshToken 已过期或无效
2. **401 错误** - clientId/clientSecret 错误
3. **403 错误** - 账号被暂时封禁

### 4.2 账号状态管理

**错误分类：**
```typescript
enum ErrorType {
  FATAL = 'fatal',        // 请求问题，不切换账号
  RECOVERABLE = 'recoverable'  // 账号问题，自动切换
}

// 错误码分类
402 → RECOVERABLE  // 配额问题
403 → RECOVERABLE  // Token 过期
429 → RECOVERABLE  // 限流
400 → FATAL        // 请求格式错误
500+ → FATAL       // 服务器错误
```

**断路器机制：**
```typescript
const DEFAULT_CONFIG = {
  baseCooldownMs: 60000,        // 60s 基础冷却
  maxBackoffMultiplier: 1440,   // 最大 1440 倍 = 24h
  quotaResetMs: 3600000,        // 1h 配额重置
  probabilisticRetryChance: 0.1 // 10% 概率重试
}
```

### 4.3 重要的实现细节

1. **conversationId 稳定化** - 同一会话复用同一个 ID，保持上下文
2. **machineId 绑定** - 每个账号绑定唯一设备ID，防止关联
3. **代理支持** - 账号级代理绑定，实现 IP 分桶
4. **Token 估算** - 使用 tiktoken 精确计算 Token 数量

---

## 5. 🚀 建议的优化方向

### 5.1 立即可以实现的改进

1. **完善 Token 刷新逻辑**
   - 实现 OIDC 和社交登录两种刷新方式
   - 添加提前 5 分钟自动刷新
   - 实现刷新失败重试机制

2. **优化格式转换**
   - 实现完整的 OpenAI → Kiro 转换
   - 支持流式响应的正确处理
   - 添加工具调用的转换

3. **错误处理优化**
   - 实现错误分类（FATAL vs RECOVERABLE）
   - 添加断路器机制
   - 支持多账号自动切换

### 5.2 长期优化方向

1. **账号池管理**
   - Round-robin 和 Sticky 两种策略
   - 会话亲和性（conversation ID → 账号）
   - 智能负载均衡

2. **性能优化**
   - conversationId 缓存复用
   - Token 精确计算
   - 历史消息智能裁剪

---

## 6. 📝 下一步行动

现在我们有了完整的参考实现，可以开始优化你的 Cloudflare Worker 代码了。

**建议的优先级：**

1. **P0 - 修复 Token 刷新**（最紧急）
   - 实现正确的 OIDC 刷新 API 调用
   - 修复 530 错误问题

2. **P1 - 实现格式转换**
   - OpenAI 格式 → Kiro 格式
   - Kiro 响应 → OpenAI 格式
   - 流式响应支持

3. **P2 - 错误处理优化**
   - 错误分类和自动重试
   - 多账号自动切换
   - 断路器机制

你想从哪个部分开始？我可以帮你实现具体的代码！
