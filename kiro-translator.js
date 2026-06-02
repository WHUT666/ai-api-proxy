// Kiro API 格式转换模块
// 基于 Kiro Account Manager 的实现

// 模型 ID 映射
const MODEL_ID_MAP = {
  // Claude 4.5 系列
  'claude-sonnet-4-5': 'claude-sonnet-4.5',
  'claude-sonnet-4.5': 'claude-sonnet-4.5',
  'claude-haiku-4-5': 'claude-haiku-4.5',
  'claude-haiku-4.5': 'claude-haiku-4.5',
  'claude-opus-4-5': 'claude-opus-4.5',
  'claude-opus-4.5': 'claude-opus-4.5',
  
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
  systemPrompt = `[Context: Current time is ${timestamp}]\n\n${systemPrompt}`;
  
  // 构建历史消息
  const history = [];
  let currentUserMessage = null;
  
  for (let i = 0; i < nonSystemMessages.length - 1; i++) {
    const msg = nonSystemMessages[i];
    
    if (msg.role === 'user') {
      history.push({
        userInputMessage: {
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          userInputMessageContext: {
            appStudioState: {
              programmingLanguage: { languageName: 'plaintext' }
            }
          }
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
  if (lastMessage && lastMessage.role === 'user') {
    currentUserMessage = typeof lastMessage.content === 'string' 
      ? lastMessage.content 
      : JSON.stringify(lastMessage.content);
  }
  
  // 构建 Kiro payload
  const payload = {
    conversationState: {
      currentMessage: {
        userInputMessage: {
          content: currentUserMessage || 'Hello',
          userInputMessageContext: {
            appStudioState: {
              programmingLanguage: { languageName: 'plaintext' }
            }
          }
        }
      },
      chatTriggerType: 'MANUAL',
      history: history
    },
    origin: 'AI_EDITOR',
    modelId: modelId
  };
  
  // 添加系统提示
  if (systemPrompt) {
    payload.conversationState.currentMessage.userInputMessage.content = 
      `${systemPrompt}\n\n${payload.conversationState.currentMessage.userInputMessage.content}`;
  }
  
  // 添加 profileArn（如果有）
  if (profileArn) {
    payload.profileArn = profileArn;
  }
  
  return payload;
}

// Kiro 响应 → OpenAI 格式
function kiroToOpenai(kiroResponse, model) {
  // 解析 Kiro 的流式响应
  let content = '';
  let inputTokens = 0;
  let outputTokens = 0;
  
  // Kiro 返回的是事件流，需要解析
  // 这里简化处理，假设已经收集了所有内容
  if (typeof kiroResponse === 'string') {
    content = kiroResponse;
  } else if (kiroResponse.content) {
    content = kiroResponse.content;
  }
  
  // 使用统计
  if (kiroResponse.usage) {
    inputTokens = kiroResponse.usage.inputTokens || 0;
    outputTokens = kiroResponse.usage.outputTokens || 0;
  }
  
  return {
    id: `chatcmpl-${generateUUID()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: content
      },
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens
    }
  };
}

// 生成 UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 解析 Kiro 的事件流
async function parseKiroStream(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let usage = null;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data:')) continue;
        
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        
        try {
          const event = JSON.parse(data);
          
          // assistantResponseEvent - 文本内容
          if (event.assistantResponseEvent) {
            content += event.assistantResponseEvent.content || '';
          }
          
          // codeEvent - 代码内容
          if (event.codeEvent) {
            content += event.codeEvent.content || '';
          }
          
          // tokenUsage - 使用统计
          if (event.tokenUsage) {
            usage = {
              inputTokens: event.tokenUsage.inputTokens || 0,
              outputTokens: event.tokenUsage.outputTokens || 0
            };
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  
  return { content, usage };
}

// 导出函数
export {
  mapModelId,
  openaiToKiro,
  kiroToOpenai,
  parseKiroStream,
  generateUUID
};
