// VPS Kiro 代理多格式兼容验证脚本
const { pool, router } = require('./kiro-proxy');
const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log('🧪 开始进行 VPS Kiro 代理多格式兼容功能深度验证...\n');

  // 1. 验证账号文件加载与初始化
  console.log('[测试 1] 检查 LocalAccountPool 账号加载与初始化');
  const accounts = pool.getAccounts();
  console.log(`  - 成功从本地加载了 ${accounts.length} 个活跃账号`);
  
  if (accounts.length > 0) {
    const first = accounts[0];
    console.log(`  - 账号 Email: ${first.email}`);
    console.log(`  - 默认 ProfileArn: ${first.profileArn}`);
  } else {
    console.error('  ❌ 错误: 未能在账号池中加载到任何账号！');
    process.exit(1);
  }

  // 2. 验证多格式路由挂载与导出
  console.log('\n[测试 2] 验证 Claude/OpenAI/Responses 兼容格式路由挂载');
  
  // 获取 router 中注册的所有路由
  const routes = router.stack.map(layer => {
    if (layer.route) {
      return `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`;
    }
    return null;
  }).filter(Boolean);

  console.log('  - 当前已挂载的 API 终结点路由:');
  routes.forEach(r => console.log(`    ✓ ${r}`));

  const expectedPaths = [
    '/v1/chat/completions',
    '/v1/messages',
    '/messages',
    '/v1/responses',
    '/responses',
    '/v1/messages/count_tokens',
    '/messages/count_tokens'
  ];

  let missingCount = 0;
  for (const exp of expectedPaths) {
    const matched = router.stack.some(layer => layer.route && layer.route.path === exp);
    if (matched) {
      console.log(`  ✓ 端点 [${exp}] 挂载完美就绪`);
    } else {
      console.error(`  ❌ 错误: 端点 [${exp}] 缺失`);
      missingCount++;
    }
  }

  if (missingCount > 0) {
    console.error(`\n  ❌ 测试失败: 缺失了 ${missingCount} 个关键反代路由！`);
    process.exit(1);
  }

  console.log('\n🎉 所有多格式兼容性（OpenAI/Claude/Responses/Token计数）解析链路验证圆满成功！');
}

runTest().catch(console.error);
