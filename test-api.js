// API 测试脚本 - 包含正确的请求格式
const tests = [
  {
    name: 'Health Check',
    url: 'https://ai-api-proxy.2358314123.workers.dev/health',
    method: 'GET'
  },
  {
    name: 'API Info',
    url: 'https://ai-api-proxy.2358314123.workers.dev/api-info',
    method: 'GET'
  },
  {
    name: 'Admin Accounts',
    url: 'https://ai-api-proxy.2358314123.workers.dev/admin/accounts',
    method: 'GET',
    headers: { 'Authorization': 'Bearer kiro-admin-2024' }
  },
  {
    name: 'Kiro Streaming Chat (with chatTriggerType)',
    url: 'https://ai-api-proxy.2358314123.workers.dev/kiro/api/v1/streaming-conversations',
    method: 'POST',
    body: {
      conversationState: {
        currentMessage: {
          userInputMessage: {
            content: 'Write a hello world program in Python'
          }
        },
        chatTriggerType: 'MANUAL'
      }
    }
  }
];

(async () => {
  console.log('🧪 开始 API 测试...\n');
  
  for (const test of tests) {
    try {
      const opts = {
        method: test.method,
        headers: test.headers || {}
      };
      
      if (test.body) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(test.body);
      }
      
      const response = await fetch(test.url, opts);
      const text = await response.text();
      
      console.log(`\n[${test.name}]`);
      console.log(`状态: ${response.status}`);
      console.log(`响应: ${text.substring(0, 300)}${text.length > 300 ? '...' : ''}`);
      
      // 检查是否有异常
      if (text.includes('UnknownOperationException')) {
        console.log('⚠️  警告: AWS API 返回 UnknownOperationException - 可能是 Token 无效或端点错误');
      } else if (text.includes('InvalidSignatureException') || text.includes('AccessDeniedException')) {
        console.log('⚠️  警告: 认证失败 - Token 可能已过期');
      } else if (response.status >= 200 && response.status < 300) {
        console.log('✓ 通过');
      } else {
        console.log('✗ 失败');
      }
      
    } catch (error) {
      console.log(`\n[${test.name}]`);
      console.log(`✗ 错误: ${error.message}`);
    }
  }
  
  console.log('\n✅ 测试完成');
})();
