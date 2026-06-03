// 直接测试 Kiro API 并解析二进制响应
const https = require('https');

const agent = new https.Agent({
  rejectUnauthorized: false
});

const requestBody = JSON.stringify({
  message: "Hello",
  conversationState: {
    currentMessage: { userInputMessage: { content: "Hello" } },
    chatTriggerType: "MANUAL",
    customizationArn: ""
  },
  action: "QUERY"
});

const options = {
  hostname: 'ai-api-proxy.2358314123.workers.dev',
  path: '/kiro/generateAssistantResponse',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestBody)
  },
  agent: agent
};

console.log('🔍 直接测试原生 Kiro 端点并解析二进制响应\n');

const req = https.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头:`, JSON.stringify(res.headers, null, 2));
  
  const chunks = [];
  
  res.on('data', (chunk) => {
    chunks.push(chunk);
  });
  
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    console.log(`\n总接收字节数: ${buffer.length}`);
    
    // 显示前 128 字节的 hex dump
    if (buffer.length > 0) {
      const hexLines = [];
      for (let i = 0; i < Math.min(128, buffer.length); i += 16) {
        const line = buffer.slice(i, Math.min(i + 16, buffer.length));
        const hex = Array.from(line).map(b => b.toString(16).padStart(2, '0')).join(' ');
        const ascii = Array.from(line).map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('');
        hexLines.push(`${i.toString(16).padStart(4, '0')}: ${hex.padEnd(48, ' ')} | ${ascii}`);
      }
      console.log('\n前 128 字节 (hex dump):');
      console.log(hexLines.join('\n'));
    }
    
    // 尝试解析 AWS Event Stream
    console.log('\n开始解析 AWS Event Stream...\n');
    
    let offset = 0;
    let eventCount = 0;
    let totalContent = '';
    
    while (offset < buffer.length) {
      // 至少需要 16 字节
      if (offset + 16 > buffer.length) {
        console.log(`在 offset ${offset} 处数据不足，剩余 ${buffer.length - offset} 字节`);
        break;
      }
      
      // 读取总长度（big-endian uint32）
      const totalLength = buffer.readUInt32BE(offset);
      console.log(`\n事件 #${eventCount + 1} @ offset ${offset}:`);
      console.log(`  总长度: ${totalLength} 字节`);
      
      if (totalLength === 0 || totalLength > 1000000) {
        console.log(`  无效的总长度: ${totalLength}，停止解析`);
        break;
      }
      
      if (offset + totalLength > buffer.length) {
        console.log(`  消息不完整: 需要 ${totalLength}，剩余 ${buffer.length - offset}`);
        break;
      }
      
      // 读取头部长度
      const headersLength = buffer.readUInt32BE(offset + 4);
      console.log(`  头部长度: ${headersLength} 字节`);
      
      // 提取头部并解析 event-type
      const headersStart = offset + 12;
      const headersEnd = headersStart + headersLength;
      const headersBuffer = buffer.slice(headersStart, headersEnd);
      
      // 解析 headers 查找 :event-type
      let eventType = '';
      let hOffset = 0;
      while (hOffset < headersBuffer.length) {
        if (hOffset >= headersBuffer.length) break;
        
        const nameLen = headersBuffer[hOffset];
        hOffset++;
        
        if (hOffset + nameLen > headersBuffer.length) break;
        
        const name = headersBuffer.slice(hOffset, hOffset + nameLen).toString('utf8');
        hOffset += nameLen;
        
        if (hOffset >= headersBuffer.length) break;
        
        const valueType = headersBuffer[hOffset];
        hOffset++;
        
        if (valueType === 7) { // String
          if (hOffset + 2 > headersBuffer.length) break;
          const valueLen = headersBuffer.readUInt16BE(hOffset);
          hOffset += 2;
          
          if (hOffset + valueLen > headersBuffer.length) break;
          
          const value = headersBuffer.slice(hOffset, hOffset + valueLen).toString('utf8');
          hOffset += valueLen;
          
          if (name === ':event-type') {
            eventType = value;
          }
        } else {
          // Skip other types
          break;
        }
      }
      
      console.log(`  事件类型: ${eventType}`);
      
      // 提取 payload
      const payloadStart = offset + 12 + headersLength;
      const payloadEnd = offset + totalLength - 4; // 减去 message CRC
      
      if (payloadStart < payloadEnd) {
        const payloadBytes = buffer.slice(payloadStart, payloadEnd);
        const payloadText = payloadBytes.toString('utf8');
        
        console.log(`  Payload 长度: ${payloadBytes.length} 字节`);
        console.log(`  Payload 预览: ${payloadText.substring(0, 150)}`);
        
        try {
          const event = JSON.parse(payloadText);
          console.log(`  JSON 键: ${Object.keys(event).join(', ')}`);
          
          // 提取内容
          if (event.assistantResponseEvent && event.assistantResponseEvent.content) {
            const content = event.assistantResponseEvent.content;
            totalContent += content;
            console.log(`  ✅ 提取到 assistantResponseEvent.content: "${content}" (${content.length} 字符)`);
          }
          
          if (event.codeEvent && event.codeEvent.content) {
            const content = event.codeEvent.content;
            totalContent += content;
            console.log(`  ✅ 提取到 codeEvent.content: "${content}" (${content.length} 字符)`);
          }
          
          eventCount++;
        } catch (e) {
          console.log(`  ❌ JSON 解析错误: ${e.message}`);
        }
      } else {
        console.log(`  无效的 payload 范围: ${payloadStart} 到 ${payloadEnd}`);
      }
      
      // 移动到下一个消息
      offset += totalLength;
    }
    
    console.log(`\n\n总结:`);
    console.log(`  解析了 ${eventCount} 个事件`);
    console.log(`  提取的总内容: "${totalContent}"`);
    console.log(`  内容长度: ${totalContent.length} 字符`);
    
    if (totalContent.length === 0) {
      console.log('\n❌ 未能提取到任何内容！');
    } else {
      console.log('\n✅ 成功提取内容！');
    }
  });
});

req.on('error', (e) => {
  console.error(`请求错误: ${e.message}`);
});

req.write(requestBody);
req.end();
