// 测试更复杂的对话
const https = require('https');

const agent = new https.Agent({
  rejectUnauthorized: false
});

const testCases = [
  {
    name: "简单问候",
    messages: [{ role: "user", content: "Hello" }]
  },
  {
    name: "编程问题",
    messages: [{ role: "user", content: "Write a Python function to calculate fibonacci numbers" }]
  },
  {
    name: "多轮对话",
    messages: [
      { role: "user", content: "What is 2+2?" },
      { role: "assistant", content: "2+2 equals 4." },
      { role: "user", content: "What about 3+3?" }
    ]
  }
];

async function testAPI(testCase) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model: "claude-sonnet-4.5",
      messages: testCase.messages,
      stream: false
    });

    const options = {
      hostname: 'ai-api-proxy.2358314123.workers.dev',
      path: '/kiro/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      },
      agent: agent
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            status: res.statusCode,
            content: response.choices?.[0]?.message?.content || '',
            fullResponse: response
          });
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 运行综合测试\n');
  console.log('='.repeat(80));
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n测试 ${i + 1}/${testCases.length}: ${testCase.name}`);
    console.log('-'.repeat(80));
    console.log('输入消息:');
    testCase.messages.forEach((msg, idx) => {
      console.log(`  ${idx + 1}. [${msg.role}]: ${msg.content.substring(0, 60)}${msg.content.length > 60 ? '...' : ''}`);
    });
    
    try {
      const result = await testAPI(testCase);
      console.log(`\n状态: ${result.status}`);
      console.log(`响应长度: ${result.content.length} 字符`);
      console.log(`响应内容:\n${result.content.substring(0, 200)}${result.content.length > 200 ? '...' : ''}`);
      
      if (result.content.length > 0) {
        console.log('\n✅ 测试通过');
      } else {
        console.log('\n❌ 测试失败: 返回内容为空');
      }
    } catch (e) {
      console.log(`\n❌ 测试失败: ${e.message}`);
    }
    
    // 等待一下避免请求过快
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('测试完成！');
}

runTests().catch(console.error);
