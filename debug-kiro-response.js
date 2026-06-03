// 调试 Kiro API 原始响应
const API_BASE = 'https://ai-api-proxy.2358314123.workers.dev';

async function debugKiroResponse() {
  console.log('🔍 调试 Kiro API 原始响应\n');
  
  try {
    console.log('[步骤 1] 发送测试请求');
    const response = await fetch(`${API_BASE}/kiro/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4.5',
        messages: [
          { role: 'user', content: 'Say "Hello World" and nothing else.' }
        ],
        stream: false,
        max_tokens: 20
      })
    });
    
    console.log(`状态码: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    console.log('\n[步骤 2] 获取原始响应');
    const rawText = await response.text();
    console.log(`响应长度: ${rawText.length} 字节`);
    console.log(`\n原始响应:\n${rawText.substring(0, 500)}`);
    
    console.log('\n[步骤 3] 尝试解析 JSON');
    try {
      const data = JSON.parse(rawText);
      console.log('\nJSON 结构:');
      console.log(JSON.stringify(data, null, 2));
    } catch (e) {
      console.log(`JSON 解析失败: ${e.message}`);
    }
    
    // 测试流式响应
    console.log('\n\n[步骤 4] 测试流式响应');
    const streamResponse = await fetch(`${API_BASE}/kiro/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4.5',
        messages: [
          { role: 'user', content: 'Count: 1, 2, 3' }
        ],
        stream: true,
        max_tokens: 50
      })
    });
    
    console.log(`状态码: ${streamResponse.status}`);
    console.log(`Content-Type: ${streamResponse.headers.get('content-type')}`);
    
    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chunkNum = 0;
    
    console.log('\n流式数据:');
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      chunkNum++;
      
      console.log(`\nChunk ${chunkNum} (${value.length} 字节):`);
      console.log(chunk.substring(0, 200));
    }
    
    console.log(`\n总共 ${chunkNum} 个chunk, ${buffer.length} 字节`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  }
}

debugKiroResponse();
