// 批量刷新过期的 Kiro 账号
const ADMIN_KEY = 'kiro-admin-2024';
const API_BASE = 'https://ai-api-proxy.2358314123.workers.dev';

(async () => {
  console.log('🔄 开始批量刷新过期的 Kiro 账号...\n');
  
  try {
    // 获取所有账号
    const response = await fetch(`${API_BASE}/admin/accounts`, {
      headers: { 'Authorization': `Bearer ${ADMIN_KEY}` }
    });
    
    if (!response.ok) {
      throw new Error(`获取账号列表失败: ${response.status}`);
    }
    
    const data = await response.json();
    const accounts = data.accounts;
    
    console.log(`📊 总账号数: ${accounts.length}`);
    
    // 筛选出需要刷新的账号（已过期或即将过期）
    const now = Date.now();
    const needRefresh = accounts.filter(acc => {
      if (!acc.expiresAt) return false;
      // 如果 token 已过期或 5 分钟内过期
      return acc.expiresAt < now + 300000;
    });
    
    console.log(`⏰ 需要刷新的账号数: ${needRefresh.length}\n`);
    
    if (needRefresh.length === 0) {
      console.log('✓ 所有账号 token 都有效，无需刷新');
      return;
    }
    
    // 批量刷新
    const results = {
      success: [],
      failed: []
    };
    
    for (const account of needRefresh) {
      try {
        console.log(`刷新: ${account.email} (ID: ${account.id})`);
        
        const refreshResponse = await fetch(
          `${API_BASE}/admin/accounts/${account.id}/refresh`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${ADMIN_KEY}` }
          }
        );
        
        const result = await refreshResponse.json();
        
        if (result.success) {
          console.log(`  ✓ 成功: ${result.message}`);
          results.success.push(account.email);
        } else {
          console.log(`  ✗ 失败: ${result.error}`);
          results.failed.push({ email: account.email, error: result.error });
        }
        
        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`  ✗ 错误: ${error.message}`);
        results.failed.push({ email: account.email, error: error.message });
      }
    }
    
    // 总结
    console.log('\n' + '='.repeat(60));
    console.log('📊 刷新结果统计:');
    console.log(`  ✓ 成功: ${results.success.length}`);
    console.log(`  ✗ 失败: ${results.failed.length}`);
    
    if (results.failed.length > 0) {
      console.log('\n失败的账号:');
      results.failed.forEach(f => {
        console.log(`  - ${f.email}: ${f.error}`);
      });
    }
    
    console.log('\n✅ 批量刷新完成');
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
})();
