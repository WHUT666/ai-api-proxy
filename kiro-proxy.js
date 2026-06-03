const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
const adminRouter = express.Router();

const ADMIN_KEY = process.env.ADMIN_KEY || 'kiro-admin-2024';
const ACCOUNTS_FILE = path.join(__dirname, 'accounts_active.json');
const INITIAL_ACCOUNTS_FILE = path.join(__dirname, 'accounts_part7.json');

// Kiro 默认配置
const KIRO_SOCIAL_PROFILE_ARN = 'arn:aws:codewhisperer:us-east-1:699475941385:profile/EHGA3GRVQMUK';
const KIRO_BUILDER_ID_PROFILE_ARN = 'arn:aws:codewhisperer:us-east-1:638616132270:profile/AAAACCCCXXXX';

// 账号故障处理 & 退避机制配置
const COOLDOWN_CONFIG = {
  baseCooldownMs: 60000,        // 60秒 基础冷却
  maxBackoffMultiplier: 1440,   // 最大退避 1440倍 (24小时)
  quotaResetMs: 3600000         // 配额重置 1小时
};

const ErrorType = {
  FATAL: 'fatal',
  RECOVERABLE: 'recoverable'
};

// 1. ==================== 账号存储 & 管理 ====================

class LocalAccountPool {
  constructor() {
    this.accounts = [];
    this.loadAccounts();
  }

  loadAccounts() {
    try {
      if (fs.existsSync(ACCOUNTS_FILE)) {
        const data = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
        this.accounts = JSON.parse(data);
        console.log(`[LocalAccountPool] Loaded ${this.accounts.length} active accounts from disk.`);
      } else if (fs.existsSync(INITIAL_ACCOUNTS_FILE)) {
        console.log(`[LocalAccountPool] active file not found. Loading from part7 initial file.`);
        const data = fs.readFileSync(INITIAL_ACCOUNTS_FILE, 'utf8');
        const rawAccounts = JSON.parse(data);
        
        this.accounts = rawAccounts.map(account => ({
          id: account.id || crypto.randomBytes(16).toString('hex'),
          email: account.email,
          clientId: account.clientId,
          clientSecret: account.clientSecret,
          refreshToken: account.refreshToken,
          region: account.region || 'us-east-1',
          provider: 'kiro',
          authMethod: account.authMethod || 'oidc',
          profileArn: account.profileArn || KIRO_BUILDER_ID_PROFILE_ARN,
          enabled: true,
          errorCount: 0,
          createdAt: Date.now()
        }));
        this.saveAccounts();
      } else {
        console.log('[LocalAccountPool] No account files found. Starting with empty pool.');
        this.accounts = [];
      }
    } catch (e) {
      console.error('[LocalAccountPool] Failed to load accounts:', e);
      this.accounts = [];
    }
  }

  saveAccounts() {
    try {
      fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(this.accounts, null, 2), 'utf8');
    } catch (e) {
      console.error('[LocalAccountPool] Failed to save accounts:', e);
    }
  }

  getAccounts() {
    return this.accounts;
  }

  getAccount(id) {
    return this.accounts.find(a => a.id === id);
  }

  addAccount(accountData) {
    const id = crypto.randomBytes(16).toString('hex');
    const newAccount = {
      id,
      email: accountData.email,
      clientId: accountData.clientId,
      clientSecret: accountData.clientSecret,
      refreshToken: accountData.refreshToken,
      region: accountData.region || 'us-east-1',
      provider: 'kiro',
      authMethod: accountData.authMethod || 'oidc',
      profileArn: accountData.profileArn || KIRO_BUILDER_ID_PROFILE_ARN,
      enabled: true,
      errorCount: 0,
      createdAt: Date.now()
    };
    this.accounts.push(newAccount);
    this.saveAccounts();
    return newAccount;
  }

  updateAccount(id, updates) {
    const account = this.getAccount(id);
    if (account) {
      Object.assign(account, updates);
      this.saveAccounts();
      return true;
    }
    return false;
  }

  deleteAccount(id) {
    const index = this.accounts.findIndex(a => a.id === id);
    if (index !== -1) {
      this.accounts.splice(index, 1);
      this.saveAccounts();
      return true;
    }
    return false;
  }

  classifyError(statusCode, errorMsg) {
    const msg = (errorMsg || '').toLowerCase();
    if (statusCode === 400) return ErrorType.FATAL;
    if (
      statusCode === 401 || 
      statusCode === 403 || 
      statusCode === 402 || 
      statusCode === 429 || 
      statusCode >= 500 ||
      msg.includes('fetch') || 
      msg.includes('timeout') || 
      msg.includes('network')
    ) {
      return ErrorType.RECOVERABLE;
    }
    return ErrorType.FATAL;
  }

  getAvailableAccount(excludeIds = new Set()) {
    const now = Date.now();
    const candidates = [];

    for (const account of this.accounts) {
      if (excludeIds.has(account.id)) continue;
      if (account.suspendedAt) continue;
      if (account.enabled === false) continue;

      if (account.quotaExhaustedAt) {
        if (now < account.quotaExhaustedAt + COOLDOWN_CONFIG.quotaResetMs) {
          continue;
        } else {
          account.quotaExhaustedAt = undefined;
        }
      }

      if (account.errorCount > 0 && account.lastUsed) {
        const backoffMultiplier = Math.min(
          Math.pow(2, account.errorCount - 1),
          COOLDOWN_CONFIG.maxBackoffMultiplier
        );
        const cooldownDuration = COOLDOWN_CONFIG.baseCooldownMs * backoffMultiplier;
        if (now < account.lastUsed + cooldownDuration) {
          continue;
        }
      }

      const hasValidToken = !!(account.accessToken || account.ssoToken || account.refreshToken);
      if (!hasValidToken) continue;

      const priority = (account.expiresAt && account.expiresAt > now) ? 1 : 2;
      candidates.push({ ...account, priority });
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (a.lastUsed || 0) - (b.lastUsed || 0);
    });

    return this.getAccount(candidates[0].id);
  }

  async recordRequest(accountId, success, errorMsg = null, statusCode = null) {
    const account = this.getAccount(accountId);
    if (!account) return;

    const now = Date.now();
    if (!account.stats) {
      account.stats = { total: 0, success: 0, failed: 0 };
    }
    account.stats.total++;

    if (success) {
      account.stats.success++;
      account.errorCount = 0;
      account.lastUsed = now;
      account.enabled = true;
      if (account.quotaExhaustedAt) {
        account.quotaExhaustedAt = undefined;
      }
    } else {
      account.stats.failed++;
      const errorType = this.classifyError(statusCode, errorMsg);

      if (errorType === ErrorType.RECOVERABLE) {
        account.errorCount = (account.errorCount || 0) + 1;
        account.lastUsed = now;

        if (statusCode === 402 || statusCode === 429) {
          account.quotaExhaustedAt = now;
        }

        if (account.errorCount >= 5 && (statusCode === 403 || statusCode === 401)) {
          account.suspendedAt = now;
          account.suspendReason = 'MULTIPLE_AUTH_FAILURES';
          account.suspendMessage = `Suspended after ${account.errorCount} consecutive auth failures`;
          account.enabled = false;
          console.warn(`[LocalAccountPool] Account ${account.email || account.id} SUSPENDED.`);
        }
      }
    }
    this.saveAccounts();
  }
}

const pool = new LocalAccountPool();

// 2. ==================== Token 刷新逻辑 ====================

async function refreshKiroToken(accountId) {
  const account = pool.getAccount(accountId);
  if (!account) return { success: false, error: 'Account not found' };

  try {
    const region = account.region || 'us-east-1';
    const authMethod = account.authMethod || 'oidc';

    if (authMethod === 'social' && account.refreshToken) {
      const tokenUrl = 'https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken';
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AWS-Toolkit-For-VSCode/3.148.0'
        },
        body: JSON.stringify({ refreshToken: account.refreshToken })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Social refresh failed: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      pool.updateAccount(accountId, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || account.refreshToken,
        expiresAt: Date.now() + (data.expiresIn || 3600) * 1000,
        enabled: true
      });
      return { success: true, accessToken: data.accessToken };
    }

    if (account.clientId && account.clientSecret && account.refreshToken) {
      const tokenUrl = `https://oidc.${region}.amazonaws.com/token`;
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: account.clientId,
          clientSecret: account.clientSecret,
          refreshToken: account.refreshToken,
          grantType: 'refresh_token'
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OIDC refresh failed: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      pool.updateAccount(accountId, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || account.refreshToken,
        idToken: data.idToken,
        expiresAt: Date.now() + (data.expiresIn || 3600) * 1000,
        enabled: true
      });
      return { success: true, accessToken: data.accessToken };
    }

    return { success: false, error: 'No refresh credentials available' };
  } catch (error) {
    console.error(`[TokenRefresh] Failed for ${account.email || accountId}:`, error.message);
    pool.updateAccount(accountId, { enabled: false });
    return { success: false, error: error.message };
  }
}

// 3. ==================== 格式映射与翻译器 ====================

const MODEL_ID_MAP = {
  'claude-3-5-sonnet': 'claude-sonnet-4.5',
  'claude-3-opus': 'claude-sonnet-4.5',
  'claude-3-sonnet': 'claude-sonnet-4',
  'claude-3-haiku': 'claude-haiku-4.5',
  'gpt-4': 'claude-sonnet-4.5',
  'gpt-4o': 'claude-sonnet-4.5',
  'gpt-4-turbo': 'claude-sonnet-4.5',
  'gpt-3.5-turbo': 'claude-sonnet-4.5',
  'default': 'claude-sonnet-4.5'
};

function mapModelId(model) {
  if (!model || typeof model !== 'string') return MODEL_ID_MAP.default;
  const m = model.trim().toLowerCase();
  if (MODEL_ID_MAP[m]) return MODEL_ID_MAP[m];
  for (const [k, v] of Object.entries(MODEL_ID_MAP)) {
    if (m.includes(k) || k.includes(m)) return v;
  }
  return MODEL_ID_MAP.default;
}

function resolveProfileArn(account) {
  if (account.profileArn) return account.profileArn;
  if (account.authMethod === 'social') return KIRO_SOCIAL_PROFILE_ARN;
  return KIRO_BUILDER_ID_PROFILE_ARN;
}

// OpenAI 格式转 Kiro Payload
function openaiToKiro(request, profileArn) {
  const modelId = mapModelId(request.model);
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

  const timestamp = new Date().toISOString();
  systemPrompt = `[Context: Current time is ${timestamp}]\n\n${systemPrompt}`;

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

  const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
  let currentUserMessage = 'Hello';
  if (lastMessage && lastMessage.role === 'user') {
    currentUserMessage = typeof lastMessage.content === 'string' 
      ? lastMessage.content 
      : JSON.stringify(lastMessage.content);
  }

  if (systemPrompt.trim()) {
    currentUserMessage = `${systemPrompt}\n\n${currentUserMessage}`;
  }

  const payload = {
    conversationState: {
      agentContinuationId: crypto.randomUUID(),
      agentTaskType: 'vibe',
      chatTriggerType: 'MANUAL',
      conversationId: crypto.randomUUID(),
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

  if (profileArn) {
    payload.profileArn = profileArn;
  }

  return payload;
}

// Anthropic/Claude 格式转 Kiro Payload
function claudeToKiro(request, profileArn) {
  const modelId = mapModelId(request.model);
  let systemPrompt = '';
  if (typeof request.system === 'string') {
    systemPrompt = request.system;
  } else if (Array.isArray(request.system)) {
    systemPrompt = request.system.map(s => s.text || '').join('\n');
  }

  const timestamp = new Date().toISOString();
  systemPrompt = `[Context: Current time is ${timestamp}]\n\n${systemPrompt}`;

  const history = [];
  const nonSystemMessages = request.messages || [];

  for (let i = 0; i < nonSystemMessages.length - 1; i++) {
    const msg = nonSystemMessages[i];
    let msgContent = '';
    if (typeof msg.content === 'string') {
      msgContent = msg.content;
    } else if (Array.isArray(msg.content)) {
      msgContent = msg.content.map(block => block.text || '').join('\n');
    }

    if (msg.role === 'user') {
      history.push({
        userInputMessage: {
          content: msgContent,
          origin: 'AI_EDITOR',
          modelId: modelId
        }
      });
    } else if (msg.role === 'assistant') {
      history.push({
        assistantResponseMessage: {
          content: msgContent
        }
      });
    }
  }

  const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
  let currentUserMessage = 'Hello';
  if (lastMessage) {
    if (typeof lastMessage.content === 'string') {
      currentUserMessage = lastMessage.content;
    } else if (Array.isArray(lastMessage.content)) {
      currentUserMessage = lastMessage.content.map(block => block.text || '').join('\n');
    }
  }

  if (systemPrompt.trim()) {
    currentUserMessage = `${systemPrompt}\n\n${currentUserMessage}`;
  }

  const payload = {
    conversationState: {
      agentContinuationId: crypto.randomUUID(),
      agentTaskType: 'vibe',
      chatTriggerType: 'MANUAL',
      conversationId: crypto.randomUUID(),
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

  if (profileArn) {
    payload.profileArn = profileArn;
  }

  return payload;
}

// Responses 格式转 OpenAI 格式
function responsesToOpenAIChat(request) {
  const messages = [];
  if (request.instructions) {
    messages.push({ role: 'system', content: request.instructions });
  }

  if (typeof request.input === 'string') {
    messages.push({ role: 'user', content: request.input });
  } else if (Array.isArray(request.input)) {
    for (const item of request.input) {
      if (item.type === 'message') {
        messages.push({
          role: item.role === 'assistant' ? 'assistant' : 'user',
          content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content)
        });
      }
    }
  }

  const chatReq = {
    model: request.model || 'gpt-4o',
    messages,
    stream: request.stream === true
  };
  if (request.temperature !== undefined) chatReq.temperature = request.temperature;
  if (request.max_output_tokens !== undefined) chatReq.max_tokens = request.max_output_tokens;
  return chatReq;
}

// OpenAI 响应转 Responses 响应
function openAIChatToResponsesResponse(response) {
  const choice = response.choices[0];
  const output = [{
    type: 'message',
    id: `msg_${crypto.randomUUID()}`,
    role: 'assistant',
    content: [{ type: 'output_text', text: choice.message.content || '' }]
  }];

  return {
    id: `resp_${crypto.randomUUID()}`,
    object: 'response',
    created_at: response.created,
    model: response.model,
    output,
    usage: {
      input_tokens: response.usage.prompt_tokens,
      output_tokens: response.usage.completion_tokens,
      total_tokens: response.usage.total_tokens
    }
  };
}

// 4. ==================== AWS Event Stream 二进制流式解析器 ====================

function extractEventType(headersBuffer) {
  let offset = 0;
  while (offset < headersBuffer.length) {
    if (offset >= headersBuffer.length) break;
    const nameLen = headersBuffer[offset];
    offset++;
    if (offset + nameLen > headersBuffer.length) break;
    const name = new TextDecoder().decode(headersBuffer.slice(offset, offset + nameLen));
    offset += nameLen;
    if (offset >= headersBuffer.length) break;
    const valueType = headersBuffer[offset];
    offset++;
    
    if (valueType === 7) {
      if (offset + 2 > headersBuffer.length) break;
      const valueLen = (headersBuffer[offset] << 8) | headersBuffer[offset + 1];
      offset += 2;
      if (offset + valueLen > headersBuffer.length) break;
      const value = new TextDecoder().decode(headersBuffer.slice(offset, offset + valueLen));
      offset += valueLen;
      if (name === ':event-type') {
        return value;
      }
      continue;
    }
    
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
  return '';
}

// 4.1 OpenAI 流式输出解析
async function parseEventStreamToClient(res, responseBody, model, requestId) {
  let buffer = Buffer.alloc(0);
  
  for await (const chunk of responseBody) {
    buffer = Buffer.concat([buffer, chunk]);
    
    while (buffer.length >= 16) {
      const totalLength = buffer.readUInt32BE(0);
      if (buffer.length < totalLength) break;
      
      const headersLength = buffer.readUInt32BE(4);
      const eventType = extractEventType(buffer.subarray(12, 12 + headersLength));
      
      const payloadStart = 12 + headersLength;
      const payloadEnd = totalLength - 4;
      
      if (payloadStart < payloadEnd) {
        const payloadBytes = buffer.subarray(payloadStart, payloadEnd);
        try {
          const payloadText = new TextDecoder().decode(payloadBytes);
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
              model: model,
              choices: [{
                index: 0,
                delta: { content },
                finish_reason: null
              }]
            };
            res.write(`data: ${JSON.stringify(streamChunk)}\n\n`);
          }
          
          if (eventType === 'toolUseEvent' || event.toolUseEvent) {
            const toolUse = event.toolUseEvent || event;
            const toolChunk = {
              id: requestId,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: model,
              choices: [{
                index: 0,
                delta: {
                  tool_calls: [{
                    index: 0,
                    id: toolUse.toolUseId,
                    type: 'function',
                    function: {
                      name: toolUse.name,
                      arguments: typeof toolUse.input === 'string' ? toolUse.input : JSON.stringify(toolUse.input)
                    }
                  }]
                },
                finish_reason: toolUse.stop ? 'tool_calls' : null
              }]
            };
            res.write(`data: ${JSON.stringify(toolChunk)}\n\n`);
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
    model: model,
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
  };
  res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
}

// 4.2 Anthropic/Claude 流式输出解析
async function parseEventStreamToClaudeClient(res, responseBody, model, requestId) {
  let buffer = Buffer.alloc(0);
  let hasSentStart = false;
  let textBlockStarted = false;

  // 1. 发送 message_start 事件
  const messageStart = {
    type: 'message_start',
    message: {
      id: requestId,
      type: 'message',
      role: 'assistant',
      model: model,
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 }
    }
  };
  res.write(`event: message_start\ndata: ${JSON.stringify(messageStart)}\n\n`);
  hasSentStart = true;

  for await (const chunk of responseBody) {
    buffer = Buffer.concat([buffer, chunk]);
    
    while (buffer.length >= 16) {
      const totalLength = buffer.readUInt32BE(0);
      if (buffer.length < totalLength) break;
      
      const headersLength = buffer.readUInt32BE(4);
      const eventType = extractEventType(buffer.subarray(12, 12 + headersLength));
      
      const payloadStart = 12 + headersLength;
      const payloadEnd = totalLength - 4;
      
      if (payloadStart < payloadEnd) {
        const payloadBytes = buffer.subarray(payloadStart, payloadEnd);
        try {
          const payloadText = new TextDecoder().decode(payloadBytes);
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
            // 如果还没触发 content_block_start，先发送
            if (!textBlockStarted) {
              const blockStart = {
                type: 'content_block_start',
                index: 0,
                content_block: { type: 'text', text: '' }
              };
              res.write(`event: content_block_start\ndata: ${JSON.stringify(blockStart)}\n\n`);
              textBlockStarted = true;
            }

            const blockDelta = {
              type: 'content_block_delta',
              index: 0,
              delta: { type: 'text_delta', text: content }
            };
            res.write(`event: content_block_delta\ndata: ${JSON.stringify(blockDelta)}\n\n`);
          }
          
          // 对 tool_useEvent 暂时按 Anthropic content_block 流化推送
          if (eventType === 'toolUseEvent' || event.toolUseEvent) {
            const toolUse = event.toolUseEvent || event;
            const toolBlockStart = {
              type: 'content_block_start',
              index: 1,
              content_block: { type: 'tool_use', id: toolUse.toolUseId, name: toolUse.name, input: {} }
            };
            res.write(`event: content_block_start\ndata: ${JSON.stringify(toolBlockStart)}\n\n`);

            const toolDelta = {
              type: 'content_block_delta',
              index: 1,
              delta: { type: 'input_json_delta', partial_json: typeof toolUse.input === 'string' ? toolUse.input : JSON.stringify(toolUse.input) }
            };
            res.write(`event: content_block_delta\ndata: ${JSON.stringify(toolDelta)}\n\n`);
            
            if (toolUse.stop) {
              const toolBlockStop = { type: 'content_block_stop', index: 1 };
              res.write(`event: content_block_stop\ndata: ${JSON.stringify(toolBlockStop)}\n\n`);
            }
          }
        } catch (e) {}
      }
      buffer = buffer.subarray(totalLength);
    }
  }

  // 终结内容块并发送 message_stop
  if (textBlockStarted) {
    const blockStop = { type: 'content_block_stop', index: 0 };
    res.write(`event: content_block_stop\ndata: ${JSON.stringify(blockStop)}\n\n`);
  }

  const messageDelta = {
    type: 'message_delta',
    delta: { stop_reason: 'end_turn', stop_sequence: null },
    usage: { output_tokens: 0 }
  };
  res.write(`event: message_delta\ndata: ${JSON.stringify(messageDelta)}\n\n`);

  const messageStop = { type: 'message_stop' };
  res.write(`event: message_stop\ndata: ${JSON.stringify(messageStop)}\n\n`);
  res.end();
}

// 解析完整的非流式二进制 AWS Event Stream
async function parseEventStreamToText(responseBody) {
  let buffer = Buffer.alloc(0);
  let content = '';
  
  for await (const chunk of responseBody) {
    buffer = Buffer.concat([buffer, chunk]);
    
    while (buffer.length >= 16) {
      const totalLength = buffer.readUInt32BE(0);
      if (buffer.length < totalLength) break;
      
      const headersLength = buffer.readUInt32BE(4);
      const eventType = extractEventType(buffer.subarray(12, 12 + headersLength));
      const payloadStart = 12 + headersLength;
      const payloadEnd = totalLength - 4;
      
      if (payloadStart < payloadEnd) {
        const payloadBytes = buffer.subarray(payloadStart, payloadEnd);
        try {
          const payloadText = new TextDecoder().decode(payloadBytes);
          const event = JSON.parse(payloadText);
          
          if (eventType === 'assistantResponseEvent' || event.assistantResponseEvent) {
            const assistantResp = event.assistantResponseEvent || event;
            if (assistantResp.content) content += assistantResp.content;
          } else if (eventType === 'codeEvent' || event.codeEvent) {
            const codeResp = event.codeEvent || event;
            if (codeResp.content) content += codeResp.content;
          }
        } catch (e) {}
      }
      buffer = buffer.subarray(totalLength);
    }
  }
  return content;
}

// 5. ==================== API 核心端点路由 ====================

// OpenAI 兼容的模型列表
router.get('/v1/models', (req, res) => {
  res.json({
    object: 'list',
    data: [
      { id: 'gpt-4', object: 'model', created: 1686935002, owned_by: 'kiro' },
      { id: 'gpt-4o', object: 'model', created: 1686935002, owned_by: 'kiro' },
      { id: 'claude-3-5-sonnet', object: 'model', created: 1686935002, owned_by: 'kiro' },
      { id: 'claude-sonnet-4.5', object: 'model', created: 1686935002, owned_by: 'kiro' }
    ]
  });
});

// 5.1 OpenAI 兼容聊天接口
router.post('/v1/chat/completions', async (req, res) => {
  const excludeIds = new Set();
  let retryCount = 0;
  const maxRetries = 3;

  const requestBody = req.body;
  const stream = requestBody.stream === true;
  const model = requestBody.model || 'gpt-4o';
  const requestId = `chatcmpl-${crypto.randomUUID()}`;

  while (retryCount < maxRetries) {
    const account = pool.getAvailableAccount(excludeIds);
    if (!account) {
      return res.status(503).json({
        error: 'No available Kiro accounts',
        message: 'No active accounts found in the local pool, or all accounts are in cooldown/quota-limit.'
      });
    }

    if (account.expiresAt && account.expiresAt < Date.now() + 300000) {
      await refreshKiroToken(account.id);
    }

    const region = account.region || 'us-east-1';
    const kiroUrl = `https://codewhisperer.${region}.amazonaws.com/generateAssistantResponse`;
    const profileArn = resolveProfileArn(account);
    const kiroPayload = openaiToKiro(requestBody, profileArn);

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${account.accessToken || account.ssoToken}`,
      'x-amzn-kiro-agent-mode': 'spec',
      'x-amz-user-agent': 'aws-sdk-js/3.698.0 KiroIDE-1.0.0',
      'user-agent': 'aws-sdk-js/3.698.0 ua/2.1 os/linux lang/js md/nodejs#20.0.0 api/codewhispererstreaming#2024-11-20 m/E KiroIDE-1.0.0',
      'amz-sdk-invocation-id': crypto.randomUUID(),
      'amz-sdk-request': `attempt=${retryCount + 1}; max=3`
    };

    try {
      console.log(`[KiroProxy][OpenAI] Forwarding to ${kiroUrl} using: ${account.email}`);
      const response = await fetch(kiroUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(kiroPayload)
      });

      const statusCode = response.status;

      if (statusCode === 401 || statusCode === 403) {
        const refreshResult = await refreshKiroToken(account.id);
        if (refreshResult.success) {
          headers['Authorization'] = `Bearer ${refreshResult.accessToken}`;
          const retryResponse = await fetch(kiroUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(kiroPayload)
          });
          
          if (retryResponse.ok) {
            pool.recordRequest(account.id, true);
            if (stream) {
              res.setHeader('Content-Type', 'text/event-stream');
              res.setHeader('Cache-Control', 'no-cache');
              res.setHeader('Connection', 'keep-alive');
              await parseEventStreamToClient(res, retryResponse.body, model, requestId);
            } else {
              const content = await parseEventStreamToText(retryResponse.body);
              res.json({
                id: requestId,
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model,
                choices: [{
                  index: 0,
                  message: { role: 'assistant', content },
                  finish_reason: 'stop'
                }],
                usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
              });
            }
            return;
          }
        }
        
        pool.recordRequest(account.id, false, 'Auth error', statusCode);
        excludeIds.add(account.id);
        retryCount++;
        continue;
      }

      if (statusCode === 402 || statusCode === 429) {
        pool.recordRequest(account.id, false, 'Quota or rate limit', statusCode);
        excludeIds.add(account.id);
        retryCount++;
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        pool.recordRequest(account.id, false, errorText, statusCode);
        excludeIds.add(account.id);
        retryCount++;
        continue;
      }

      pool.recordRequest(account.id, true);

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        await parseEventStreamToClient(res, response.body, model, requestId);
      } else {
        const content = await parseEventStreamToText(response.body);
        res.json({
          id: requestId,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [{
            index: 0,
            message: { role: 'assistant', content },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
        });
      }
      return;

    } catch (err) {
      console.error(`[KiroProxy] OpenAI error:`, err.message);
      pool.recordRequest(account.id, false, err.message, 500);
      excludeIds.add(account.id);
      retryCount++;
    }
  }

  res.status(500).json({ error: 'Proxy Error', message: 'Failed after retrying all available accounts.' });
});

// 5.2 Anthropic/Claude 兼容消息端点
const handleClaudeRoute = async (req, res) => {
  const excludeIds = new Set();
  let retryCount = 0;
  const maxRetries = 3;

  const requestBody = req.body;
  const stream = requestBody.stream === true;
  const model = requestBody.model || 'claude-3-5-sonnet';
  const requestId = `msg_${crypto.randomUUID()}`;

  while (retryCount < maxRetries) {
    const account = pool.getAvailableAccount(excludeIds);
    if (!account) {
      return res.status(503).json({
        error: { type: 'overloaded_error', message: 'No available Kiro accounts in pool' }
      });
    }

    if (account.expiresAt && account.expiresAt < Date.now() + 300000) {
      await refreshKiroToken(account.id);
    }

    const region = account.region || 'us-east-1';
    const kiroUrl = `https://codewhisperer.${region}.amazonaws.com/generateAssistantResponse`;
    const profileArn = resolveProfileArn(account);
    const kiroPayload = claudeToKiro(requestBody, profileArn);

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${account.accessToken || account.ssoToken}`,
      'x-amzn-kiro-agent-mode': 'spec',
      'x-amz-user-agent': 'aws-sdk-js/3.698.0 KiroIDE-1.0.0',
      'user-agent': 'aws-sdk-js/3.698.0 ua/2.1 os/linux lang/js md/nodejs#20.0.0 api/codewhispererstreaming#2024-11-20 m/E KiroIDE-1.0.0',
      'amz-sdk-invocation-id': crypto.randomUUID(),
      'amz-sdk-request': `attempt=${retryCount + 1}; max=3`
    };

    try {
      console.log(`[KiroProxy][Claude] Forwarding to ${kiroUrl} using: ${account.email}`);
      const response = await fetch(kiroUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(kiroPayload)
      });

      const statusCode = response.status;

      if (statusCode === 401 || statusCode === 403) {
        const refreshResult = await refreshKiroToken(account.id);
        if (refreshResult.success) {
          headers['Authorization'] = `Bearer ${refreshResult.accessToken}`;
          const retryResponse = await fetch(kiroUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(kiroPayload)
          });
          
          if (retryResponse.ok) {
            pool.recordRequest(account.id, true);
            if (stream) {
              res.setHeader('Content-Type', 'text/event-stream');
              res.setHeader('Cache-Control', 'no-cache');
              res.setHeader('Connection', 'keep-alive');
              await parseEventStreamToClaudeClient(res, retryResponse.body, model, requestId);
            } else {
              const content = await parseEventStreamToText(retryResponse.body);
              res.json({
                id: requestId,
                type: 'message',
                role: 'assistant',
                model,
                content: [{ type: 'text', text: content }],
                stop_reason: 'end_turn',
                stop_sequence: null,
                usage: { input_tokens: 0, output_tokens: 0 }
              });
            }
            return;
          }
        }
        
        pool.recordRequest(account.id, false, 'Auth error', statusCode);
        excludeIds.add(account.id);
        retryCount++;
        continue;
      }

      if (statusCode === 402 || statusCode === 429) {
        pool.recordRequest(account.id, false, 'Quota or rate limit', statusCode);
        excludeIds.add(account.id);
        retryCount++;
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        pool.recordRequest(account.id, false, errorText, statusCode);
        excludeIds.add(account.id);
        retryCount++;
        continue;
      }

      pool.recordRequest(account.id, true);

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        await parseEventStreamToClaudeClient(res, response.body, model, requestId);
      } else {
        const content = await parseEventStreamToText(response.body);
        res.json({
          id: requestId,
          type: 'message',
          role: 'assistant',
          model,
          content: [{ type: 'text', text: content }],
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 }
        });
      }
      return;

    } catch (err) {
      console.error(`[KiroProxy] Claude error:`, err.message);
      pool.recordRequest(account.id, false, err.message, 500);
      excludeIds.add(account.id);
      retryCount++;
    }
  }

  res.status(500).json({ error: { type: 'api_error', message: 'Failed after retrying all available accounts.' } });
};

router.post('/v1/messages', handleClaudeRoute);
router.post('/messages', handleClaudeRoute);

// 5.3 Responses 兼容接口 (完美复用 OpenAI 全套翻译和流式逻辑！)
const handleResponsesRoute = async (req, res) => {
  const responsesReq = req.body;
  const openaiReq = responsesToOpenAIChat(responsesReq);
  
  // 拦截并包装响应
  const originalJson = res.json;
  const originalWrite = res.write;
  const originalEnd = res.end;

  if (!openaiReq.stream) {
    res.json = (openaiRes) => {
      const resp = openAIChatToResponsesResponse(openaiRes);
      return originalJson.call(res, resp);
    };
    
    req.body = openaiReq;
    // 直接进入 OpenAI 聊天处理链
    return router.handle({ method: 'POST', url: '/v1/chat/completions', body: openaiReq, headers: req.headers }, res);
  } else {
    // 流式 Responses 的转换直接拦截 SSE 写入
    res.write = (chunk) => {
      const chunkStr = chunk.toString();
      if (chunkStr.includes('data: [DONE]')) {
        return originalWrite.call(res, 'data: [DONE]\n\n');
      }
      const lines = chunkStr.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
          try {
            const openaiJson = JSON.parse(line.substring(6));
            const delta = openaiJson.choices[0].delta;
            if (delta && delta.content) {
              const responsesChunk = {
                type: 'output_delta',
                delta: { type: 'output_text_delta', text: delta.content }
              };
              originalWrite.call(res, `data: ${JSON.stringify(responsesChunk)}\n\n`);
            }
          } catch (e) {}
        }
      }
      return true;
    };
    req.body = openaiReq;
    return router.handle({ method: 'POST', url: '/v1/chat/completions', body: openaiReq, headers: req.headers }, res);
  }
};

router.post('/v1/responses', handleResponsesRoute);
router.post('/responses', handleResponsesRoute);

// 5.4 Claude Code / messages/count_tokens 计数伪接口
const handleCountTokensRoute = (req, res) => {
  res.json({ input_tokens: 0 });
};
router.post('/v1/messages/count_tokens', handleCountTokensRoute);
router.post('/messages/count_tokens', handleCountTokensRoute);

// 6. ==================== 后台管理 API 路由 ====================

const verifyAdminKey = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid admin key' });
  }
  next();
};

adminRouter.get('/accounts', verifyAdminKey, (req, res) => {
  const accounts = pool.getAccounts();
  const safeAccounts = accounts.map(a => {
    const { accessToken, ssoToken, refreshToken, clientSecret, ...safe } = a;
    return safe;
  });
  res.json({ success: true, accounts: safeAccounts });
});

adminRouter.post('/accounts/kiro/batch', verifyAdminKey, (req, res) => {
  const accountsToImport = req.body;
  if (!Array.isArray(accountsToImport)) {
    return res.status(400).json({ error: 'Bad Request', message: 'Body must be an array of accounts' });
  }

  const successList = [];
  for (const acc of accountsToImport) {
    if (acc.email && acc.refreshToken) {
      const added = pool.addAccount(acc);
      successList.push(added.email);
    }
  }
  res.json({ success: true, count: successList.length, imported: successList });
});

adminRouter.post('/accounts/kiro', verifyAdminKey, (req, res) => {
  const acc = req.body;
  if (!acc.email || !acc.refreshToken) {
    return res.status(400).json({ error: 'Bad Request', message: 'Missing email or refreshToken' });
  }
  const added = pool.addAccount(acc);
  res.json({ success: true, account: added });
});

adminRouter.delete('/accounts/:id', verifyAdminKey, (req, res) => {
  const id = req.params.id;
  const deleted = pool.deleteAccount(id);
  if (deleted) {
    res.json({ success: true, message: 'Account deleted' });
  } else {
    res.status(404).json({ error: 'Not Found', message: 'Account not found' });
  }
});

adminRouter.post('/accounts/:id/refresh', verifyAdminKey, async (req, res) => {
  const id = req.params.id;
  const refreshResult = await refreshKiroToken(id);
  if (refreshResult.success) {
    res.json({ success: true, message: 'Token refreshed successfully' });
  } else {
    res.status(500).json({ error: 'Refresh Failed', message: refreshResult.error });
  }
});

adminRouter.put('/accounts/:id', verifyAdminKey, (req, res) => {
  const id = req.params.id;
  const updates = req.body;
  const updated = pool.updateAccount(id, updates);
  if (updated) {
    res.json({ success: true, message: 'Account updated successfully' });
  } else {
    res.status(404).json({ error: 'Not Found', message: 'Account not found' });
  }
});

module.exports = {
  router,
  adminRouter,
  pool
};
