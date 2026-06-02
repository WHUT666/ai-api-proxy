// Cloudflare Workers AI API 代理 - Kiro 增强版
// 支持 OpenAI, Anthropic, Google Gemini, Amazon Q (Kiro)

// 账号类型定义
interface KiroAccount {
  id: string;
  email: string;
  provider: 'kiro';
  
  // Kiro 特有字段
  ssoToken?: string;           // SSO Token（AWS IAM Identity Center）
  accessToken?: string;         // Bearer Token
  refreshToken?: string;        // 用于刷新
  
  // OIDC 认证（Builder ID / GitHub / Google）
  clientId?: string;
  clientSecret?: string;
  idToken?: string;
  
  // 账号信息
  region?: string;              // AWS 区域，默认 us-east-1
  expiresAt?: number;
  enabled: boolean;
  lastUsed?: number;
  createdAt: number;
  
  // 使用统计
  usage?: {
    currentMonth: number;       // 当前月使用量
    limit: number;              // 配额限制
    resetAt: number;            // 重置时间
  };
}

// Kiro API 端点
const KIRO_ENDPOINTS = {
  chat: '/api/v1/streaming-conversations',           // 流式对话
  listConversations: '/api/v1/conversations',        // 对话列表
  generatePlan: '/api/v1/generate-plan',             // 生成计划
  generateCodeSnippet: '/api/v1/generate-code-snippet',
  userContext: '/api/v1/user-context',
  models: '/api/v1/models',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return corsResponse();
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

    // 根路径
    if (path === '/') {
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

    // 其他 API 代理（OpenAI/Anthropic/Gemini）
    return handleProxyRequest(request, env, path, url);
  }
};

// 处理 Kiro 请求
async function handleKiroRequest(request, env, path, url) {
  // 获取可用的 Kiro 账号
  const account = await getAvailableAccount(env, 'kiro');
  
  if (!account) {
    return jsonResponse({ 
      error: 'No available Kiro accounts',
      message: 'Please add Kiro accounts in admin panel'
    }, 503);
  }

  // 检查 Token 是否过期
  if (account.expiresAt && account.expiresAt < Date.now() + 300000) {
    // 5分钟内过期，尝试刷新
    await refreshKiroToken(env, account.id);
    const refreshedAccount = await getAccount(env, account.id);
    if (refreshedAccount) {
      Object.assign(account, refreshedAccount);
    }
  }

  // 确定 Kiro API 端点
  const region = account.region || 'us-east-1';
  const kiroBaseUrl = `https://codewhisperer.${region}.amazonaws.com`;
  
  // 构建代理请求 URL（移除 /kiro 前缀）
  const kiroPath = path.replace('/kiro', '');
  const proxyUrl = `${kiroBaseUrl}${kiroPath}${url.search}`;

  // 构建请求头
  const headers = new Headers(request.headers);
  
  // 设置认证头
  if (account.ssoToken) {
    // SSO Token 认证
    headers.set('Authorization', `Bearer ${account.ssoToken}`);
  } else if (account.accessToken) {
    // Bearer Token 认证
    headers.set('Authorization', `Bearer ${account.accessToken}`);
  }
  
  // 设置必要的 Kiro 请求头
  headers.set('Host', new URL(proxyUrl).host);
  headers.set('x-amzn-codewhisperer-optout', 'false');
  
  // 移除 Cloudflare 特有头
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ray');
  headers.delete('cf-visitor');

  try {
    const proxyRequest = new Request(proxyUrl, {
      method: request.method,
      headers: headers,
      body: request.body
    });

    const response = await fetch(proxyRequest);
    
    // 检查是否需要刷新 Token（401/403）
    if (response.status === 401 || response.status === 403) {
      // 标记账号需要刷新
      await markAccountNeedsRefresh(env, account.id);
      
      return jsonResponse({
        error: 'Authentication failed',
        message: 'Token expired or invalid, please refresh token',
        accountId: account.id
      }, 401);
    }

    // 记录使用统计
    await recordRequest(env, account.id, response.ok);
    await updateAccountLastUsed(env, account.id);
    
    // 更新使用量（如果响应包含使用信息）
    if (response.ok) {
      await updateKiroUsage(env, account.id);
    }

    // 返回代理响应
    const proxyResponse = new Response(response.body, response);
    proxyResponse.headers.set('Access-Control-Allow-Origin', '*');
    proxyResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    proxyResponse.headers.set('Access-Control-Allow-Headers', '*');
    
    return proxyResponse;
  } catch (error) {
    await recordRequest(env, account.id, false, error.message);
    return jsonResponse({
      error: 'Proxy error',
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
    // 如果有 OIDC 认证信息（Builder ID / GitHub / Google）
    if (account.clientId && account.clientSecret && account.refreshToken) {
      // OIDC Token 刷新
      const tokenUrl = 'https://oidc.codewhisperer.amazonaws.com/token';
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: account.clientId,
          client_secret: account.clientSecret,
          refresh_token: account.refreshToken,
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      
      // 更新账号信息
      await updateAccount(env, accountId, {
        accessToken: data.access_token,
        idToken: data.id_token,
        refreshToken: data.refresh_token || account.refreshToken,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000
      });

      return { success: true, message: 'Token refreshed successfully' };
    }
    
    // SSO Token 需要重新登录，无法自动刷新
    if (account.ssoToken) {
      return { 
        success: false, 
        error: 'SSO token cannot be auto-refreshed, please re-login' 
      };
    }

    return { success: false, error: 'No refresh method available' };
  } catch (error) {
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

// 管理接口：添加 Kiro 账号
async function handleAdminRequest(request, env, path) {
  const authHeader = request.headers.get('Authorization');
  const adminKey = env.ADMIN_KEY || 'admin-secret-key';
  
  if (!authHeader || authHeader !== `Bearer ${adminKey}`) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const method = request.method;

  // POST /admin/accounts/kiro - 添加 Kiro 账号
  if (path === '/admin/accounts/kiro' && method === 'POST') {
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
  }

  // 其他管理接口...
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

async function getAvailableAccount(env, provider) {
  const { keys } = await env.ACCOUNTS.list();
  const candidates = [];
  
  for (const key of keys) {
    const account = await env.ACCOUNTS.get(key.name, 'json');
    if (account && account.enabled && account.provider === provider) {
      if (!account.expiresAt || account.expiresAt > Date.now()) {
        candidates.push(account);
      }
    }
  }
  
  if (candidates.length === 0) return null;
  
  candidates.sort((a, b) => (a.lastUsed || 0) - (b.lastUsed || 0));
  return candidates[0];
}

async function recordRequest(env, accountId, success, error = null) {
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
