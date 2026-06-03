// 通过代理测试并显示原始 Kiro 响应的详细信息
const API_BASE = 'https://ai-api-proxy.2358314123.workers.dev';

async function testWithLogs() {
  console.log('🔍 测试 Kiro API 并查看 Worker 日志\n');
  
  // 发送一个简单的测试请求
  console.log('发送测试请求...');
  const response = await fetch(`${API_BASE}/kiro/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4.5',
      messages: [
        { role: 'user', content: 'Count from 1 to 5, one number per line.' }
      ],
      stream: false,
      max_tokens: 50
    })
  });
  
  console.log(`状态码: ${response.status}\n`);
  
  const data = await response.json();
  console.log('响应内容:');
  console.log(JSON.stringify(data, null, 2));
  
  const content = data.choices[0].message.content;
  console.log(`\n提取的内容: "${content}"`);
  console.log(`内容长度: ${content.length} 字符`);
  
  if (content.length === 0) {
    console.log('\n❌ 内容为空！');
    console.log('\n请运行以下命令查看 Worker 日志：');
    console.log('  npx wrangler tail ai-api-proxy --format pretty');
    console.log('\n然后在另一个终端重新运行此测试');
  } else {
    console.log('\n✅ API 正常工作！');
  }
}

testWithLogs().catch(e => console.error('错误:', e.message));
