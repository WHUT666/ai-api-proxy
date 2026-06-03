// 测试修复后的 Kiro API
const ADMIN_KEY = 'kiro-admin-2024';
const API_BASE = 'https://ai-api-proxy.2358314123.workers.dev';

(async () => {
  console.log('🧪 测试修复后的 Kiro API...\n');
  
  try {
    // 测试 1: 使用正确的 generateAssistantResponse 端点
    console.log('[测试 1] 直接调用 generateAssistantResponse 端点');
    
    const payload = {
      conversationState: {
        agentContinuationId: crypto.randomUUID(),
        agentTaskType: 'vibe',
        chatTriggerType: 'MANUAL',
        conversationId: crypto.randomUUID(),
        currentMessage: {
          userInputMessage: {
            content: 'Hello, write a simple Python hello world program',
            origin: 'AI_EDITOR',
            modelId: 'claude-sonnet-4.5'
          }
        }
      }
    };
    
    const response = await fetch(`${API_BASE}/kiro/generateAssistantResponse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`状态: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const text = await response.text();
      console.log(`响应长度: ${text.length} 字节`);
      console.log(`响应预览: ${text.substring(0, 500)}...\n`);
      
      // 检查是否包含错误
      if (text.includes('UnknownOperationException')) {
        console.log('❌ 仍然返回 UnknownOperationException');
      } else if (text.includes('assistantResponseEvent') || text.includes('codeEvent')) {
        console.log('✅ 成功！收到有效的 Kiro 响应');
      } else {
        console.log('⚠️  响应格式未知');
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ 错误: ${errorText.substring(0, 300)}`);
    }
    
    console.log('\n' + '='.repeat(60));
    
    // 测试 2: 检查账号状态
    console.log('\n[测试 2] 检查账号状态');
    
    const accountsResponse = await fetch(`${API_BASE}/admin/accounts`, {
      headers: { 'Authorization': `Bearer ${ADMIN_KEY}` }
    });
    
    const accountsData = await accountsResponse.json();
    const validAccounts = accountsData.accounts.filter(a => {
      return a.enabled && a.expiresAt && a.expiresAt > Date.now();
    });
    
    console.log(`总账号数: ${accountsData.accounts.length}`);
    console.log(`有效账号数: ${validAccounts.length}`);
    
    if (validAccounts.length > 0) {
      const account = validAccounts[0];
      console.log(`\n测试账号: ${account.email}`);
      console.log(`Token 有效期: ${new Date(account.expiresAt).toISOString()}`);
      console.log(`剩余时间: ${((account.expiresAt - Date.now()) / 3600000).toFixed(2)} 小时`);
    }
    
    console.log('\n✅ 测试完成');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
})();
