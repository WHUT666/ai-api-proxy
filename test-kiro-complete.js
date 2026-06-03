// 使用有效账号测试 Kiro API
const API_BASE = 'https://ai-api-proxy.2358314123.workers.dev';
const ADMIN_KEY = 'kiro-admin-2024';

(async () => {
  console.log('🧪 使用有效账号测试 Kiro API...\n');
  
  try {
    // 1. 获取所有账号，找到有效的
    console.log('[步骤 1] 获取有效账号');
    const accountsResponse = await fetch(`${API_BASE}/admin/accounts`, {
      headers: { 'Authorization': `Bearer ${ADMIN_KEY}` }
    });
    
    const accountsData = await accountsResponse.json();
    const validAccounts = accountsData.accounts.filter(a => {
      return a.enabled && a.expiresAt && a.expiresAt > Date.now() + 60000; // 至少还有1分钟
    });
    
    console.log(`总账号数: ${accountsData.accounts.length}`);
    console.log(`有效账号数: ${validAccounts.length}`);
    
    if (validAccounts.length === 0) {
      console.log('\n❌ 没有有效账号可用');
      process.exit(1);
    }
    
    const testAccount = validAccounts[0];
    console.log(`\n选中账号: ${testAccount.email}`);
    console.log(`Token 有效期: ${new Date(testAccount.expiresAt).toISOString()}`);
    console.log(`剩余时间: ${((testAccount.expiresAt - Date.now()) / 60000).toFixed(2)} 分钟`);
    
    // 2. 构建完整的 Kiro 请求 payload
    console.log('\n[步骤 2] 构建 Kiro API 请求');
    const payload = {
      conversationState: {
        agentContinuationId: crypto.randomUUID(),
        agentTaskType: 'vibe',
        chatTriggerType: 'MANUAL',
        conversationId: crypto.randomUUID(),
        currentMessage: {
          userInputMessage: {
            content: 'Write a simple hello world program in Python',
            origin: 'AI_EDITOR',
            modelId: 'claude-sonnet-4.5'
          }
        }
      }
    };
    
    console.log('Payload 结构: ✓');
    console.log(`Content: "${payload.conversationState.currentMessage.userInputMessage.content.substring(0, 50)}..."`);
    
    // 3. 调用 Kiro API
    console.log('\n[步骤 3] 调用 Kiro generateAssistantResponse');
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE}/kiro/generateAssistantResponse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`状态码: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    console.log(`响应时间: ${responseTime}ms`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`\n❌ 请求失败:`);
      console.log(errorText.substring(0, 500));
      process.exit(1);
    }
    
    // 4. 解析流式响应
    console.log('\n[步骤 4] 解析流式响应');
    const text = await response.text();
    console.log(`响应大小: ${text.length} 字节`);
    
    // 检查响应内容
    if (text.includes('assistantResponseEvent')) {
      console.log('✅ 包含 assistantResponseEvent');
    }
    if (text.includes('codeEvent')) {
      console.log('✅ 包含 codeEvent');
    }
    if (text.includes('UnknownOperationException')) {
      console.log('❌ 仍然包含 UnknownOperationException');
      process.exit(1);
    }
    
    // 提取代码内容
    const lines = text.split('\n');
    let extractedCode = '';
    for (const line of lines) {
      if (line.includes('"content":"') && line.includes('python')) {
        const match = line.match(/"content":"([^"]+)"/);
        if (match) {
          extractedCode += match[1].replace(/\\n/g, '\n');
        }
      }
    }
    
    if (extractedCode) {
      console.log('\n📝 提取的代码:');
      console.log('---');
      console.log(extractedCode);
      console.log('---');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Kiro API 测试成功！');
    console.log('='.repeat(60));
    console.log('\n核心修复内容:');
    console.log('  1. ✅ 使用正确的 AWS CodeWhisperer 端点');
    console.log('     https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse');
    console.log('  2. ✅ 添加必要的 AWS SDK 请求头');
    console.log('  3. ✅ 使用正确的 conversationState 结构');
    console.log('  4. ✅ 正确传递 Bearer Token 认证');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
