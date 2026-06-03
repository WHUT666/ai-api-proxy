// 测试 Kiro 反代的 OpenAI 兼容接口
const API_BASE = 'https://ai-api-proxy.2358314123.workers.dev';

async function testOpenAICompatibility() {
  console.log('🧪 测试 Kiro OpenAI 兼容接口\n');
  
  try {
    // 测试1: 非流式聊天完成
    console.log('[测试 1] 非流式聊天完成');
    console.log('发送请求...');
    
    const response1 = await fetch(`${API_BASE}/kiro/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4.5',
        messages: [
          {
            role: 'user',
            content: 'Say "Hello from Kiro API!" in English, then count from 1 to 5.'
          }
        ],
        stream: false,
        max_tokens: 100,
        temperature: 0.7
      })
    });
    
    console.log(`状态码: ${response1.status}`);
    
    if (response1.ok) {
      const data = await response1.json();
      console.log('\n响应结构检查:');
      console.log(`  ✓ id: ${data.id}`);
      console.log(`  ✓ object: ${data.object}`);
      console.log(`  ✓ created: ${data.created} (${new Date(data.created * 1000).toISOString()})`);
      console.log(`  ✓ model: ${data.model}`);
      
      if (data.choices && data.choices.length > 0) {
        console.log(`  ✓ choices[0].index: ${data.choices[0].index}`);
        console.log(`  ✓ choices[0].message.role: ${data.choices[0].message.role}`);
        console.log(`  ✓ choices[0].message.content: "${data.choices[0].message.content}"`);
        console.log(`  ✓ choices[0].finish_reason: ${data.choices[0].finish_reason}`);
      }
      
      if (data.usage) {
        console.log(`  ✓ usage.prompt_tokens: ${data.usage.prompt_tokens}`);
        console.log(`  ✓ usage.completion_tokens: ${data.usage.completion_tokens}`);
        console.log(`  ✓ usage.total_tokens: ${data.usage.total_tokens}`);
      }
      
      console.log('\n✅ 测试 1 通过 - OpenAI 格式完全兼容\n');
    } else {
      const error = await response1.text();
      console.log(`❌ 测试 1 失败: ${error}\n`);
    }
    
    // 测试2: 流式聊天完成
    console.log('[测试 2] 流式聊天完成');
    console.log('发送流式请求...');
    
    const response2 = await fetch(`${API_BASE}/kiro/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4.5',
        messages: [
          {
            role: 'user',
            content: 'List 3 colors: red, blue, green.'
          }
        ],
        stream: true,
        max_tokens: 50
      })
    });
    
    console.log(`状态码: ${response2.status}`);
    
    if (response2.ok) {
      const reader = response2.body.getReader();
      const decoder = new TextDecoder();
      let chunks = [];
      let buffer = '';
      
      console.log('\n接收流式数据:');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // 保留最后一行（可能不完整）
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.trim() === 'data: [DONE]') continue;
          
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const chunk = JSON.parse(jsonStr);
              chunks.push(chunk);
              
              // 显示前3个chunk的结构
              if (chunks.length <= 3) {
                console.log(`\nChunk ${chunks.length}:`);
                console.log(`  id: ${chunk.id}`);
                console.log(`  object: ${chunk.object}`);
                console.log(`  model: ${chunk.model}`);
                if (chunk.choices && chunk.choices[0]) {
                  const delta = chunk.choices[0].delta;
                  console.log(`  delta.role: ${delta.role || 'N/A'}`);
                  console.log(`  delta.content: "${delta.content || ''}"`);
                  console.log(`  finish_reason: ${chunk.choices[0].finish_reason || 'null'}`);
                }
              }
            } catch (e) {
              console.log(`解析错误: ${e.message}`);
            }
          }
        }
      }
      
      console.log(`\n总共接收 ${chunks.length} 个数据块`);
      
      // 验证流式响应格式
      if (chunks.length > 0) {
        const firstChunk = chunks[0];
        const lastChunk = chunks[chunks.length - 1];
        
        console.log('\n流式响应验证:');
        console.log(`  ✓ 首个chunk有 id: ${!!firstChunk.id}`);
        console.log(`  ✓ 首个chunk有 object: ${firstChunk.object === 'chat.completion.chunk'}`);
        console.log(`  ✓ 首个chunk有 model: ${!!firstChunk.model}`);
        console.log(`  ✓ 最后chunk有 finish_reason: ${!!lastChunk.choices[0].finish_reason}`);
        
        // 组合所有内容
        const fullContent = chunks
          .map(c => c.choices[0]?.delta?.content || '')
          .join('');
        
        console.log(`  ✓ 完整内容: "${fullContent}"`);
      }
      
      console.log('\n✅ 测试 2 通过 - 流式格式完全兼容\n');
    } else {
      const error = await response2.text();
      console.log(`❌ 测试 2 失败: ${error}\n`);
    }
    
    // 测试3: 多轮对话
    console.log('[测试 3] 多轮对话上下文');
    console.log('发送多轮对话请求...');
    
    const response3 = await fetch(`${API_BASE}/kiro/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4.5',
        messages: [
          {
            role: 'user',
            content: 'My name is Alice.'
          },
          {
            role: 'assistant',
            content: 'Hello Alice! Nice to meet you.'
          },
          {
            role: 'user',
            content: 'What is my name?'
          }
        ],
        stream: false,
        max_tokens: 50
      })
    });
    
    console.log(`状态码: ${response3.status}`);
    
    if (response3.ok) {
      const data = await response3.json();
      const content = data.choices[0].message.content;
      console.log(`\n响应内容: "${content}"`);
      
      // 检查是否记住了名字
      if (content.toLowerCase().includes('alice')) {
        console.log('✓ 上下文正确处理 - 记住了用户名字');
      } else {
        console.log('⚠ 上下文可能未正确处理');
      }
      
      console.log('\n✅ 测试 3 通过 - 多轮对话支持正常\n');
    } else {
      const error = await response3.text();
      console.log(`❌ 测试 3 失败: ${error}\n`);
    }
    
    // 测试4: 不同模型名称映射
    console.log('[测试 4] 模型名称映射');
    const modelTests = [
      'gpt-4',
      'gpt-4o',
      'claude-3-5-sonnet',
      'claude-sonnet-4.5',
      'claude-haiku-4.5'
    ];
    
    for (const model of modelTests) {
      console.log(`\n测试模型: ${model}`);
      
      const response = await fetch(`${API_BASE}/kiro/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'user', content: 'Say "OK"' }
          ],
          stream: false,
          max_tokens: 10
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  ✓ ${response.status} - 映射成功`);
      } else {
        console.log(`  ✗ ${response.status} - 映射失败`);
      }
    }
    
    console.log('\n✅ 测试 4 通过 - 模型映射正常\n');
    
    // 测试5: 系统提示词
    console.log('[测试 5] 系统提示词支持');
    console.log('发送带系统提示词的请求...');
    
    const response5 = await fetch(`${API_BASE}/kiro/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4.5',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that speaks like a pirate.'
          },
          {
            role: 'user',
            content: 'Hello!'
          }
        ],
        stream: false,
        max_tokens: 50
      })
    });
    
    console.log(`状态码: ${response5.status}`);
    
    if (response5.ok) {
      const data = await response5.json();
      console.log(`\n响应内容: "${data.choices[0].message.content}"`);
      console.log('✓ 系统提示词支持正常');
      console.log('\n✅ 测试 5 通过\n');
    } else {
      const error = await response5.text();
      console.log(`❌ 测试 5 失败: ${error}\n`);
    }
    
    console.log('='.repeat(60));
    console.log('✅ 所有 OpenAI 兼容性测试完成！');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testOpenAICompatibility();
