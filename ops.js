#!/usr/bin/env node
// Kiro API 代理运维工具集

const ADMIN_KEY = 'kiro-admin-2024';
const API_BASE = 'https://ai-api-proxy.2358314123.workers.dev';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// 辅助函数
async function apiCall(path, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${ADMIN_KEY}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_BASE}${path}`, options);
  return { response, data: await response.json() };
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 1. 查看账号池状态
async function statusCommand() {
  log('\n📊 账号池状态\n', 'cyan');
  
  try {
    const { data } = await apiCall('/admin/accounts');
    
    if (!data.accounts || data.accounts.length === 0) {
      log('⚠️  没有找到任何账号', 'yellow');
      return;
    }
    
    const accounts = data.accounts;
    const now = Date.now();
    
    // 统计
    const total = accounts.length;
    const available = accounts.filter(a => {
      const notExpired = !a.expiresAt || a.expiresAt > now;
      const hasToken = a.accessToken || a.ssoToken || a.refreshToken;
      const notSuspended = !a.suspendedAt;
      return notExpired && hasToken && notSuspended;
    }).length;
    
    const suspended = accounts.filter(a => a.suspendedAt).length;
    const expired = accounts.filter(a => a.expiresAt && a.expiresAt <= now).length;
    const cooldown = accounts.filter(a => a.errorCount > 0).length;
    const quotaExhausted = accounts.filter(a => a.quotaExhaustedAt && a.quotaExhaustedAt > 0).length;
    
    log(`总账号数: ${total}`, 'blue');
    log(`✓ 可用: ${available} (${Math.round(available/total*100)}%)`, 'green');
    log(`⊗ 被封禁: ${suspended}`, suspended > 0 ? 'red' : 'reset');
    log(`⏰ 已过期: ${expired}`, expired > 0 ? 'yellow' : 'reset');
    log(`❄️  冷却中: ${cooldown}`, cooldown > 0 ? 'yellow' : 'reset');
    log(`📊 配额耗尽: ${quotaExhausted}`, quotaExhausted > 0 ? 'red' : 'reset');
    
    // 按状态分组显示
    log('\n详细列表:', 'cyan');
    
    accounts.forEach((account, i) => {
      const email = account.email || account.id.substring(0, 8);
      const status = [];
      
      if (account.suspendedAt) {
        status.push(`${colors.red}SUSPENDED(${account.suspendReason})${colors.reset}`);
      } else if (account.expiresAt && account.expiresAt <= now) {
        status.push(`${colors.yellow}EXPIRED${colors.reset}`);
      } else if (account.quotaExhaustedAt && account.quotaExhaustedAt > 0) {
        status.push(`${colors.red}QUOTA_EXHAUSTED${colors.reset}`);
      } else if (account.errorCount > 0) {
        const cooldownMin = Math.round((60000 * Math.pow(2, account.errorCount - 1)) / 60000);
        status.push(`${colors.yellow}COOLDOWN(${account.errorCount} failures, ~${cooldownMin}m)${colors.reset}`);
      } else {
        status.push(`${colors.green}AVAILABLE${colors.reset}`);
      }
      
      const lastUsed = account.lastUsed 
        ? new Date(account.lastUsed).toLocaleString('zh-CN')
        : 'Never';
      
      console.log(`${i+1}. ${email} - ${status.join(', ')} - Last: ${lastUsed}`);
    });
    
  } catch (error) {
    log(`❌ 错误: ${error.message}`, 'red');
  }
}

// 2. 刷新所有过期账号
async function refreshCommand() {
  log('\n🔄 批量刷新过期账号\n', 'cyan');
  
  try {
    const { data } = await apiCall('/admin/accounts');
    const accounts = data.accounts || [];
    const now = Date.now();
    
    const toRefresh = accounts.filter(a => {
      return !a.expiresAt || a.expiresAt < now + 1800000; // 30分钟内过期
    });
    
    if (toRefresh.length === 0) {
      log('✓ 所有账号 Token 都是有效的', 'green');
      return;
    }
    
    log(`找到 ${toRefresh.length} 个需要刷新的账号\n`, 'blue');
    
    let success = 0;
    let failed = 0;
    
    for (const account of toRefresh) {
      const email = account.email || account.id.substring(0, 8);
      process.stdout.write(`刷新 ${email}... `);
      
      try {
        const { response, data: result } = await apiCall(
          `/admin/accounts/${account.id}/refresh`,
          'POST'
        );
        
        if (result.success) {
          log('✓', 'green');
          success++;
        } else {
          log(`✗ ${result.error}`, 'red');
          failed++;
        }
        
        // 短暂延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        log(`✗ ${error.message}`, 'red');
        failed++;
      }
    }
    
    log(`\n结果: ${success} 成功, ${failed} 失败`, success === toRefresh.length ? 'green' : 'yellow');
    
  } catch (error) {
    log(`❌ 错误: ${error.message}`, 'red');
  }
}

// 3. 重置所有账号状态（清除冷却/封禁）
async function resetCommand() {
  log('\n⚠️  重置所有账号状态\n', 'yellow');
  
  try {
    const { data } = await apiCall('/admin/accounts');
    const accounts = data.accounts || [];
    
    const toReset = accounts.filter(a => 
      a.errorCount > 0 || a.suspendedAt || a.quotaExhaustedAt
    );
    
    if (toReset.length === 0) {
      log('✓ 没有需要重置的账号', 'green');
      return;
    }
    
    log(`找到 ${toReset.length} 个需要重置的账号\n`, 'blue');
    
    let success = 0;
    let failed = 0;
    
    for (const account of toReset) {
      const email = account.email || account.id.substring(0, 8);
      process.stdout.write(`重置 ${email}... `);
      
      try {
        const updates = {
          errorCount: 0,
          suspendedAt: undefined,
          suspendReason: undefined,
          suspendMessage: undefined,
          quotaExhaustedAt: undefined,
          enabled: true
        };
        
        const { response } = await apiCall(
          `/admin/accounts/${account.id}`,
          'PUT',
          updates
        );
        
        if (response.ok) {
          log('✓', 'green');
          success++;
        } else {
          log('✗', 'red');
          failed++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        log(`✗ ${error.message}`, 'red');
        failed++;
      }
    }
    
    log(`\n结果: ${success} 成功, ${failed} 失败`, success === toReset.length ? 'green' : 'yellow');
    
  } catch (error) {
    log(`❌ 错误: ${error.message}`, 'red');
  }
}

// 4. 测试 API
async function testCommand() {
  log('\n🧪 测试 API 功能\n', 'cyan');
  
  try {
    log('发送测试请求...', 'blue');
    
    const response = await fetch(`${API_BASE}/kiro/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4.5',
        messages: [
          { role: 'user', content: 'Say "API is working!" and nothing else.' }
        ],
        stream: false,
        max_tokens: 20
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      log(`✓ API 正常工作`, 'green');
      log(`响应: ${data.choices[0].message.content}`, 'cyan');
    } else {
      const error = await response.text();
      log(`✗ API 错误: ${response.status}`, 'red');
      log(error, 'red');
    }
    
  } catch (error) {
    log(`❌ 错误: ${error.message}`, 'red');
  }
}

// 5. 健康检查
async function healthCommand() {
  log('\n💚 健康检查\n', 'cyan');
  
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    
    log(`状态: ${data.status === 'ok' ? '✓ 正常' : '✗ 异常'}`, 
        data.status === 'ok' ? 'green' : 'red');
    
    if (data.accounts) {
      log(`总账号数: ${data.accounts.total}`, 'blue');
      log(`Kiro 账号: ${data.accounts.kiro}`, 'blue');
    }
    
    log(`时间: ${new Date(data.timestamp).toLocaleString('zh-CN')}`, 'cyan');
    
  } catch (error) {
    log(`❌ 错误: ${error.message}`, 'red');
  }
}

// 主函数
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'status':
      await statusCommand();
      break;
    case 'refresh':
      await refreshCommand();
      break;
    case 'reset':
      await resetCommand();
      break;
    case 'test':
      await testCommand();
      break;
    case 'health':
      await healthCommand();
      break;
    default:
      log('\n🔧 Kiro API 代理运维工具\n', 'cyan');
      log('使用方法:', 'blue');
      log('  node ops.js status   - 查看账号池状态');
      log('  node ops.js refresh  - 刷新所有过期账号');
      log('  node ops.js reset    - 重置所有账号状态（清除冷却/封禁）');
      log('  node ops.js test     - 测试 API 功能');
      log('  node ops.js health   - 健康检查\n');
  }
}

main().catch(error => {
  log(`❌ 致命错误: ${error.message}`, 'red');
  process.exit(1);
});
