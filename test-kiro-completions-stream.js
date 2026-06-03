// Kiro Responses 格式专用真机联调实测脚本
const BASE_URL = 'https://ai-api-proxy.2358314123.workers.dev/kiro/v1';

async function runTest() {
  console.log('🧪 开始对线上 Cloudflare Workers 进行 Responses 格式的真机多通路调用测试...\n');
  
  const nonStreamOk = await testResponsesNonStream();
  if (nonStreamOk) {
    await testResponsesStream();
  }
}

async function testResponsesNonStream() {
  console.log('📡 [1/2] 开始测试 Kiro Responses 非流式（Non-Stream） 响应端点...');
  try {
    const response = await fetch(`${BASE_URL}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        input: 'Say "Hello Responses" in exactly three words.',
        stream: false
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`  ❌ 400/500 报错: ${response.status} - ${errText}`);
      return false;
    }

    const json = await response.json();
    console.log('  ✓ 收到合法的 Responses JSON 响应:');
    console.log(JSON.stringify(json, null, 2));
    return true;
  } catch (err) {
    console.error(`  ❌ 发生网络或连接错误:`, err.message);
    return false;
  }
}

async function testResponsesStream() {
  console.log('\n📡 [2/2] 开始测试 Kiro Responses 规范流式（Stream SSE） 响应端点...');
  try {
    const response = await fetch(`${BASE_URL}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        input: 'What is 1+1? Answer in one short sentence.',
        stream: true
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`  ❌ 400/500 流式报错: ${response.status} - ${errText}`);
      return false;
    }

    console.log('  ✓ 连接建立成功，开始接收 Responses SSE 字节流...\n');
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 保留不完整的一行

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          if (line.includes('[DONE]')) {
            console.log('\n\n  ✓ 接收到 [DONE] 终结信号，Responses 流式测试顺利结束！');
            return true;
          }
          try {
            const data = JSON.parse(line.substring(6));
            const deltaText = data.delta?.text;
            if (deltaText) {
              process.stdout.write(deltaText);
            }
          } catch (e) {
          }
        }
      }
    }
    return true;
  } catch (err) {
    console.error(`  ❌ 发生流式网络或连接错误:`, err.message);
    return false;
  }
}

runTest().catch(console.error);
