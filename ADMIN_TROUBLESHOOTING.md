# 🔧 管理界面"加载失败"问题排查指南

## 📸 当前状态
你看到的错误信息：
```
Kiro 账号列表
加载失败，请检查设置
```

## ✅ 快速解决步骤

### 步骤 1：配置管理员设置

#### 1. 点击 "设置" 标签（右侧第4个按钮）

#### 2. 填写以下信息：
```
管理员密钥：kiro-admin-2024
Worker 地址：https://ai-api-proxy.2358314123.workers.dev
```

#### 3. 点击 "保存设置" 按钮

---

### 步骤 2：刷新页面

按 `Ctrl + Shift + R` 强制刷新页面（清除缓存）

或者直接访问新部署的地址：
```
https://13733a80.ai-api-docs-bim.pages.dev/admin.html
```

---

### 步骤 3：返回账号管理

点击 "账号管理" 标签，应该能看到 20 个 Kiro 账号了！

---

## 🔍 详细配置说明

### 配置项说明

#### 管理员密钥（必填）
```
kiro-admin-2024
```
- 这是访问管理 API 的认证密钥
- 必须与 Worker 环境变量 `ADMIN_KEY` 一致
- 用于所有管理操作（添加、删除、刷新账号）

#### Worker 地址（必填）
```
https://ai-api-proxy.2358314123.workers.dev
```
- 这是你的 Cloudflare Worker 的地址
- 所有 API 请求都会发送到这个地址
- 确保没有多余的空格或斜杠

---

## 📋 配置检查清单

在设置页面检查：

- [ ] **管理员密钥** 输入框不为空
- [ ] **管理员密钥** 正确拼写为 `kiro-admin-2024`（没有空格）
- [ ] **Worker 地址** 输入框不为空
- [ ] **Worker 地址** 以 `https://` 开头
- [ ] **Worker 地址** 末尾没有多余的 `/`
- [ ] 点击了 **"保存设置"** 按钮
- [ ] 看到绿色的成功提示

---

## 🧪 验证配置

### 方法 1：在浏览器中测试

打开浏览器开发者工具（按 F12）：

1. 点击 **"控制台"** 标签
2. 粘贴以下代码并按回车：

```javascript
// 测试管理员密钥和 Worker 地址
const adminKey = localStorage.getItem('adminKey');
const workerUrl = localStorage.getItem('workerUrl');

console.log('管理员密钥:', adminKey);
console.log('Worker 地址:', workerUrl);

if (!adminKey || !workerUrl) {
    console.error('❌ 配置缺失！请先配置设置');
} else {
    console.log('✅ 配置已保存');
    
    // 测试 API 连接
    fetch(workerUrl + '/admin/accounts', {
        headers: {
            'Authorization': 'Bearer ' + adminKey,
            'Content-Type': 'application/json'
        }
    })
    .then(res => res.json())
    .then(data => {
        console.log('✅ API 测试成功！');
        console.log('账号数量:', data.accounts ? data.accounts.length : 0);
        console.log('账号列表:', data.accounts);
    })
    .catch(err => {
        console.error('❌ API 测试失败:', err);
    });
}
```

### 方法 2：使用 PowerShell 测试

```powershell
# 测试 Worker 是否可访问
$headers = @{
    Authorization = "Bearer kiro-admin-2024"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod `
        -Uri "https://ai-api-proxy.2358314123.workers.dev/admin/accounts" `
        -Method GET `
        -Headers $headers
    
    Write-Output "✅ Worker 正常运行！"
    Write-Output "账号数量: $($response.accounts.Count)"
    Write-Output "`n前3个账号:"
    $response.accounts | Select-Object -First 3 | Format-Table email, id, enabled
} catch {
    Write-Output "❌ 连接失败: $($_.Exception.Message)"
}
```

---

## ⚠️ 常见问题

### 问题 1：保存设置后仍然"加载失败"

**可能原因：**
- 浏览器缓存了旧的页面
- 设置保存到了旧的域名

**解决方法：**
1. 清除浏览器缓存
2. 使用无痕模式打开
3. 访问新的部署地址：`https://13733a80.ai-api-docs-bim.pages.dev/admin.html`

### 问题 2：设置保存成功但仍然无法加载

**检查项：**
1. 打开开发者工具（F12）
2. 切换到"网络"标签
3. 点击"账号管理"标签
4. 查看失败的请求

**常见错误：**

#### A. 401 Unauthorized
```
原因：管理员密钥错误
解决：确认密钥是 kiro-admin-2024（注意大小写）
```

#### B. 404 Not Found
```
原因：Worker 地址错误
解决：确认地址是 https://ai-api-proxy.2358314123.workers.dev
```

#### C. CORS 错误
```
原因：Worker 的 CORS 配置问题
解决：Worker 代码已包含 CORS 支持，重新部署 Worker
```

### 问题 3：显示"请先配置设置"

**原因：** localStorage 中没有保存配置

**解决方法：**
1. 点击"设置"标签
2. 重新填写并保存
3. 确认看到绿色成功提示

---

## 🎯 完整操作流程

### 首次使用配置

#### 1️⃣ 打开管理后台
```
https://13733a80.ai-api-docs-bim.pages.dev/admin.html
```

#### 2️⃣ 点击"设置"标签

#### 3️⃣ 填写配置
- 管理员密钥：`kiro-admin-2024`
- Worker 地址：`https://ai-api-proxy.2358314123.workers.dev`

#### 4️⃣ 点击"保存设置"
应该看到绿色提示：✅ 设置已保存

#### 5️⃣ 点击"账号管理"标签
应该看到 20 个 Kiro 账号

#### 6️⃣ 验证账号显示
每个账号应该显示：
- 📧 Email 地址
- 🆔 账号 ID
- 🌍 区域（us-east-1）
- ✅ 启用状态
- 🔘 刷新 Token 按钮
- 🗑️ 删除按钮

---

## 📸 正确配置后的效果

### 设置页面
```
✅ 管理员密钥：kiro-admin-2024
✅ Worker 地址：https://ai-api-proxy.2358314123.workers.dev
✅ [保存设置] 按钮
```

### 账号管理页面
```
📋 Kiro 账号列表

┌─────────────────────────────────────┐
│ charles.riverberg92696@zeppost.com  │
│ Kiro (Amazon Q)                     │
│ 区域：us-east-1                      │
│ ID：0ec0a5fe-6f8a-4c01-ba6d...      │
│ 本月使用：0 / 100,000 (0.0%)        │
│ [刷新Token] [删除]                   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ willie.williams123532@zeppost.com   │
│ Kiro (Amazon Q)                     │
│ 区域：us-east-1                      │
│ ID：18b7be0e-a3bd-4628-86c9...      │
│ 本月使用：0 / 100,000 (0.0%)        │
│ [刷新Token] [删除]                   │
└─────────────────────────────────────┘

... 共 20 个账号 ...
```

---

## 🔧 如果还是不行

### 最后的排查步骤

#### 1. 检查 Worker 状态
```powershell
# 测试 Worker 健康状态
Invoke-RestMethod -Uri "https://ai-api-proxy.2358314123.workers.dev/health"
```

预期输出：
```json
{
  "status": "ok",
  "timestamp": 1780396314828
}
```

#### 2. 查看浏览器控制台
1. 按 F12 打开开发者工具
2. 点击"控制台"标签
3. 查找红色的错误信息
4. 截图发给我

#### 3. 查看网络请求
1. 按 F12 打开开发者工具
2. 点击"网络"标签
3. 点击"账号管理"标签触发请求
4. 查看失败的请求
5. 点击查看请求详情
6. 截图发给我

#### 4. 导出设置信息
在控制台运行：
```javascript
console.log({
    adminKey: localStorage.getItem('adminKey'),
    workerUrl: localStorage.getItem('workerUrl')
});
```

---

## 💡 快速重置方法

如果配置混乱，可以重置所有设置：

### 方法 1：清除 localStorage
在浏览器控制台运行：
```javascript
localStorage.clear();
console.log('✅ 已清除所有设置');
```

然后刷新页面，重新配置。

### 方法 2：使用无痕模式
1. 打开无痕/隐私浏览模式
2. 访问管理后台
3. 全新配置

---

## 🎉 成功标志

配置成功后，你应该能看到：

✅ 设置页面显示已保存的配置  
✅ 账号管理显示 20 个 Kiro 账号  
✅ 每个账号有详细信息  
✅ 可以点击"刷新Token"按钮  
✅ 统计信息页面显示数据  

---

## 📚 相关文档

- **修复说明：** ADMIN_FIX_COMPLETE.md
- **测试报告：** BATCH_IMPORT_TEST_SUCCESS.md
- **使用指南：** BATCH_IMPORT_GUIDE.md
- **快速参考：** QUICK_REFERENCE.md

---

## 🆘 还需要帮助？

如果按照上述步骤操作后仍然有问题：

1. 截图当前页面
2. 打开浏览器控制台（F12）
3. 截图控制台的错误信息
4. 截图网络请求的详情
5. 告诉我具体的错误信息

我会帮你进一步诊断！💪
