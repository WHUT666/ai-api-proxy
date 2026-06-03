// 直接测试 Kiro API 原始响应格式
const crypto = require('crypto');

async function testKiroRawAPI() {
  console.log('🔍 测试 Kiro API 原始二进制响应\n');
  
  // 使用一个测试账号的 token（从之前的测试得知）
  const region = 'us-east-1';
  const kiroUrl = `https://codewhisperer.${region}.amazonaws.com/generateAssistantResponse`;
  
  // 注意：需要真实的 accessToken
  const testToken = 'YOUR_TOKEN_HERE'; // 这个需要替换
  
  const kiroPayload = {
    conversationState: {
      conversationId: 'test-' + Date.now(),
      history: [],
      currentMessage: {
        utteranceId: 'user-1',
        userIntent: 'SUGGEST_ALTERNATE_IMPLEMENTATION',
        body: 'Say exactly: "Hello World" and nothing else.'
      },
      chatTriggerType: 'MANUAL'
    },
    profileArn: 'arn:aws:codewhisperer:us-east-1:638616132270:profile/AAAACCCCXXXX'
  };
  
  console.log('请求 URL:', kiroUrl);
  console.log('请求 Payload:', JSON.stringify(kiroPayload, null, 2));
  console.log('\n发送请求...\n');
  
  try {
    const response = await fetch(kiroUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`,
        'x-amzn-kiro-agent-mode': 'spec',
        'x-amz-user-agent': 'aws-sdk-js/3.698.0 KiroIDE-1.0.0',
        'user-agent': 'aws-sdk-js/3.698.0 ua/2.1 os/linux lang/js md/nodejs#20.0.0 api/codewhispererstreaming#2024-11-20 m/E KiroIDE-1.0.0',
        'amz-sdk-invocation-id': crypto.randomUUID(),
        'amz-sdk-request': 'attempt=1; max=3'
      },
      body: JSON.stringify(kiroPayload)
    });
    
    console.log('状态码:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('');
    
    if (!response.ok) {
      const error = await response.text();
      console.log('错误响应:', error);
      return;
    }
    
    // 读取二进制数据
    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    console.log('响应大小:', buffer.length, 'bytes');
    console.log('前64字节 (hex):');
    console.log(Array.from(buffer.slice(0, 64)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    console.log('');
    
    // 尝试解析 AWS Event Stream
    let offset = 0;
    let eventNum = 0;
    
    console.log('解析事件流:\n');
    
    while (offset < buffer.length && eventNum < 10) {
      if (offset + 16 > buffer.length) break;
      
      // 读取总长度（big-endian）
      const totalLength = (buffer[offset] << 24) | (buffer[offset + 1] << 16) | 
                         (buffer[offset + 2] << 8) | buffer[offset + 3];
      
      if (offset + totalLength > buffer.length) break;
      
      // 读取头部长度
      const headersLength = (buffer[offset + 4] << 24) | (buffer[offset + 5] << 16) | 
                           (buffer[offset + 6] << 8) | buffer[offset + 7];
      
      // 提取 payload
      const payloadStart = offset + 12 + headersLength;
      const payloadEnd = offset + totalLength - 4;
      
      if (payloadStart < payloadEnd) {
        const payloadBytes = buffer.slice(payloadStart, payloadEnd);
        const payloadText = new TextDecoder().decode(payloadBytes);
        
        try {
          const event = JSON.parse(payloadText);
          eventNum++;
          
          console.log(`事件 ${eventNum}:`);
          console.log(`  长度: ${totalLength} bytes`);
          console.log(`  键: ${Object.keys(event).join(', ')}`);
          
          if (event.assistantResponseEvent) {
            console.log(`  assistantResponseEvent.content: "${event.assistantResponseEvent.content || ''}"`);
          }
          
          if (event.messageMetadataEvent) {
            console.log(`  messageMetadataEvent:`, JSON.stringify(event.messageMetadataEvent));
          }
          
          if (event.codeEvent) {
            console.log(`  codeEvent.content: "${event.codeEvent.content || ''}"`);
          }
          
          console.log('');
        } catch (e) {
          console.log(`  解析错误: ${e.message}`);
          console.log(`  原始文本: ${payloadText.substring(0, 200)}`);
          console.log('');
        }
      }
      
      offset += totalLength;
    }
    
    console.log(`\n总共解析 ${eventNum} 个事件`);
    
  } catch (error) {
    console.error('错误:', error.message);
  }
}

console.log('⚠️  注意: 此脚本需要有效的 accessToken');
console.log('请先运行 "node ops.js status" 查看可用账号');
console.log('然后手动从 KV 中获取一个账号的 accessToken');
console.log('或修改此脚本通过管理接口获取\n');

// testKiroRawAPI();
console.log('脚本已准备好，取消注释最后一行来运行');
