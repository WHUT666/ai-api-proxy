# 🔑 Kiro API 关键配置总结

根据 Kiro Account Manager 的实现，我发现了几个关键问题：

## 1. ProfileArn 是必需的

```typescript
// Builder ID 账号
const KIRO_BUILDER_ID_PROFILE_ARN = 'arn:aws:codewhisperer:us-east-1:638616132270:profile/AAAACCCCXXXX'

// 社交登录账号（GitHub/Google）
const KIRO_SOCIAL_PROFILE_ARN = 'arn:aws:codewhisperer:us-east-1:699475941385:profile/EHGA3GRVQMUK'
```

**必须在 payload 中包含正确的 profileArn！**

## 2. 正确的认证头

```typescript
const headers = {
  'content-type': 'application/json',
  'x-amzn-kiro-agent-mode': 'spec',  // IDE 模式，IDC 用 'vibe'
  'x-amz-user-agent': 'aws-sdk-js/3.698.0 KiroIDE-1.0.0',
  'user-agent': 'aws-sdk-js/3.698.0 ua/2.1 os/win32 lang/js md/nodejs#20.0.0 api/codewhispererstreaming#2024-11-20 m/E KiroIDE-1.0.0',
  'amz-sdk-invocation-id': uuidv4(),
  'amz-sdk-request': 'attempt=1; max=3',
  'Authorization': `Bearer ${account.accessToken}`
}
```

## 3. 端点配置

```typescript
const KIRO_ENDPOINTS = [
  {
    url: 'https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse',
    origin: 'AI_EDITOR',
    name: 'CodeWhisperer'
  },
  {
    url: 'https://q.us-east-1.amazonaws.com/generateAssistantResponse',
    origin: 'AI_EDITOR',
    name: 'AmazonQ'
  }
]
```

## 4. Payload 结构

```typescript
const payload = {
  conversationState: {
    currentMessage: {
      userInputMessage: {
        content: "user message",
        userInputMessageContext: {
          appStudioState: {
            programmingLanguage: { languageName: 'plaintext' }
          }
        }
      }
    },
    chatTriggerType: 'MANUAL',
    history: []
  },
  profileArn: 'arn:aws:codewhisperer:us-east-1:638616132270:profile/AAAACCCCXXXX',  // 必需！
  origin: 'AI_EDITOR',
  modelId: 'claude-sonnet-4.5'
}
```

## 5. 我们的问题

当前代码缺少：
1. ❌ **profileArn** - 这是最关键的！
2. ❌ 正确的 User-Agent 格式
3. ❌ x-amzn-kiro-agent-mode 头

## 6. 修复方案

需要在以下地方添加 profileArn：
- 批量导入时从 OIDC JSON 提取 profileArn
- 如果没有，根据账号类型使用默认值
- 在 API 调用时确保 payload 包含 profileArn

---

**立即修复：添加 profileArn 到账号数据和 API 调用！**
