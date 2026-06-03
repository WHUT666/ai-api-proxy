// 测试实际 API 调用并查看详细错误
const API_BASE = 'https://ai-api-proxy.2358314123.workers.dev';

async function testActualAPI() {
  console.log('🔍 测试实际 API 调用\n');
  
  try {
    console.log('[测试 1] 简单请求');
    const response = await fetch(`${API_BASE}/kiro/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4.5',
        messages: [
          { role: 'user', content: 'Say exactly: "Test successful"' }
        ],
        stream: false,
        max_tokens: 20
      })
    });
    
    console.log(`状态码: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    const text = await response.text();
    console.log(`\n响应长度: ${text.length} 字节`);
    console.log(`\n完整响应:`);
    console.log(text);
    
    // 尝试解析
    try {
      const data = JSON.parse(text);
      console.log('\n解析后的数据:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.choices && data.choices[0]) {
        const content = data.choices[0].message.content;
        console.log(`\n提取的内容: "${content}"`);
        
        if (content && content.length > 0) {
          console.log('\n✅ API 工作正常！内容已正确返回');
        } else {
          console.log('\n❌ 问题: 内容为空');
          console.log('这可能是因为:');
          console.log('1. Kiro API 响应格式变化');
          console.log('2. 响应解析逻辑有问题');
          console.log('3. Token 无效');
        }
      }
      
      if (data.error) {
        console.log('\n❌ API 返回错误:');
        console.log(`错误: ${data.error}`);
        console.log(`消息: ${data.message}`);
        if (data.kiroError) {
          console.log(`Kiro 错误: ${data.kiroError}`);
        }
      }
      
    } catch (e) {
      console.log('\n解析 JSON 失败:', e.message);
    }
    
    // 检查 Worker 日志
    console.log('\n提示: 使用 "npx wrangler tail" 查看详细的 Worker 日志');
    
  } catch (error) {
    console.error('\n❌ 请求失败:', error.message);
    console.error(error.stack);
  }
}

testActualAPI();
