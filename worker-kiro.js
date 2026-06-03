// Cloudflare Workers AI API 代理 - Kiro 增强版
// 支持 OpenAI, Anthropic, Google Gemini, Amazon Q (Kiro)

// ============ Kiro 格式转换模块 ============

// ProfileArn 配置
const KIRO_BUILDER_ID_PROFILE_ARN = 'arn:aws:codewhisperer:us-east-1:638616132270:profile/AAAACCCCXXXX';
const KIRO_SOCIAL_PROFILE_ARN = 'arn:aws:codewhisperer:us-east-1:699475941385:profile/EHGA3GRVQMUK';

// 根据账号类型解析 profileArn
function resolveProfileArn(account) {
  // 如果账号有自己的 profileArn，使用它
  if (account.profileArn) {
    return account.profileArn;
  }
  
  // 根据认证方式判断
  const authMethod = account.authMethod || 'oidc';
  
  // 社交登录（GitHub/Google）
  if (authMethod === 'social') {
    return KIRO_SOCIAL_PROFILE_ARN;
  }
  
  // Builder ID 或 IdC
  return KIRO_BUILDER_ID_PROFILE_ARN;
}

// 生成 Kiro User-Agent
function getKiroUserAgent() {
  return 'aws-sdk-js/3.698.0 ua/2.1 os/linux lang/js md/nodejs#20.0.0 api/codewhispererstreaming#2024-11-20 m/E KiroIDE-1.0.0';
}

// 生成 Kiro AMZ User-Agent
function getKiroAmzUserAgent() {
  return 'aws-sdk-js/3.698.0 KiroIDE-1.0.0';
}

// 模型 ID 映射
const MODEL_ID_MAP = {
  // Claude 4.5 系列
  'claude-sonnet-4-5': 'claude-sonnet-4.5',
  'claude-sonnet-4.5': 'claude-sonnet-4.5',
  'claude-haiku-4-5': 'claude-haiku-4.5',
  'claude-haiku-4.5': 'claude-haiku-4.5',
  
  // Claude 4 系列
  'claude-sonnet-4': 'claude-sonnet-4',
  'claude-sonnet-4-20250514': 'claude-sonnet-4',
  
  // Claude 3.5 系列（映射到 Sonnet 4.5）
  'claude-3-5-sonnet': 'claude-sonnet-4.5',
  'claude-3-5-sonnet-20241022': 'claude-sonnet-4.5',
  'claude-3-opus': 'claude-sonnet-4.5',
  'claude-3-sonnet': 'claude-sonnet-4',
  'claude-3-haiku': 'claude-haiku-4.5',
  
  // Anthropic 格式
  'anthropic.claude-3-5-sonnet-20241022-v2:0': 'claude-sonnet-4.5',
  'anthropic.claude-3-sonnet-20240229-v1:0': 'claude-sonnet-4',
  'anthropic.claude-3-haiku-20240307-v1:0': 'claude-haiku-4.5',
  
  // GPT 系列（映射到 Claude）
  'gpt-4': 'claude-sonnet-4.5',
  'gpt-4o': 'claude-sonnet-4.5',
  'gpt-4-turbo': 'claude-sonnet-4.5',
  'gpt-3.5-turbo': 'claude-sonnet-4.5',
  
  // 默认
  'default': 'claude-sonnet-4.5'
};

// 映射模型 ID
function mapModelId(model) {
  if (!model || typeof model !== 'string') {
    return MODEL_ID_MAP.default;
  }
  
  const modelId = model.trim().toLowerCase();
  
  // 精确匹配
  if (MODEL_ID_MAP[modelId]) {
    return MODEL_ID_MAP[modelId];
  }
  
  // 模糊匹配
  for (const [key, value] of Object.entries(MODEL_ID_MAP)) {
    if (modelId.includes(key) || key.includes(modelId)) {
      return value;
    }
  }
  
  // 兜底
  return MODEL_ID_MAP.default;
}

// OpenAI 格式 → Kiro 格式
function openaiToKiro(request, profileArn) {
  const modelId = mapModelId(request.model);
  
  // 提取系统提示
  let systemPrompt = '';
  const nonSystemMessages = [];
  
  for (const msg of request.messages || []) {
    if (msg.role === 'system') {
      if (typeof msg.content === 'string') {
        systemPrompt += (systemPrompt ? '\n' : '') + msg.content;
      }
    } else {
      nonSystemMessages.push(msg);
    }
  }
  
  // 添加时间戳
  const timestamp = new Date().toISOString();
  if (systemPrompt) {
    systemPrompt = `[Context: Current time is ${timestamp}]\n\n${systemPrompt}`;
  }
  
  // 构建历史消息（符合 Kiro 规范）
  const history = [];
  
  for (let i = 0; i < nonSystemMessages.length - 1; i++) {
    const msg = nonSystemMessages[i];
    
    if (msg.role === 'user') {
      history.push({
        userInputMessage: {
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          origin: 'AI_EDITOR',
          modelId: modelId
        }
      });
    } else if (msg.role === 'assistant') {
      history.push({
        assistantResponseMessage: {
          content: msg.content || ''
        }
      });
    }
  }
  
  // 最后一条用户消息作为当前消息
  const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
  let currentUserMessage = 'Hello';
  
  if (lastMessage && lastMessage.role === 'user') {
    currentUserMessage = typeof lastMessage.content === 'string' 
      ? lastMessage.content 
      : JSON.stringify(lastMessage.content);
  }
  
  // 如果有系统提示，添加到当前消息前面
  if (systemPrompt) {
    currentUserMessage = `${systemPrompt}\n\n${currentUserMessage}`;
  }
  
  // 构建 Kiro payload（符合 AWS CodeWhisperer 规范）
  const payload = {
    conversationState: {
      agentContinuationId: generateUUID(),
      agentTaskType: 'vibe',
      chatTriggerType: 'MANUAL',
      conversationId: generateUUID(),
      currentMessage: {
        userInputMessage: {
          content: currentUserMessage,
          origin: 'AI_EDITOR',
          modelId: modelId
        }
      },
      history: history.length > 0 ? history : undefined
    }
  };
  
  // 添加 profileArn（如果有）
  if (profileArn) {
    payload.profileArn = profileArn;
  }
  
  return payload;
}

// 生成 UUID
function generateUUID() {
  return crypto.randomUUID();
}

// ============ 原有代码继续 ============

// 账号类型定义 (注释形式)
// KiroAccount {
//   id: string;
//   email: string;
//   provider: 'kiro';
//   
//   // Kiro 特有字段
//   ssoToken?: string;           // SSO Token（AWS IAM Identity Center）
//   accessToken?: string;         // Bearer Token
//   refreshToken?: string;        // 用于刷新
//   
//   // OIDC 认证（Builder ID / GitHub / Google）
//   clientId?: string;
//   clientSecret?: string;
//   idToken?: string;
//   
//   // 账号信息
//   region?: string;              // AWS 区域，默认 us-east-1
//   expiresAt?: number;
//   enabled: boolean;
//   lastUsed?: number;
//   createdAt: number;
//   
//   // 使用统计
//   usage?: {
//     currentMonth: number;       // 当前月使用量
//     limit: number;              // 配额限制
//     resetAt: number;            // 重置时间
//   };
// }

// Kiro API 端点配置（正确的 AWS CodeWhisperer 端点）
const KIRO_ENDPOINTS = [
  {
    url: 'https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse',
    origin: 'AI_EDITOR',
    amzTarget: 'AmazonCodeWhispererStreamingService.GenerateAssistantResponse',
    name: 'CodeWhisperer'
  },
  {
    url: 'https://q.us-east-1.amazonaws.com/generateAssistantResponse',
    origin: 'AI_EDITOR',
    amzTarget: 'AmazonCodeWhispererStreamingService.GenerateAssistantResponse',
    name: 'AmazonQ'
  }
];

// 静态网页文件（Base64 编码）
const STATIC_FILES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/docs.html': 'docs.html',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return corsResponse();
    }

    // 静态网页文件
    if (STATIC_FILES[path]) {
      return serveStaticFile(path);
    }

    // 管理接口
    if (path.startsWith('/admin')) {
      return handleAdminRequest(request, env, path);
    }

    // Kiro 专用端点
    if (path.startsWith('/kiro')) {
      return handleKiroRequest(request, env, path, url);
    }

    // 健康检查
    if (path === '/health') {
      return jsonResponse({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '2.0.0-kiro',
        supported: ['openai', 'anthropic', 'gemini', 'kiro']
      });
    }
    
    // 调试端点：测试 Kiro API 原始响应
    if (path === '/debug/kiro') {
      return handleKiroDebug(request, env);
    }

    // API 信息（用于 API 工具调用）
    if (path === '/api-info') {
      return jsonResponse({
        name: 'AI API Proxy (Kiro Enhanced)',
        version: '2.0.0',
        features: [
          'Multi-account management',
          'Auto token refresh',
          'Load balancing',
          'Kiro (Amazon Q) support'
        ],
        endpoints: {
          openai: '/v1/*',
          anthropic: '/anthropic/*',
          gemini: '/gemini/*',
          kiro: '/kiro/api/v1/* (Amazon Q)',
          health: '/health',
          admin: '/admin/* (requires auth)'
        }
      });
    }

    // 拒绝未认证的请求
    return jsonResponse({ 
      error: 'Invalid endpoint',
      message: 'Please check the API documentation'
    }, 404);
  }
};

// 提供静态文件
function serveStaticFile(path) {
  // 重定向根路径到 index.html
  const fileName = path === '/' ? '/index.html' : path;
  
  // 这里返回简单的重定向，实际文件通过外部托管
  // 或者你可以把 HTML 内容内嵌到这里
  if (fileName === '/index.html') {
    return new Response(INDEX_HTML, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
      }
    });
  }
  
  if (fileName === '/docs.html') {
    return new Response(DOCS_HTML, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
      }
    });
  }
  
  return new Response('Not Found', { status: 404 });
}

// 首页 HTML（简化版，指向外部文件）
const INDEX_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI API 代理服务</title>
    <meta http-equiv="refresh" content="0; url=https://github.com/WHUT666/ai-api-proxy">
</head>
<body>
    <p>正在跳转到项目主页...</p>
    <p>如果没有自动跳转，请访问：<a href="https://github.com/WHUT666/ai-api-proxy">https://github.com/WHUT666/ai-api-proxy</a></p>
</body>
</html>`;

const DOCS_HTML = INDEX_HTML;

// 处理 Kiro 请求
async function handleKiroRequest(request, env, path, url) {
  // 检查是否是 OpenAI 兼容的聊天接口
  if (path === '/kiro/v1/chat/completions') {
    return handleKiroChatCompletion(request, env);
  }
  
  // 获取可用账号
  const account = await getAvailableAccount(env, 'kiro');
  
  if (!account) {
    return jsonResponse({ 
      error: 'No available Kiro accounts',
      message: 'Please add Kiro accounts in admin panel'
    }, 503);
  }

  // 检查 Token 是否过期
  if (account.expiresAt && account.expiresAt < Date.now() + 300000) {
    await refreshKiroToken(env, account.id);
    const refreshedAccount = await getAccount(env, account.id);
    if (refreshedAccount) {
      Object.assign(account, refreshedAccount);
    }
  }

  // 确定正确的 Kiro API 端点
  const region = account.region || 'us-east-1';
  
  // 使用正确的 generateAssistantResponse 端点
  const kiroUrl = `https://codewhisperer.${region}.amazonaws.com/generateAssistantResponse`;
  
  // 解析请求体
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (e) {
    return jsonResponse({
      error: 'Invalid JSON',
      message: 'Request body must be valid JSON'
    }, 400);
  }

  // 确保请求体包含必要的 conversationState 结构
  if (!requestBody.conversationState) {
    return jsonResponse({
      error: 'Invalid request',
      message: 'Missing conversationState in request body'
    }, 400);
  }

  // 添加 profileArn
  const profileArn = resolveProfileArn(account);
  requestBody.profileArn = profileArn;

  // 构建正确的请求头
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${account.accessToken || account.ssoToken}`,
    'x-amzn-kiro-agent-mode': 'spec',
    'x-amz-user-agent': getKiroAmzUserAgent(),
    'user-agent': getKiroUserAgent(),
    'amz-sdk-invocation-id': generateUUID(),
    'amz-sdk-request': 'attempt=1; max=3'
  };

  try {
    const response = await fetch(kiroUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    const statusCode = response.status;
    
    // 记录请求结果
    await recordRequest(env, account.id, response.ok, null, statusCode);
    
    // 检查认证错误
    if (statusCode === 401 || statusCode === 403) {
      const excludeIds = new Set([account.id]);
      const nextAccount = await getAvailableAccount(env, 'kiro', excludeIds);
      
      if (nextAccount && nextAccount.id !== account.id) {
        console.log(`[Kiro] Auth failed for ${account.email || account.id}, retrying with ${nextAccount.email || nextAccount.id}`);
        
        const retryHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nextAccount.accessToken || nextAccount.ssoToken}`,
          'x-amzn-kiro-agent-mode': 'spec',
          'x-amz-user-agent': getKiroAmzUserAgent(),
          'user-agent': getKiroUserAgent(),
          'amz-sdk-invocation-id': generateUUID(),
          'amz-sdk-request': 'attempt=2; max=3'
        };
        
        const retryResponse = await fetch(kiroUrl, {
          method: 'POST',
          headers: retryHeaders,
          body: JSON.stringify(requestBody)
        });
        
        await recordRequest(env, nextAccount.id, retryResponse.ok, null, retryResponse.status);
        
        if (retryResponse.ok) {
          await updateAccountLastUsed(env, nextAccount.id);
          const proxyResponse = new Response(retryResponse.body, retryResponse);
          proxyResponse.headers.set('Access-Control-Allow-Origin', '*');
          proxyResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          proxyResponse.headers.set('Access-Control-Allow-Headers', '*');
          proxyResponse.headers.set('Content-Type', 'text/event-stream');
          return proxyResponse;
        }
      }
      
      const errorText = await response.text();
      return jsonResponse({
        error: 'Authentication failed',
        message: 'Token expired or invalid for all available accounts',
        accountId: account.id,
        details: errorText
      }, 401);
    }
    
    // 检查其他可恢复错误（配额/限流）
    if (statusCode === 402 || statusCode === 429) {
      const excludeIds = new Set([account.id]);
      const nextAccount = await getAvailableAccount(env, 'kiro', excludeIds);
      
      if (nextAccount && nextAccount.id !== account.id) {
        console.log(`[Kiro] Quota/Rate limit for ${account.email || account.id}, retrying with ${nextAccount.email || nextAccount.id}`);
        
        const retryHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nextAccount.accessToken || nextAccount.ssoToken}`,
          'x-amzn-kiro-agent-mode': 'spec',
          'x-amz-user-agent': getKiroAmzUserAgent(),
          'user-agent': getKiroUserAgent(),
          'amz-sdk-invocation-id': generateUUID(),
          'amz-sdk-request': 'attempt=2; max=3'
        };
        
        const retryResponse = await fetch(kiroUrl, {
          method: 'POST',
          headers: retryHeaders,
          body: JSON.stringify(requestBody)
        });
        
        await recordRequest(env, nextAccount.id, retryResponse.ok, null, retryResponse.status);
        
        if (retryResponse.ok) {
          await updateAccountLastUsed(env, nextAccount.id);
          const proxyResponse = new Response(retryResponse.body, retryResponse);
          proxyResponse.headers.set('Access-Control-Allow-Origin', '*');
          proxyResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          proxyResponse.headers.set('Access-Control-Allow-Headers', '*');
          proxyResponse.headers.set('Content-Type', 'text/event-stream');
          return proxyResponse;
        }
      }
    }
    
    // 记录成功的请求
    if (response.ok) {
      await updateAccountLastUsed(env, account.id);
      await updateKiroUsage(env, account.id);
    }

    // 返回代理响应
    const proxyResponse = new Response(response.body, response);
    proxyResponse.headers.set('Access-Control-Allow-Origin', '*');
    proxyResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    proxyResponse.headers.set('Access-Control-Allow-Headers', '*');
    proxyResponse.headers.set('Content-Type', 'text/event-stream');
    
    return proxyResponse;
  } catch (error) {
    await recordRequest(env, account.id, false, error.message, 500);
    return jsonResponse({
      error: 'Proxy error',
      message: error.message
    }, 500);
  }
}

// 将 Kiro 的 AWS Event Stream 二进制原始字节流转换为标准 OpenAI 兼容的 SSE Stream 响应
function handleKiroStreamResponse(kiroResponse, openaiRequest) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const requestId = `chatcmpl-${generateUUID()}`;

  (async () => {
    let buffer = new Uint8Array(0);
    const reader = kiroResponse.body.getReader();
    const textDecoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const newBuffer = new Uint8Array(buffer.length + value.length);
        newBuffer.set(buffer);
        newBuffer.set(value, buffer.length);
        buffer = newBuffer;

        while (buffer.length >= 16) {
          const totalLength = (buffer[0] << 24) | (buffer[1] << 16) | (buffer[2] << 8) | buffer[3];
          if (buffer.length < totalLength) break;

          const headersLength = (buffer[4] << 24) | (buffer[5] << 16) | (buffer[6] << 8) | buffer[7];
          
          const headersBuffer = buffer.subarray(12, 12 + headersLength);
          let eventType = '';
          let offset = 0;
          while (offset < headersBuffer.length) {
            const nameLen = headersBuffer[offset];
            offset++;
            if (offset + nameLen > headersBuffer.length) break;
            const name = textDecoder.decode(headersBuffer.slice(offset, offset + nameLen));
            offset += nameLen;
            if (offset >= headersBuffer.length) break;
            const valueType = headersBuffer[offset];
            offset++;
            if (valueType === 7) {
              if (offset + 2 > headersBuffer.length) break;
              const valueLen = (headersBuffer[offset] << 8) | headersBuffer[offset + 1];
              offset += 2;
              if (offset + valueLen > headersBuffer.length) break;
              const value = textDecoder.decode(headersBuffer.slice(offset, offset + valueLen));
              offset += valueLen;
              if (name === ':event-type') {
                eventType = value;
                break;
              }
            } else {
              const skipSizes = { 0: 0, 1: 0, 2: 1, 3: 2, 4: 4, 5: 8, 8: 8, 9: 16 };
              if (valueType === 6) {
                if (offset + 2 > headersBuffer.length) break;
                const len = (headersBuffer[offset] << 8) | headersBuffer[offset + 1];
                offset += 2 + len;
              } else if (skipSizes[valueType] !== undefined) {
                offset += skipSizes[valueType];
              } else {
                break;
              }
            }
          }

          const payloadStart = 12 + headersLength;
          const payloadEnd = totalLength - 4;

          if (payloadStart < payloadEnd) {
            const payloadBytes = buffer.subarray(payloadStart, payloadEnd);
            try {
              const payloadText = textDecoder.decode(payloadBytes);
              const event = JSON.parse(payloadText);

              let content = '';
              if (eventType === 'assistantResponseEvent' || event.assistantResponseEvent) {
                const assistantResp = event.assistantResponseEvent || event;
                if (assistantResp.content) content = assistantResp.content;
              } else if (eventType === 'codeEvent' || event.codeEvent) {
                const codeResp = event.codeEvent || event;
                if (codeResp.content) content = codeResp.content;
              }

              if (content) {
                const streamChunk = {
                  id: requestId,
                  object: 'chat.completion.chunk',
                  created: Math.floor(Date.now() / 1000),
                  model: openaiRequest.model || 'gpt-4o',
                  choices: [{ index: 0, delta: { content }, finish_reason: null }]
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(streamChunk)}\n\n`));
              }
            } catch (e) {}
          }
          buffer = buffer.subarray(totalLength);
        }
      }

      const finalChunk = {
        id: requestId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: openaiRequest.model || 'gpt-4o',
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
      await writer.write(encoder.encode('data: [DONE]\n\n'));
    } catch (err) {
      console.error('[Stream error]', err);
    } finally {
      try {
        await writer.close();
      } catch (e) {}
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 处理 OpenAI 格式的 Kiro 聊天请求
async function handleKiroChatCompletion(request, env) {
  try {
    console.log('[handleKiroChatCompletion] Starting...');
    
    // 获取可用的 Kiro 账号
    const account = await getAvailableAccount(env, 'kiro');
    
    console.log(`[handleKiroChatCompletion] Account: ${account ? (account.email || account.id) : 'NULL'}`);
    
    if (!account) {
      return jsonResponse({ 
        error: 'No available Kiro accounts',
        message: 'Please add Kiro accounts in admin panel'
      }, 503);
    }
    
    console.log(`[handleKiroChatCompletion] Has accessToken: ${!!account.accessToken}, Has ssoToken: ${!!account.ssoToken}`);
    
    // 检查账号是否有 accessToken
    if (!account.accessToken && !account.ssoToken) {
      console.log('[handleKiroChatCompletion] No token, attempting refresh...');
      // 尝试刷新 Token
      const refreshResult = await refreshKiroToken(env, account.id);
      if (refreshResult.success) {
        // 重新获取账号
        const refreshedAccount = await getAccount(env, account.id);
        if (refreshedAccount && refreshedAccount.accessToken) {
          Object.assign(account, refreshedAccount);
          console.log('[handleKiroChatCompletion] Token refreshed successfully');
        } else {
          return jsonResponse({
            error: 'Token refresh succeeded but account still has no accessToken',
            message: 'Please check KV storage configuration',
            accountId: account.id
          }, 500);
        }
      } else {
        return jsonResponse({
          error: 'Account missing token and refresh failed',
          message: refreshResult.error,
          accountId: account.id
        }, 500);
      }
    }

    // 检查 Token 是否过期
    if (account.expiresAt && account.expiresAt < Date.now() + 300000) {
      console.log('[handleKiroChatCompletion] Token expiring soon, refreshing...');
      await refreshKiroToken(env, account.id);
      const refreshedAccount = await getAccount(env, account.id);
      if (refreshedAccount) {
        Object.assign(account, refreshedAccount);
      }
    }

    // 解析 OpenAI 格式的请求
    const openaiRequest = await request.json();
    
    console.log(`[handleKiroChatCompletion] Request model: ${openaiRequest.model}, messages: ${openaiRequest.messages?.length}`);
    
    // 解析 profileArn
    const profileArn = resolveProfileArn(account);
    
    // 转换为 Kiro 格式
    const kiroPayload = openaiToKiro(openaiRequest, profileArn);
    
    console.log(`[handleKiroChatCompletion] Kiro payload conversationId: ${kiroPayload.conversationState?.conversationId}`);
    
    // 构建 Kiro API 请求
    const region = account.region || 'us-east-1';
    const kiroUrl = `https://codewhisperer.${region}.amazonaws.com/generateAssistantResponse`;
    
    console.log(`[handleKiroChatCompletion] Calling Kiro API: ${kiroUrl}`);
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${account.accessToken || account.ssoToken}`,
      'x-amzn-kiro-agent-mode': 'spec',
      'x-amz-user-agent': getKiroAmzUserAgent(),
      'user-agent': getKiroUserAgent(),
      'amz-sdk-invocation-id': generateUUID(),
      'amz-sdk-request': 'attempt=1; max=3'
    };
    
    // 发送请求到 Kiro
    const kiroResponse = await fetch(kiroUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(kiroPayload)
    });
    
    console.log(`[handleKiroChatCompletion] Kiro API response status: ${kiroResponse.status}`);
    console.log(`[handleKiroChatCompletion] Response Content-Type: ${kiroResponse.headers.get('content-type')}`);
    
    // 记录请求结果
    const statusCode = kiroResponse.status;
    await recordRequest(env, account.id, kiroResponse.ok, null, statusCode);
    
    // 检查认证错误
    if (statusCode === 401 || statusCode === 403) {
      // 尝试切换到下一个账号
      const excludeIds = new Set([account.id]);
      const nextAccount = await getAvailableAccount(env, 'kiro', excludeIds);
      
      if (nextAccount && nextAccount.id !== account.id) {
        console.log(`[Kiro] Auth failed for ${account.email || account.id}, retrying with ${nextAccount.email || nextAccount.id}`);
        
        // 使用新账号重试
        const retryHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nextAccount.accessToken || nextAccount.ssoToken}`,
          'x-amzn-kiro-agent-mode': 'spec',
          'x-amz-user-agent': getKiroAmzUserAgent(),
          'user-agent': getKiroUserAgent(),
          'amz-sdk-invocation-id': generateUUID(),
          'amz-sdk-request': 'attempt=2; max=3'
        };
        
        const retryPayload = openaiToKiro(openaiRequest, resolveProfileArn(nextAccount));
        const retryResponse = await fetch(kiroUrl, {
          method: 'POST',
          headers: retryHeaders,
          body: JSON.stringify(retryPayload)
        });
        
        await recordRequest(env, nextAccount.id, retryResponse.ok, null, retryResponse.status);
        
        if (retryResponse.ok) {
          await updateAccountLastUsed(env, nextAccount.id);
          
          // 处理流式响应
          if (openaiRequest.stream) {
            return handleKiroStreamResponse(retryResponse, openaiRequest);
          } else {
            // 重新解析响应（复制主流程的逻辑）
            const arrayBuffer = await retryResponse.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);
            
            let content = '';
            let offset = 0;
            
            while (offset < buffer.length) {
              if (offset + 16 > buffer.length) break;
              
              const totalLength = (buffer[offset] << 24) | (buffer[offset + 1] << 16) | 
                                 (buffer[offset + 2] << 8) | buffer[offset + 3];
              
              if (totalLength === 0 || totalLength > 1000000 || offset + totalLength > buffer.length) break;
              
              const headersLength = (buffer[offset + 4] << 24) | (buffer[offset + 5] << 16) | 
                                   (buffer[offset + 6] << 8) | buffer[offset + 7];
              
              const payloadStart = offset + 12 + headersLength;
              const payloadEnd = offset + totalLength - 4;
              
              if (payloadStart < payloadEnd) {
                const payloadBytes = buffer.slice(payloadStart, payloadEnd);
                const payloadText = new TextDecoder().decode(payloadBytes);
                
                try {
                  const event = JSON.parse(payloadText);
                  
                  if (event.content && typeof event.content === 'string') {
                    content += event.content;
                  }
                  
                  if (event.assistantResponseEvent && event.assistantResponseEvent.content) {
                    content += event.assistantResponseEvent.content;
                  }
                  
                  if (event.codeEvent && event.codeEvent.content) {
                    content += event.codeEvent.content;
                  }
                } catch (e) {
                  // 忽略解析错误
                }
              }
              
              offset += totalLength;
            }
            
            const openaiResponse = {
              id: `chatcmpl-${generateUUID()}`,
              object: 'chat.completion',
              created: Math.floor(Date.now() / 1000),
              model: openaiRequest.model || 'claude-sonnet-4.5',
              choices: [{
                index: 0,
                message: {
                  role: 'assistant',
                  content: content
                },
                finish_reason: 'stop'
              }],
              usage: {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0
              }
            };
            
            return jsonResponse(openaiResponse);
          }
        }
      }
      
      // 无可用账号或重试失败
      const errorText = await kiroResponse.text();
      return jsonResponse({
        error: 'Authentication failed',
        message: 'Token expired or invalid',
        kiroError: errorText,
        accountId: account.id,
        tokenLength: account.accessToken ? account.accessToken.length : 0
      }, 401);
    }
    
    if (!kiroResponse.ok) {
      const errorText = await kiroResponse.text();
      return jsonResponse({
        error: 'Kiro API error',
        message: errorText,
        status: kiroResponse.status
      }, kiroResponse.status);
    }
    
    // 解析 Kiro 响应（AWS Event Stream 格式）
    // Kiro API 返回的是二进制事件流，需要解析每个事件
    if (openaiRequest.stream) {
      return handleKiroStreamResponse(kiroResponse, openaiRequest);
    }
    const arrayBuffer = await kiroResponse.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    console.log(`[Debug] Kiro response size: ${buffer.length} bytes`);
    
    // 显示前64字节的hex dump
    if (buffer.length > 0) {
      const hex = Array.from(buffer.slice(0, Math.min(64, buffer.length)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      console.log(`[Debug] First 64 bytes (hex): ${hex}`);
      
      // 也显示为文本（如果可读）
      const text = new TextDecoder().decode(buffer.slice(0, Math.min(200, buffer.length)));
      console.log(`[Debug] First 200 chars as text: ${text.replace(/\n/g, '\\n')}`);
    }
    
    let content = '';
    let offset = 0;
    let eventCount = 0;
    
    // 解析 AWS Event Stream 格式
    // 每个消息格式：[4字节总长度][4字节头长度][4字节CRC][头部][payload][4字节CRC]
    while (offset < buffer.length) {
      // 至少需要 16 字节（prelude）
      if (offset + 16 > buffer.length) {
        console.log(`[Debug] Incomplete message at offset ${offset}, remaining ${buffer.length - offset} bytes`);
        break;
      }
      
      // 读取总长度（big-endian uint32）
      const totalLength = (buffer[offset] << 24) | (buffer[offset + 1] << 16) | 
                         (buffer[offset + 2] << 8) | buffer[offset + 3];
      
      console.log(`[Debug] Message at offset ${offset}: totalLength=${totalLength}`);
      
      // 检查是否有完整消息
      if (totalLength === 0 || totalLength > 1000000) {
        console.log(`[Debug] Invalid totalLength: ${totalLength}, stopping parse`);
        break;
      }
      
      if (offset + totalLength > buffer.length) {
        console.log(`[Debug] Incomplete message: need ${totalLength}, have ${buffer.length - offset}`);
        break;
      }
      
      // 读取头部长度
      const headersLength = (buffer[offset + 4] << 24) | (buffer[offset + 5] << 16) | 
                           (buffer[offset + 6] << 8) | buffer[offset + 7];
      
      console.log(`[Debug] headersLength=${headersLength}`);
      
      // 提取 payload（跳过 prelude(12字节) + headers）
      const payloadStart = offset + 12 + headersLength;
      const payloadEnd = offset + totalLength - 4; // 减去最后的 CRC
      
      if (payloadStart < payloadEnd) {
        const payloadBytes = buffer.slice(payloadStart, payloadEnd);
        const payloadText = new TextDecoder().decode(payloadBytes);
        
        console.log(`[Debug] Payload length: ${payloadBytes.length}, text length: ${payloadText.length}`);
        console.log(`[Debug] Payload preview: ${payloadText.substring(0, 100)}`);
        
        try {
          const event = JSON.parse(payloadText);
          eventCount++;
          
          console.log(`[Debug] Event ${eventCount} keys:`, Object.keys(event).join(', '));
          
          // 多层级提取内容
          // 1. 检查直接的 content 字段
          if (event.content && typeof event.content === 'string') {
            content += event.content;
            console.log(`[Debug] Added direct content: ${event.content.length} chars, total: ${content.length}`);
          }
          
          // 2. 检查 assistantResponseEvent.content
          if (event.assistantResponseEvent && event.assistantResponseEvent.content) {
            content += event.assistantResponseEvent.content;
            console.log(`[Debug] Added assistantResponseEvent.content: ${event.assistantResponseEvent.content.length} chars`);
          }
          
          // 3. 检查 codeEvent.content
          if (event.codeEvent && event.codeEvent.content) {
            content += event.codeEvent.content;
            console.log(`[Debug] Added codeEvent.content: ${event.codeEvent.content.length} chars`);
          }
          
          // 4. 检查 supplementaryWebLinksEvent
          if (event.supplementaryWebLinksEvent && event.supplementaryWebLinksEvent.supplementaryWebLinks) {
            console.log(`[Debug] Found supplementaryWebLinks: ${event.supplementaryWebLinksEvent.supplementaryWebLinks.length} links`);
          }
          
          // 5. 检查 messageMetadataEvent
          if (event.messageMetadataEvent) {
            console.log(`[Debug] Found messageMetadataEvent`);
          }
          
          // 6. 如果所有已知字段都没有，打印完整事件结构
          if (!event.content && !event.assistantResponseEvent && !event.codeEvent && !event.supplementaryWebLinksEvent && !event.messageMetadataEvent) {
            console.log(`[Debug] Unknown event structure:`, JSON.stringify(event).substring(0, 200));
          }
        } catch (e) {
          console.log(`[Debug] Parse error at event ${eventCount}: ${e.message}`);
          console.log(`[Debug] Payload text: ${payloadText.substring(0, 200)}`);
        }
      } else {
        console.log(`[Debug] Invalid payload range: ${payloadStart} to ${payloadEnd}`);
      }
      
      // 移动到下一个消息
      offset += totalLength;
    }
    
    console.log(`[Debug] Parsed ${eventCount} events, extracted content length: ${content.length}`);
    
    // 如果没有提取到内容，返回错误提示而不是空响应
    if (content.length === 0) {
      console.log('[Error] No content extracted from Kiro response');
      return jsonResponse({
        error: 'No content in response',
        message: 'Kiro API returned events but no content was extracted. This may indicate a parsing issue or the account may need token refresh.',
        debug: {
          totalEvents: eventCount,
          responseSize: buffer.length,
          suggestion: 'Try refreshing the account token in the admin panel'
        }
      }, 500);
    }
    
    // 记录使用统计
    await recordRequest(env, account.id, true);
    await updateAccountLastUsed(env, account.id);
    await updateKiroUsage(env, account.id);
    
    // 转换为 OpenAI 格式响应
    const openaiResponse = {
      id: `chatcmpl-${generateUUID()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: openaiRequest.model || 'claude-sonnet-4.5',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: content
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };
    
    return jsonResponse(openaiResponse);
    
  } catch (error) {
    return jsonResponse({
      error: 'Internal error',
      message: error.message
    }, 500);
  }
}

// 刷新 Kiro Token
async function refreshKiroToken(env, accountId) {
  const account = await getAccount(env, accountId);
  
  if (!account) {
    return { success: false, error: 'Account not found' };
  }

  try {
    const region = account.region || 'us-east-1';
    
    // 判断认证方式：social (GitHub/Google) 还是 OIDC (BuilderId/IdC)
    const authMethod = account.authMethod || 'oidc';
    
    // 方式1：社交登录刷新（GitHub/Google）
    if (authMethod === 'social' && account.refreshToken) {
      const tokenUrl = 'https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken';
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AWS-Toolkit-For-VSCode/3.148.0'
        },
        body: JSON.stringify({
          refreshToken: account.refreshToken
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Social token refresh failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // 更新账号信息
      await updateAccount(env, accountId, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || account.refreshToken,
        expiresAt: Date.now() + (data.expiresIn || 3600) * 1000
      });

      return { 
        success: true, 
        message: 'Social token refreshed successfully',
        accessToken: data.accessToken
      };
    }
    
    // 方式2：OIDC 刷新（BuilderId / IAM Identity Center）
    if (account.clientId && account.clientSecret && account.refreshToken) {
      // 正确的 OIDC 端点（根据区域）
      const tokenUrl = `https://oidc.${region}.amazonaws.com/token`;
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId: account.clientId,
          clientSecret: account.clientSecret,
          refreshToken: account.refreshToken,
          grantType: 'refresh_token'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OIDC token refresh failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // 更新账号信息
      await updateAccount(env, accountId, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || account.refreshToken,
        idToken: data.idToken,
        expiresAt: Date.now() + (data.expiresIn || 3600) * 1000
      });

      return { 
        success: true, 
        message: 'OIDC token refreshed successfully',
        accessToken: data.accessToken
      };
    }
    
    // SSO Token 需要重新登录，无法自动刷新
    if (account.ssoToken) {
      return { 
        success: false, 
        error: 'SSO token cannot be auto-refreshed, please re-login' 
      };
    }

    return { success: false, error: 'No refresh method available (missing clientId/clientSecret/refreshToken)' };
  } catch (error) {
    // 标记账号需要刷新
    await markAccountNeedsRefresh(env, accountId);
    return { success: false, error: error.message };
  }
}

// 更新 Kiro 使用量
async function updateKiroUsage(env, accountId) {
  const account = await getAccount(env, accountId);
  if (!account) return;

  // 这里需要根据实际 API 响应更新使用量
  // Kiro API 通常在响应头或响应体中包含使用信息
  
  // 示例：增加使用计数
  if (!account.usage) {
    account.usage = {
      currentMonth: 0,
      limit: 100000, // 默认限制
      resetAt: getNextMonthTimestamp()
    };
  }

  account.usage.currentMonth += 1;

  // 如果到了重置时间
  if (Date.now() > account.usage.resetAt) {
    account.usage.currentMonth = 1;
    account.usage.resetAt = getNextMonthTimestamp();
  }

  await env.ACCOUNTS.put(accountId, JSON.stringify(account));
}

// 获取下个月的时间戳
function getNextMonthTimestamp() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.getTime();
}

// 标记账号需要刷新
async function markAccountNeedsRefresh(env, accountId) {
  const account = await getAccount(env, accountId);
  if (account) {
    account.enabled = false; // 暂时禁用
    await env.ACCOUNTS.put(accountId, JSON.stringify(account));
  }
}

// 管理接口
async function handleAdminRequest(request, env, path) {
  const authHeader = request.headers.get('Authorization');
  const adminKey = env.ADMIN_KEY;
  
  // 检查是否设置了管理员密钥
  if (!adminKey) {
    return jsonResponse({ 
      error: 'Admin access disabled',
      message: 'Please set ADMIN_KEY environment variable in Cloudflare Workers settings'
    }, 503);
  }
  
  // 验证认证
  if (!authHeader || authHeader !== `Bearer ${adminKey}`) {
    return jsonResponse({ 
      error: 'Unauthorized',
      message: 'Invalid or missing admin key'
    }, 401);
  }

  const method = request.method;

  // GET /admin/accounts - 获取所有账号
  if (path === '/admin/accounts' && method === 'GET') {
    try {
      const accounts = [];
      const list = await env.ACCOUNTS.list();
      
      for (const key of list.keys) {
        const account = await env.ACCOUNTS.get(key.name);
        if (account) {
          const parsed = JSON.parse(account);
          // 移除敏感信息
          const { ssoToken, accessToken, refreshToken, clientSecret, ...safeData } = parsed;
          accounts.push(safeData);
        }
      }
      
      return jsonResponse({ success: true, accounts });
    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // GET /admin/stats - 获取统计信息
  if (path === '/admin/stats' && method === 'GET') {
    try {
      const stats = await env.STATS.get('global');
      return jsonResponse({ 
        success: true, 
        stats: stats ? JSON.parse(stats) : { totalRequests: 0, successRate: 0 }
      });
    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // POST /admin/accounts/kiro - 添加 Kiro 账号
  if (path === '/admin/accounts/kiro' && method === 'POST') {
    try {
      const data = await request.json();
      
      const account = {
        id: crypto.randomUUID(),
        email: data.email,
        provider: 'kiro',
        enabled: true,
        createdAt: Date.now(),
        region: data.region || 'us-east-1',
        
        // 根据认证类型设置字段
        ...(data.ssoToken && { ssoToken: data.ssoToken }),
        ...(data.accessToken && { accessToken: data.accessToken }),
        ...(data.refreshToken && { refreshToken: data.refreshToken }),
        ...(data.clientId && { clientId: data.clientId }),
        ...(data.clientSecret && { clientSecret: data.clientSecret }),
        ...(data.idToken && { idToken: data.idToken }),
        ...(data.expiresAt && { expiresAt: data.expiresAt }),
      };
      
      await env.ACCOUNTS.put(account.id, JSON.stringify(account));
      
      const { ssoToken, accessToken, refreshToken, clientSecret, ...safeData } = account;
      return jsonResponse({ success: true, account: safeData });
    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // POST /admin/accounts/kiro/batch - 批量导入 Kiro 账号
  if (path === '/admin/accounts/kiro/batch' && method === 'POST') {
    try {
      const data = await request.json();
      const accounts = Array.isArray(data) ? data : [data];
      
      const results = {
        success: [],
        failed: [],
        total: accounts.length
      };
      
      for (const accountData of accounts) {
        try {
          // 验证必填字段
          if (!accountData.email) {
            results.failed.push({
              email: accountData.email || 'unknown',
              error: 'Email is required'
            });
            continue;
          }
          
          // 检查是否已存在
          const existingAccounts = await env.ACCOUNTS.list();
          let isDuplicate = false;
          for (const key of existingAccounts.keys) {
            const existing = await env.ACCOUNTS.get(key.name);
            if (existing) {
              const parsed = JSON.parse(existing);
              if (parsed.email === accountData.email && parsed.provider === 'kiro') {
                isDuplicate = true;
                break;
              }
            }
          }
          
          if (isDuplicate) {
            results.failed.push({
              email: accountData.email,
              error: 'Account already exists'
            });
            continue;
          }
          
          // 创建账号
          const account = {
            id: crypto.randomUUID(),
            email: accountData.email,
            provider: 'kiro',
            enabled: accountData.enabled !== false,
            createdAt: Date.now(),
            region: accountData.region || 'us-east-1',
            
            // 认证方式
            authMethod: accountData.authMethod || (accountData.clientId ? 'oidc' : 'social'),
            
            // ProfileArn（从 OIDC JSON 提取或使用默认值）
            profileArn: accountData.profileArn || accountData.ssoProfileArn,
            
            // 根据认证类型设置字段
            ...(accountData.ssoToken && { ssoToken: accountData.ssoToken }),
            ...(accountData.accessToken && { accessToken: accountData.accessToken }),
            ...(accountData.refreshToken && { refreshToken: accountData.refreshToken }),
            ...(accountData.clientId && { clientId: accountData.clientId }),
            ...(accountData.clientSecret && { clientSecret: accountData.clientSecret }),
            ...(accountData.idToken && { idToken: accountData.idToken }),
            ...(accountData.expiresAt && { expiresAt: accountData.expiresAt }),
          };
          
          await env.ACCOUNTS.put(account.id, JSON.stringify(account));
          
          results.success.push({
            email: account.email,
            id: account.id
          });
        } catch (error) {
          results.failed.push({
            email: accountData.email || 'unknown',
            error: error.message
          });
        }
      }
      
      return jsonResponse({
        success: true,
        results,
        message: `Imported ${results.success.length} accounts, ${results.failed.length} failed`
      });
    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // DELETE /admin/accounts/:id - 删除账号
  if (path.startsWith('/admin/accounts/') && method === 'DELETE') {
    try {
      const accountId = path.split('/').pop();
      await env.ACCOUNTS.delete(accountId);
      return jsonResponse({ success: true, message: 'Account deleted' });
    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // PUT /admin/accounts/:id - 更新账号
  if (path.startsWith('/admin/accounts/') && method === 'PUT') {
    try {
      const accountId = path.split('/').pop();
      const data = await request.json();
      const account = await getAccount(env, accountId);
      
      if (!account) {
        return jsonResponse({ error: 'Account not found' }, 404);
      }
      
      // 更新字段
      Object.assign(account, data);
      await env.ACCOUNTS.put(accountId, JSON.stringify(account));
      
      const { ssoToken, accessToken, refreshToken, clientSecret, ...safeData } = account;
      return jsonResponse({ success: true, account: safeData });
    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // POST /admin/accounts/:id/refresh - 刷新 Token
  if (path.match(/^\/admin\/accounts\/[^\/]+\/refresh$/) && method === 'POST') {
    try {
      const accountId = path.split('/')[3];
      const result = await refreshKiroToken(env, accountId);
      return jsonResponse(result);
    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  }

  return jsonResponse({ error: 'Not implemented' }, 404);
}

// 通用代理请求处理（OpenAI/Anthropic/Gemini）
async function handleProxyRequest(request, env, path, url) {
  let provider = null;
  let targetUrl = '';
  let newPath = path;

  if (path.startsWith('/v1')) {
    provider = 'openai';
    targetUrl = 'https://api.openai.com';
  } else if (path.startsWith('/anthropic')) {
    provider = 'anthropic';
    targetUrl = 'https://api.anthropic.com';
    newPath = path.replace('/anthropic', '');
  } else if (path.startsWith('/gemini')) {
    provider = 'gemini';
    targetUrl = 'https://generativelanguage.googleapis.com';
    newPath = path.replace('/gemini', '');
  } else {
    return jsonResponse({ error: 'Invalid endpoint' }, 404);
  }

  const account = await getAvailableAccount(env, provider);
  
  if (!account) {
    return jsonResponse({ 
      error: 'No available accounts',
      provider: provider
    }, 503);
  }

  const proxyUrl = `${targetUrl}${newPath}${url.search}`;
  const headers = new Headers(request.headers);
  
  if (provider === 'openai') {
    headers.set('Authorization', `Bearer ${account.accessToken}`);
  } else if (provider === 'anthropic') {
    headers.set('x-api-key', account.accessToken);
  }
  
  headers.set('Host', new URL(targetUrl).host);

  try {
    const proxyRequest = new Request(proxyUrl, {
      method: request.method,
      headers: headers,
      body: request.body
    });

    const response = await fetch(proxyRequest);
    
    await recordRequest(env, account.id, response.ok);
    await updateAccountLastUsed(env, account.id);

    const proxyResponse = new Response(response.body, response);
    proxyResponse.headers.set('Access-Control-Allow-Origin', '*');
    
    return proxyResponse;
  } catch (error) {
    await recordRequest(env, account.id, false, error.message);
    return jsonResponse({ error: 'Proxy error', message: error.message }, 500);
  }
}

// 辅助函数
async function getAccount(env, id) {
  return await env.ACCOUNTS.get(id, 'json');
}

async function updateAccount(env, id, updates) {
  const existing = await getAccount(env, id);
  if (!existing) return null;
  
  const updated = { ...existing, ...updates };
  await env.ACCOUNTS.put(id, JSON.stringify(updated));
  return updated;
}

// 账号池配置
const ACCOUNT_POOL_CONFIG = {
  baseCooldownMs: 60000,          // 60s 基础冷却
  maxBackoffMultiplier: 1440,     // 最大 1440 倍 = 24h
  quotaResetMs: 3600000,          // 1h 配额重置
  probabilisticRetryChance: 0.1   // 10% 概率重试
};

// 错误类型分类
const ErrorType = {
  FATAL: 'fatal',           // 请求本身有问题 → 直接返回客户端，不切号
  RECOVERABLE: 'recoverable' // 账号问题 → 切换到下一个账号
};

// 根据 HTTP 状态码分类错误
function classifyError(statusCode, reason) {
  // RECOVERABLE: 配额/计费问题
  if (statusCode === 402) return ErrorType.RECOVERABLE;
  // RECOVERABLE: Token 过期/无效
  if (statusCode === 403) return ErrorType.RECOVERABLE;
  // RECOVERABLE: 限流
  if (statusCode === 429) return ErrorType.RECOVERABLE;
  // 400: 根据原因细分
  if (statusCode === 400) {
    // 上下文超限 → 所有账号都会失败
    if (reason === 'CONTENT_LENGTH_EXCEEDS_THRESHOLD') return ErrorType.FATAL;
    return ErrorType.FATAL;
  }
  // 422: 请求格式错误
  if (statusCode === 422) return ErrorType.FATAL;
  // 5xx: 服务端错误
  if (statusCode >= 500) return ErrorType.FATAL;
  return ErrorType.FATAL;
}

// 检查账号是否被封禁
function isSuspended(account) {
  return typeof account.suspendedAt === 'number' && account.suspendedAt > 0;
}

// 检查账号配额是否耗尽
function isQuotaExhausted(account, now = Date.now()) {
  // 如果配额已重置（过了重置时间），不再视为耗尽
  if (account.quotaResetAt && account.quotaResetAt <= now) {
    return false;
  }
  // 有明确的耗尽标记
  if (account.quotaExhaustedAt && account.quotaExhaustedAt > 0) {
    return true;
  }
  // 有配额数据且已用尽
  if (account.quotaLimit && account.quotaLimit > 0 && (account.quotaUsed || 0) >= account.quotaLimit) {
    return true;
  }
  return false;
}

// 检查账号是否可用（断路器 + 指数退避 + 概率重试）
function isAccountAvailable(account, now = Date.now()) {
  // 检查是否被封禁
  if (isSuspended(account)) {
    return false;
  }
  
  // 检查配额是否耗尽
  if (isQuotaExhausted(account, now)) {
    return false;
  }
  
  // 检查 token 是否过期（无 refreshToken 时直接判为不可用）
  if (account.expiresAt && account.expiresAt < now && !account.refreshToken) {
    return false;
  }
  
  // 检查是否被标记为不可用
  if (account.enabled === false) {
    return false;
  }
  
  // 断路器检查：指数退避 + 概率重试
  const failures = account.errorCount || 0;
  if (failures > 0 && account.lastUsed) {
    const timeSinceFailure = now - account.lastUsed;
    // 指数退避：base * 2^(failures-1)，封顶为 maxBackoffMultiplier
    const backoffMultiplier = Math.min(Math.pow(2, failures - 1), ACCOUNT_POOL_CONFIG.maxBackoffMultiplier);
    const effectiveCooldown = ACCOUNT_POOL_CONFIG.baseCooldownMs * backoffMultiplier;
    
    if (timeSinceFailure < effectiveCooldown) {
      // 未超出冷却期，用概率重试
      if (Math.random() > ACCOUNT_POOL_CONFIG.probabilisticRetryChance) {
        return false;
      }
      console.log(`[AccountPool] Probabilistic retry for ${account.email || account.id} (failures=${failures}, cooldown=${Math.round(effectiveCooldown / 1000)}s)`);
    }
  }
  
  return true;
}

// 获取可用账号（支持智能轮询）
async function getAvailableAccount(env, provider, excludeIds = new Set()) {
  const { keys } = await env.ACCOUNTS.list();
  const candidates = [];
  const now = Date.now();
  
  for (const key of keys) {
    const account = await env.ACCOUNTS.get(key.name, 'json');
    
    // 跳过不匹配的 provider 和已排除的账号
    if (!account || account.provider !== provider || excludeIds.has(account.id)) {
      continue;
    }
    
    // 检查账号是否可用
    if (isAccountAvailable(account, now)) {
      const hasValidToken = (account.accessToken || account.ssoToken || account.refreshToken);
      const notExpired = !account.expiresAt || account.expiresAt > now;
      
      // 优先选择有 expiresAt 且未过期的账号
      if (account.expiresAt && account.expiresAt > now && hasValidToken) {
        candidates.push({ ...account, priority: 1 });
      } else if (hasValidToken && notExpired) {
        // 降级：有 token 但没有 expiresAt 的账号
        candidates.push({ ...account, priority: 2 });
      }
    }
  }
  
  if (candidates.length === 0) {
    // 检查是否所有账号都因配额耗尽
    const allAccounts = [];
    for (const key of keys) {
      const account = await env.ACCOUNTS.get(key.name, 'json');
      if (account && account.provider === provider && !excludeIds.has(account.id)) {
        allAccounts.push(account);
      }
    }
    
    const allExhausted = allAccounts.length > 0 && allAccounts.every(a => isQuotaExhausted(a, now));
    if (allExhausted) {
      console.log(`[AccountPool] All ${allAccounts.length} accounts quota exhausted`);
    }
    
    return null;
  }
  
  // 按优先级排序，同优先级按最少使用排序
  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (a.lastUsed || 0) - (b.lastUsed || 0);
  });
  
  const selected = candidates[0];
  
  // 如果 token 即将过期（30分钟内），尝试自动刷新
  if (selected.expiresAt && selected.expiresAt - now < 1800000 && selected.refreshToken) {
    console.log(`[AccountPool] Token expiring soon for ${selected.email || selected.id}, refreshing...`);
    const refreshResult = await refreshKiroToken(env, selected.id);
    if (refreshResult.success) {
      // 重新获取更新后的账号
      return await env.ACCOUNTS.get(selected.id, 'json');
    }
  }
  
  return selected;
}

async function recordRequest(env, accountId, success, error = null, statusCode = null) {
  const key = `stats:${accountId}`;
  const stats = await env.STATS.get(key, 'json') || {
    totalRequests: 0,
    successRequests: 0,
    failedRequests: 0
  };
  
  stats.totalRequests++;
  if (success) {
    stats.successRequests++;
  } else {
    stats.failedRequests++;
    stats.lastError = error;
  }
  
  await env.STATS.put(key, JSON.stringify(stats));
  
  // 更新账号状态
  const account = await getAccount(env, accountId);
  if (account) {
    const now = Date.now();
    
    if (success) {
      // 成功：重置断路器
      account.errorCount = 0;
      account.lastUsed = now;
      account.enabled = true;
      
      // 清除配额耗尽标记（如果之前有）
      if (account.quotaExhaustedAt) {
        account.quotaExhaustedAt = undefined;
      }
    } else {
      // 失败：根据错误类型处理
      const errorType = classifyError(statusCode || 500, error);
      
      if (errorType === ErrorType.RECOVERABLE) {
        // 可恢复错误：增加失败计数，触发断路器
        account.errorCount = (account.errorCount || 0) + 1;
        account.lastUsed = now;
        
        // 配额类错误额外标记
        const isQuotaError = statusCode === 402 || statusCode === 429;
        if (isQuotaError) {
          account.quotaExhaustedAt = now;
          account.quotaResetAt = now + ACCOUNT_POOL_CONFIG.quotaResetMs;
        }
        
        // 计算退避时间用于日志
        const backoffMultiplier = Math.min(
          Math.pow(2, account.errorCount - 1), 
          ACCOUNT_POOL_CONFIG.maxBackoffMultiplier
        );
        const effectiveCooldown = ACCOUNT_POOL_CONFIG.baseCooldownMs * backoffMultiplier;
        const cooldownStr = effectiveCooldown < 60000 ? `${Math.round(effectiveCooldown / 1000)}s`
          : effectiveCooldown < 3600000 ? `${Math.round(effectiveCooldown / 60000)}m`
          : `${Math.round(effectiveCooldown / 3600000)}h`;
        
        console.log(`[AccountPool] Account ${account.email || accountId} failure #${account.errorCount}: status=${statusCode || '?'}, cooldown=${cooldownStr}`);
        
        // 检查是否需要标记为封禁（连续失败多次）
        if (account.errorCount >= 5 && (statusCode === 403 || statusCode === 401)) {
          account.suspendedAt = now;
          account.suspendReason = 'MULTIPLE_AUTH_FAILURES';
          account.suspendMessage = `Account suspended after ${account.errorCount} consecutive auth failures`;
          account.enabled = false;
          console.warn(`[AccountPool] Account ${account.email || accountId} SUSPENDED (${account.suspendReason})`);
        }
      }
      // FATAL 错误不修改账号状态
    }
    
    await env.ACCOUNTS.put(accountId, JSON.stringify(account));
  }
}

async function updateAccountLastUsed(env, id) {
  const account = await getAccount(env, id);
  if (account) {
    account.lastUsed = Date.now();
    await env.ACCOUNTS.put(id, JSON.stringify(account));
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

function corsResponse() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    }
  });
}

// 调试端点：返回 Kiro API 原始响应的详细信息
async function handleKiroDebug(request, env) {
  try {
    const account = await getAvailableAccount(env, 'kiro');
    
    if (!account) {
      return jsonResponse({
        error: 'No available account',
        message: 'No Kiro accounts found in the pool'
      }, 503);
    }
    
    const debugInfo = {
      account: {
        id: account.id.substring(0, 8) + '...',
        email: account.email,
        hasAccessToken: !!account.accessToken,
        tokenLength: account.accessToken ? account.accessToken.length : 0,
        expiresAt: account.expiresAt,
        expiresIn: account.expiresAt ? Math.round((account.expiresAt - Date.now()) / 1000) : null
      }
    };
    
    // 构建测试请求
    const testPayload = {
      conversationState: {
        conversationId: 'debug-' + Date.now(),
        history: [],
        currentMessage: {
          utteranceId: 'user-1',
          userIntent: 'SUGGEST_ALTERNATE_IMPLEMENTATION',
          body: 'Say exactly: "Debug test successful" and nothing else.'
        },
        chatTriggerType: 'MANUAL'
      },
      profileArn: resolveProfileArn(account)
    };
    
    const region = account.region || 'us-east-1';
    const kiroUrl = `https://codewhisperer.${region}.amazonaws.com/generateAssistantResponse`;
    
    debugInfo.request = {
      url: kiroUrl,
      profileArn: testPayload.profileArn
    };
    
    // 发送请求
    const kiroResponse = await fetch(kiroUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${account.accessToken}`,
        'x-amzn-kiro-agent-mode': 'spec',
        'x-amz-user-agent': getKiroAmzUserAgent(),
        'user-agent': getKiroUserAgent(),
        'amz-sdk-invocation-id': generateUUID(),
        'amz-sdk-request': 'attempt=1; max=3'
      },
      body: JSON.stringify(testPayload)
    });
    
    debugInfo.response = {
      status: kiroResponse.status,
      statusText: kiroResponse.statusText,
      contentType: kiroResponse.headers.get('content-type')
    };
    
    if (!kiroResponse.ok) {
      const errorText = await kiroResponse.text();
      debugInfo.response.error = errorText;
      return jsonResponse(debugInfo, kiroResponse.status);
    }
    
    // 读取二进制响应
    const arrayBuffer = await kiroResponse.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    debugInfo.response.size = buffer.length;
    debugInfo.response.firstBytes = Array.from(buffer.slice(0, 64)).map(b => 
      b.toString(16).padStart(2, '0')
    ).join(' ');
    
    // 解析事件流
    let offset = 0;
    const events = [];
    let extractedContent = '';
    
    while (offset < buffer.length && events.length < 20) {
      if (offset + 16 > buffer.length) break;
      
      const totalLength = (buffer[offset] << 24) | (buffer[offset + 1] << 16) | 
                         (buffer[offset + 2] << 8) | buffer[offset + 3];
      
      if (totalLength === 0 || totalLength > 1000000 || offset + totalLength > buffer.length) break;
      
      const headersLength = (buffer[offset + 4] << 24) | (buffer[offset + 5] << 16) | 
                           (buffer[offset + 6] << 8) | buffer[offset + 7];
      
      const payloadStart = offset + 12 + headersLength;
      const payloadEnd = offset + totalLength - 4;
      
      if (payloadStart < payloadEnd) {
        const payloadBytes = buffer.slice(payloadStart, payloadEnd);
        const payloadText = new TextDecoder().decode(payloadBytes);
        
        try {
          const event = JSON.parse(payloadText);
          const eventInfo = {
            offset,
            totalLength,
            keys: Object.keys(event)
          };
          
          if (event.assistantResponseEvent && event.assistantResponseEvent.content) {
            eventInfo.content = event.assistantResponseEvent.content;
            extractedContent += event.assistantResponseEvent.content;
          }
          
          if (event.codeEvent && event.codeEvent.content) {
            eventInfo.codeContent = event.codeEvent.content;
            extractedContent += event.codeEvent.content;
          }
          
          if (event.messageMetadataEvent) {
            eventInfo.metadata = event.messageMetadataEvent;
          }
          
          events.push(eventInfo);
        } catch (e) {
          events.push({
            offset,
            error: e.message,
            preview: payloadText.substring(0, 100)
          });
        }
      }
      
      offset += totalLength;
    }
    
    debugInfo.parsing = {
      totalEvents: events.length,
      extractedContentLength: extractedContent.length,
      extractedContent: extractedContent,
      events: events
    };
    
    return jsonResponse(debugInfo);
    
  } catch (error) {
    return jsonResponse({
      error: 'Debug endpoint error',
      message: error.message,
      stack: error.stack
    }, 500);
  }
}
