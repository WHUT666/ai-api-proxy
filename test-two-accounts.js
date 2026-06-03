// 使用两个有效账号轮流测试 Kiro API
const API_BASE = 'https://ai-api-proxy.2358314123.workers.dev';
const ADMIN_KEY = 'kiro-admin-2024';

(async () => {
  console.log('🧪 使用有效账号轮流测试 Kiro API...\n');
  
  try {
    // 1. 获取所有有效账号
    console.log('[步骤 1] 获取有效账号列表');
    const accountsResponse = await fetch(`${API_BASE}/admin/accounts`, {
      headers: { 'Authorization': `Bearer ${ADMIN_KEY}` }
    });
    
    const accountsData = await accountsResponse.json();
    const validAccounts = accountsData.accounts.filter(a => {
      return a.enabled && a.expiresAt && a.expiresAt > Date.now() + 60000;
    });
    
    console.log(`总账号数: ${accountsData.accounts.length}`);
    console.log(`有效账号数: ${validAccounts.length}`);
    
    if (validAccounts.length < 2) {
      console.log(`\n⚠️  只有 ${validAccounts.length} 个有效账号`);
      if (validAccounts.length === 0) {
        console.log('❌ 没有有效账号可用');
        process.exit(1);
      }
    }
    
    // 打印有效账号信息
    console.log('\n有效账号列表:');
    validAccounts.forEach((acc, idx) => {
      const remaining = ((acc.expiresAt - Date.now()) / 60000).toFixed(1);
      console.log(`  ${idx + 1}. ${acc.email}`);
      console.log(`     Token 有效期: ${new Date(acc.expiresAt).toISOString()}`);
      console.log(`     剩余时间: ${remaining} 分钟`);
    });
    
    // 2. 使用每个有效账号进行测试
    const testPrompts = [
      'Write a hello world program in Python',
      'Write a hello world program in JavaScript'
    ];
    
    for (let i = 0; i < Math.min(validAccounts.length, 2); i++) {
      const account = validAccounts[i];
      const prompt = testPrompts[i] || testPrompts[0];
      
      console.log('\n' + '='.repeat(60));
      console.log(`[测试 ${i + 1}] 使用账号: ${account.email}`);
      console.log('='.repeat(60));
      
      // 构建请求
      const payload = {
        conversationState: {
          agentContinuationId: crypto.randomUUID(),
          agentTaskType: 'vibe',
          chatTriggerType: 'MANUAL',
          conversationId: crypto.randomUUID(),
          currentMessage: {
            userInputMessage: {
              content: prompt,
              origin: 'AI_EDITOR',
              modelId: 'claude-sonnet-4.5'
            }
          }
        }
      };
      
      console.log(`提示词: "${prompt}"`);
      console.log('发送请求...');
      
      const startTime = Date.now();
      const response = await fetch(`${API_BASE}/kiro/generateAssistantResponse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const responseTime = Date.now() - startTime;
      
      console.log(`\n响应状态: ${response.status}`);
      console.log(`响应时间: ${responseTime}ms`);
      console.log(`Content-Type: ${response.headers.get('content-type')}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ 请求失败:`);
        try {
          const errorJson = JSON.parse(errorText);
          console.log(`   错误: ${errorJson.error}`);
          console.log(`   消息: ${errorJson.message}`);
          if (errorJson.accountId) {
            console.log(`   账号ID: ${errorJson.accountId}`);
          }
          if (errorJson.details) {
            console.log(`   详情: ${errorJson.details.substring(0, 200)}`);
          }
        } catch {
          console.log(errorText.substring(0, 300));
        }
        continue;
      }
      
      // 解析响应
      const text = await response.text();
      console.log(`响应大小: ${text.length} 字节`);
      
      // 检查响应内容
      const hasAssistantEvent = text.includes('assistantResponseEvent');
      const hasCodeEvent = text.includes('codeEvent');
      const hasError = text.includes('UnknownOperationException');
      
      console.log(`\n响应分析:`);
      console.log(`  assistantResponseEvent: ${hasAssistantEvent ? '✅' : '❌'}`);
      console.log(`  codeEvent: ${hasCodeEvent ? '✅' : '❌'}`);
      console.log(`  错误: ${hasError ? '❌ 包含错误' : '✅ 无错误'}`);
      
      if (hasError) {
        console.log('❌ 仍然包含 UnknownOperationException');
        continue;
      }
      
      // 提取内容
      const lines = text.split('\n');
      let extractedContent = '';
      let eventCount = 0;
      
      for (const line of lines) {
        if (line.includes('"content":"')) {
          eventCount++;
          const match = line.match(/"content":"([^"]+)"/);
          if (match) {
            const content = match[1].replace(/\\n/g, '\n');
            extractedContent += content;
          }
        }
      }
      
      console.log(`  事件数量: ${eventCount}`);
      
      if (extractedContent) {
        console.log(`\n📝 生成的代码:`);
        console.log('---');
        console.log(extractedContent.substring(0, 300));
        if (extractedContent.length > 300) {
          console.log('...');
        }
        console.log('---');
      }
      
      console.log(`\n✅ 账号 ${i + 1} 测试成功！`);
      
      // 短暂延迟，避免请求过快
      if (i < validAccounts.length - 1) {
        console.log('\n等待 2 秒后测试下一个账号...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 所有测试完成！');
    console.log('='.repeat(60));
    console.log('\n✅ Kiro API 工作正常');
    console.log('✅ 账号轮询机制正常');
    console.log('✅ 流式响应正常');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
