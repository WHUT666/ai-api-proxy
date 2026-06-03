// 批量导入本地账号数据到 Cloudflare KV
const ADMIN_KEY = 'kiro-admin-2024';
const API_BASE = 'https://ai-api-proxy.2358314123.workers.dev';
const accountsData = require('./accounts_part7.json');

(async () => {
  console.log('📥 开始批量导入本地账号数据...\n');
  
  try {
    console.log(`[步骤 1] 读取本地账号数据`);
    console.log(`  - 账号总数: ${accountsData.length}`);
    console.log(`  - Provider: BuilderId (OIDC)`);
    
    // 转换为 worker 需要的格式
    const results = {
      success: [],
      failed: [],
      skipped: []
    };
    
    console.log(`\n[步骤 2] 批量导入账号到 KV 存储`);
    
    for (let i = 0; i < accountsData.length; i++) {
      const account = accountsData[i];
      
      console.log(`\n[${i + 1}/${accountsData.length}] 导入: ${account.email}`);
      
      // 构建 worker 格式的账号数据
      const workerAccount = {
        email: account.email,
        clientId: account.clientId,
        clientSecret: account.clientSecret,
        refreshToken: account.refreshToken,
        region: account.region || 'us-east-1',
        provider: 'kiro',
        authMethod: 'oidc', // BuilderId 使用 OIDC
        profileArn: 'arn:aws:codewhisperer:us-east-1:638616132270:profile/AAAACCCCXXXX'
      };
      
      try {
        const response = await fetch(`${API_BASE}/admin/accounts/kiro`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ADMIN_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(workerAccount)
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log(`  ✓ 成功: ID=${result.account.id.substring(0, 8)}...`);
          results.success.push(account.email);
        } else {
          console.log(`  ✗ 失败: ${result.error || result.message}`);
          results.failed.push({ email: account.email, error: result.error || result.message });
        }
        
      } catch (error) {
        console.log(`  ✗ 错误: ${error.message}`);
        results.failed.push({ email: account.email, error: error.message });
      }
      
      // 短暂延迟避免请求过快
      if (i < accountsData.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 导入结果统计:');
    console.log(`  ✓ 成功: ${results.success.length}`);
    console.log(`  ✗ 失败: ${results.failed.length}`);
    console.log(`  ⊘ 跳过: ${results.skipped.length}`);
    
    if (results.failed.length > 0) {
      console.log('\n失败的账号:');
      results.failed.forEach(f => {
        console.log(`  - ${f.email}: ${f.error}`);
      });
    }
    
    console.log('\n[步骤 3] 刷新所有导入账号的 Token');
    
    // 等待账号导入完成后再批量刷新
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const refreshResults = { success: 0, failed: 0 };
    
    // 获取所有账号
    const accountsResponse = await fetch(`${API_BASE}/admin/accounts`, {
      headers: { 'Authorization': `Bearer ${ADMIN_KEY}` }
    });
    
    const allAccounts = (await accountsResponse.json()).accounts;
    
    console.log(`  - 当前总账号数: ${allAccounts.length}`);
    console.log('  - 开始批量刷新...');
    
    for (const account of allAccounts) {
      // 只刷新刚导入的账号（没有 expiresAt 或已过期的）
      if (!account.expiresAt || account.expiresAt < Date.now()) {
        try {
          const refreshResponse = await fetch(
            `${API_BASE}/admin/accounts/${account.id}/refresh`,
            {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${ADMIN_KEY}` }
            }
          );
          
          const refreshResult = await refreshResponse.json();
          
          if (refreshResult.success) {
            console.log(`  ✓ ${account.email}`);
            refreshResults.success++;
          } else {
            console.log(`  ✗ ${account.email}: ${refreshResult.error}`);
            refreshResults.failed++;
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.log(`  ✗ ${account.email}: ${error.message}`);
          refreshResults.failed++;
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🔄 Token 刷新结果:');
    console.log(`  ✓ 成功: ${refreshResults.success}`);
    console.log(`  ✗ 失败: ${refreshResults.failed}`);
    
    console.log('\n✅ 批量导入完成！');
    
  } catch (error) {
    console.error('\n❌ 导入失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
