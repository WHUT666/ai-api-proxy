// 测试智能账号池和自动切换功能
const API_BASE = 'https://ai-api-proxy.2358314123.workers.dev';

async function testSmartPooling() {
  console.log('🧪 测试智能账号池功能\n');
  
  try {
    // 测试1: 简单聊天请求
    console.log('[测试 1] 发送聊天请求...');
    const chatResponse = await fetch(`${API_BASE}/kiro/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4.5',
        messages: [
          {
            role: 'user',
            content: 'Say "Hello from Kiro!" and nothing else.'
          }
        ],
        stream: false,
        max_tokens: 50
      })
    });
    
    console.log(`  - 状态码: ${chatResponse.status}`);
    
    if (chatResponse.ok) {
      const data = await chatResponse.json();
      console.log(`  - 响应: ${data.choices[0].message.content}`);
      console.log('  ✓ 测试 1 通过');
    } else {
      const error = await chatResponse.text();
      console.log(`  ✗ 测试 1 失败: ${error}`);
    }
    
    console.log('');
    
    // 测试2: 流式响应
    console.log('[测试 2] 发送流式请求...');
    const streamResponse = await fetch(`${API_BASE}/kiro/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4.5',
        messages: [
          {
            role: 'user',
            content: 'Count from 1 to 5.'
          }
        ],
        stream: true,
        max_tokens: 100
      })
    });
    
    console.log(`  - 状态码: ${streamResponse.status}`);
    
    if (streamResponse.ok) {
      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        chunkCount++;
      }
      
      console.log(`  - 接收到 ${chunkCount} 个数据块`);
      console.log(`  - 总大小: ${buffer.length} 字节`);
      console.log('  ✓ 测试 2 通过');
    } else {
      const error = await streamResponse.text();
      console.log(`  ✗ 测试 2 失败: ${error}`);
    }
    
    console.log('');
    
    // 测试3: 连续请求（测试负载均衡）
    console.log('[测试 3] 发送 5 个连续请求...');
    const requests = [];
    
    for (let i = 1; i <= 5; i++) {
      requests.push(
        fetch(`${API_BASE}/kiro/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4.5',
            messages: [
              {
                role: 'user',
                content: `Say "Request ${i}" and nothing else.`
              }
            ],
            stream: false,
            max_tokens: 20
          })
        })
      );
    }
    
    const results = await Promise.all(requests);
    const successCount = results.filter(r => r.ok).length;
    
    console.log(`  - 成功: ${successCount}/5`);
    console.log(`  - 失败: ${5 - successCount}/5`);
    
    if (successCount === 5) {
      console.log('  ✓ 测试 3 通过');
    } else {
      console.log(`  ⚠ 测试 3 部分通过 (${successCount}/5)`);
    }
    
    console.log('');
    
    // 测试4: 检查账号池状态
    console.log('[测试 4] 检查账号池状态...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log(`  - 总账号数: ${health.accounts?.total || 'N/A'}`);
      console.log(`  - Kiro 账号: ${health.accounts?.kiro || 'N/A'}`);
      console.log('  ✓ 测试 4 通过');
    } else {
      console.log('  ✗ 测试 4 失败');
    }
    
    console.log('\n✅ 所有测试完成！');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

testSmartPooling();
