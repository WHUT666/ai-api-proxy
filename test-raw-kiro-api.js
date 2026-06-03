// 直接测试 Kiro API 原始响应
const API_BASE = 'https://ai-api-proxy.2358314123.workers.dev';
const ADMIN_KEY = 'kiro-admin-2024';

async function testRawKiroAPI() {
  console.log('🔍 测试 Kiro API 原始响应\n');
  
  try {
    // 先获取一个可用账号
    console.log('[步骤 1] 获取账号信息');
    const accountsResponse = await fetch(`${API_BASE}/admin/accounts`, {
      headers: { 'Authorization': `Bearer ${ADMIN_KEY}` }
    });
    
    const accountsData = await accountsResponse.json();
    const account = accountsData.accounts.find(a => 
      a.accessToken && a.expiresAt && a.expiresAt > Date.now()
    );
    
    if (!account) {
      console.log('❌ 没有找到可用账号');
      return;
    }
    
    console.log(`使用账号: ${account.email || account.id.substring(0, 8)}`);
    console.log(`Token 长度: ${account.accessToken.length}`);
    console.log(`过期时间: ${new Date(account.expiresAt).toLocaleString()}`);
    
    // 直接调用 Kiro API
    console.log('\n[步骤 2] 直接调用 Kiro API');
    
    const kiroPayload = {
      conversationState: {
        conversationId: 'test-' + Date.now(),
        history: [
          {
            utteranceId: 'user-1',
            userIntent: 'SUGGEST_ALTERNATE_IMPLEMENTATION',
            body: 'Say "Hello from Kiro!" in English.'
          }
        ],
        currentMessage: {
          utteranceId: 'user-2',
          userIntent: 'SUGGEST_ALTERNATE_IMPLEMENTATION',
          body: 'Say "Hello from Kiro!" in English.'
        },
        chatTriggerType: 'MANUAL'
      },
      profileArn: account.profileArn || 'arn:aws:codewhisperer:us-east-1:638616132270:profile/AAAACCCCXXXX'
    };
    
    const region = account.region || 'us-east-1';
    const kiroUrl = `https://codewhisperer.${region}.amazonaws.com/generateAssistantResponse`;
    
    console.log(`请求 URL: ${kiroUrl}`);
    
    const kiroResponse = await fetch(kiroUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${account.accessToken}`,
        'x-amzn-kiro-agent-mode': 'spec',
        'x-amz-user-agent': 'aws-sdk-js/3.698.0 KiroIDE-1.0.0',
        'user-agent': 'aws-sdk-js/3.698.0 ua/2.1 os/linux lang/js md/nodejs#20.0.0 api/codewhispererstreaming#2024-11-20 m/E KiroIDE-1.0.0',
        'amz-sdk-invocation-id': crypto.randomUUID(),
        'amz-sdk-request': 'attempt=1; max=3'
      },
      body: JSON.stringify(kiroPayload)
    });
    
    console.log(`\n状态码: ${kiroResponse.status}`);
    console.log(`Content-Type: ${kiroResponse.headers.get('content-type')}`);
    
    if (!kiroResponse.ok) {
      const error = await kiroResponse.text();
      console.log(`\n❌ Kiro API 错误:\n${error}`);
      return;
    }
    
    console.log('\n[步骤 3] 解析响应');
    const reader = kiroResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let events = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
    }
    
    console.log(`\n原始响应 (${buffer.length} 字节):`);
    console.log(buffer.substring(0, 1000));
    
    // 解析事件流
    console.log('\n[步骤 4] 解析事件');
    const lines = buffer.split('\n');
    let content = '';
    
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const data = line.slice(5).trim();
        if (data && data !== '[DONE]') {
          try {
            const event = JSON.parse(data);
            events.push(event);
            
            console.log(`\n事件类型: ${Object.keys(event).join(', ')}`);
            
            if (event.assistantResponseEvent) {
              console.log('  assistantResponseEvent:');
              console.log(`    content: "${event.assistantResponseEvent.content || ''}"`);
              if (event.assistantResponseEvent.content) {
                content += event.assistantResponseEvent.content;
              }
            }
            
            if (event.codeEvent) {
              console.log('  codeEvent:');
              console.log(`    content: "${event.codeEvent.content || ''}"`);
              if (event.codeEvent.content) {
                content += event.codeEvent.content;
              }
            }
          } catch (e) {
            console.log(`  解析错误: ${e.message}`);
          }
        }
      }
    }
    
    console.log(`\n[步骤 5] 提取的完整内容:`);
    console.log(`"${content}"`);
    console.log(`\n总事件数: ${events.length}`);
    console.log(`内容长度: ${content.length} 字符`);
    
    if (content.length === 0) {
      console.log('\n⚠️  警告: 没有从 Kiro API 提取到任何内容！');
      console.log('检查事件结构...');
      
      if (events.length > 0) {
        console.log('\n第一个事件的完整结构:');
        console.log(JSON.stringify(events[0], null, 2));
      }
    }
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
  }
}

testRawKiroAPI();
