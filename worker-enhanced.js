// Cloudflare Workers AI API 代理 - 增强版
// 支持 OpenAI, Anthropic, Google Gemini
// 新增：账号池管理、Token 自动刷新、负载均衡

// 账号管理相关接口
interface Account {
  id: string;
  email: string;
  provider: 'openai' | 'anthropic' | 'gemini';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  enabled: boolean;
  lastUsed?: number;
  createdAt: number;
}

interface AccountStats {
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  lastError?: string;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        }
      });
    }

    // 管理接口 - 需要管理员密钥
    if (path.startsWith('/admin')) {
      return handleAdminRequest(request, env, path);
    }

    // 健康检查
    if (path === '/health') {
      return jsonResponse({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '2.0.0-enhanced'
      });
    }

    // 根路径信息
    if (path === '/') {
      return jsonResponse({
        name: 'AI API Proxy (Enhanced)',
        version: '2.0.0',
        features: [
          'Multi-account management',
          'Auto token refresh',
          'Load balancing',
          'Account rotation'
        ],
        endpoints: {
          openai: '/v1/*',
          anthropic: '/anthropic/*',
          gemini: '/gemini/*',
          health: '/health',
          admin: '/admin/* (requires auth)'
        }
      });
    }

    // API 代理请求
    return handleProxyRequest(request, env, path, url);
  }
};

// 处理管理接口
async function handleAdminRequest(request, env, path) {
  // 验证管理员密钥
  const authHeader = request.headers.get('Authorization');
  const adminKey = env.ADMIN_KEY || 'admin-secret-key';
  
  if (!authHeader || authHeader !== `Bearer ${adminKey}`) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const method = request.method;

  // GET /admin/accounts - 列出所有账号
  if (path === '/admin/accounts' && method === 'GET') {
    const accounts = await listAccounts(env);
    return jsonResponse(accounts);
  }

  // POST /admin/accounts - 添加账号
  if (path === '/admin/accounts' && method === 'POST') {
    const account = await request.json();
    const result = await addAccount(env, account);
    return jsonResponse(result);
  }

  // PUT /admin/accounts/:id - 更新账号
  if (path.startsWith('/admin/accounts/') && method === 'PUT') {
    const id = path.split('/')[3];
    const updates = await request.json();
    const result = await updateAccount(env, id, updates);
    return jsonResponse(result);
  }

  // DELETE /admin/accounts/:id - 删除账号
  if (path.startsWith('/admin/accounts/') && method === 'DELETE') {
    const id = path.split('/')[3];
    const result = await deleteAccount(env, id);
    return jsonResponse(result);
  }

  // GET /admin/stats - 获取统计信息
  if (path === '/admin/stats' && method === 'GET') {
    const stats = await getStats(env);
    return jsonResponse(stats);
  }

  // POST /admin/refresh/:id - 手动刷新 Token
  if (path.startsWith('/admin/refresh/') && method === 'POST') {
    const id = path.split('/')[3];
    const result = await refreshAccountToken(env, id);
    return jsonResponse(result);
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

// 处理代理请求
async function handleProxyRequest(request, env, path, url) {
  // 确定目标服务
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

  // 获取可用账号
  const account = await getAvailableAccount(env, provider);
  
  if (!account) {
    return jsonResponse({ 
      error: 'No available accounts',
      message: 'All accounts are unavailable or disabled'
    }, 503);
  }

  // 检查 Token 是否即将过期
  if (account.expiresAt && account.expiresAt < Date.now() + 300000) {
    // 5分钟内过期，尝试刷新
    await refreshAccountToken(env, account.id);
    // 重新获取账号信息
    const refreshedAccount = await getAccount(env, account.id);
    if (refreshedAccount) {
      Object.assign(account, refreshedAccount);
    }
  }

  // 构建代理请求
  const proxyUrl = `${targetUrl}${newPath}${url.search}`;
  const headers = new Headers(request.headers);
  
  // 设置认证头
  if (provider === 'openai') {
    headers.set('Authorization', `Bearer ${account.accessToken}`);
  } else if (provider === 'anthropic') {
    headers.set('x-api-key', account.accessToken);
  }
  
  headers.set('Host', new URL(targetUrl).host);
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ray');

  try {
    const proxyRequest = new Request(proxyUrl, {
      method: request.method,
      headers: headers,
      body: request.body
    });

    const response = await fetch(proxyRequest);
    
    // 记录请求统计
    await recordRequest(env, account.id, response.ok);
    
    // 更新最后使用时间
    await updateAccountLastUsed(env, account.id);

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

// 账号管理函数
async function listAccounts(env) {
  const { keys } = await env.ACCOUNTS.list();
  const accounts = [];
  
  for (const key of keys) {
    const data = await env.ACCOUNTS.get(key.name, 'json');
    if (data) {
      // 不返回敏感信息
      const { accessToken, refreshToken, ...safeData } = data;
      accounts.push(safeData);
    }
  }
  
  return accounts;
}

async function addAccount(env, account) {
  const id = account.id || crypto.randomUUID();
  const newAccount = {
    ...account,
    id,
    enabled: account.enabled !== false,
    createdAt: Date.now()
  };
  
  await env.ACCOUNTS.put(id, JSON.stringify(newAccount));
  
  const { accessToken, refreshToken, ...safeData } = newAccount;
  return { success: true, account: safeData };
}

async function updateAccount(env, id, updates) {
  const existing = await env.ACCOUNTS.get(id, 'json');
  
  if (!existing) {
    return { success: false, error: 'Account not found' };
  }
  
  const updated = { ...existing, ...updates };
  await env.ACCOUNTS.put(id, JSON.stringify(updated));
  
  const { accessToken, refreshToken, ...safeData } = updated;
  return { success: true, account: safeData };
}

async function deleteAccount(env, id) {
  await env.ACCOUNTS.delete(id);
  await env.STATS.delete(`stats:${id}`);
  return { success: true };
}

async function getAccount(env, id) {
  return await env.ACCOUNTS.get(id, 'json');
}

// 获取可用账号（负载均衡）
async function getAvailableAccount(env, provider) {
  const { keys } = await env.ACCOUNTS.list();
  const candidates = [];
  
  for (const key of keys) {
    const account = await env.ACCOUNTS.get(key.name, 'json');
    if (account && account.enabled && account.provider === provider) {
      // 检查 Token 是否有效
      if (!account.expiresAt || account.expiresAt > Date.now()) {
        candidates.push(account);
      }
    }
  }
  
  if (candidates.length === 0) {
    return null;
  }
  
  // 轮询：选择最少使用的账号
  candidates.sort((a, b) => (a.lastUsed || 0) - (b.lastUsed || 0));
  return candidates[0];
}

// Token 刷新（示例实现，需要根据实际 API 调整）
async function refreshAccountToken(env, id) {
  const account = await getAccount(env, id);
  
  if (!account || !account.refreshToken) {
    return { success: false, error: 'Cannot refresh token' };
  }
  
  try {
    // 这里需要根据具体服务商的刷新接口实现
    // 示例：OpenAI 的刷新逻辑
    let refreshUrl = '';
    let body = {};
    
    if (account.provider === 'openai') {
      // OpenAI 刷新逻辑（需要实际API）
      refreshUrl = 'https://auth.openai.com/oauth/token';
      body = {
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken
      };
    }
    
    // 实际刷新请求
    // const response = await fetch(refreshUrl, { ... });
    // const data = await response.json();
    
    // 更新账号信息
    // await updateAccount(env, id, {
    //   accessToken: data.access_token,
    //   expiresAt: Date.now() + data.expires_in * 1000
    // });
    
    return { success: true, message: 'Token refresh not implemented yet' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 记录请求统计
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

// 更新最后使用时间
async function updateAccountLastUsed(env, id) {
  const account = await getAccount(env, id);
  if (account) {
    account.lastUsed = Date.now();
    await env.ACCOUNTS.put(id, JSON.stringify(account));
  }
}

// 获取统计信息
async function getStats(env) {
  const { keys } = await env.STATS.list();
  const allStats = {};
  
  for (const key of keys) {
    const accountId = key.name.replace('stats:', '');
    const stats = await env.STATS.get(key.name, 'json');
    if (stats) {
      allStats[accountId] = stats;
    }
  }
  
  return allStats;
}

// 辅助函数
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
