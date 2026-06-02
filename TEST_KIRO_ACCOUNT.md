# 🧪 Kiro 账号测试指南

## ✅ 系统测试结果

我已经完成了以下测试：

### 1. ✅ 添加账号 API 测试
- **端点：** `POST /admin/accounts/kiro`
- **状态：** ✅ 正常工作
- **功能：** 成功创建账号并存储到 KV

### 2. ✅ 获取账号列表测试
- **端点：** `GET /admin/accounts`
- **状态：** ✅ 正常工作
- **功能：** 正确返回所有账号信息

### 3. ✅ 删除账号 API 测试
- **端点：** `DELETE /admin/accounts/:id`
- **状态：** ✅ 正常工作
- **功能：** 成功删除账号

### 4. ⚠️ Kiro API 调用测试
- **端点：** `POST /kiro/v1/chat/completions`
- **状态：** ⚠️ 需要真实 Token
- **说明：** 测试 Token 无效，需要使用真实的 OIDC 凭证

---

## 📋 如何添加你的真实 Kiro 账号

### 方法 1：通过 Web 界面添加（推荐）

#### 步骤 1：打开管理后台
访问：https://9cfc812e.ai-api-docs-bim.pages.dev/admin.html

#### 步骤 2：配置设置
1. 点击 **"设置"** 标签
2. 填写：
   - 管理员密钥：`kiro-admin-2024`
   - Worker 地址：`https://ai-api-proxy.2358314123.workers.dev`
3. 点击 **"保存设置"**

#### 步骤 3：添加 Kiro 账号
1. 点击 **"添加 Kiro 账号"** 标签
2. 选择账号类型：
   - **OIDC 账号**（推荐）- 使用 Client ID/Secret
   - **SSO Token** - 使用单点登录 Token

#### 步骤 4：填写 OIDC 信息
如果你有 OIDC 凭证：
- **邮箱**：你的 Kiro 账号邮箱
- **区域**：选择 `us-east-1`（默认）
- **Client ID**：从 Kiro OIDC 获取
- **Client Secret**：从 Kiro OIDC 获取
- **Refresh Token**：从 Kiro OIDC 获取

#### 步骤 5：测试账号
1. 点击 **"账号管理"** 标签
2. 找到你刚添加的账号
3. 点击 **"刷新 Token"** 按钮
4. 查看是否成功刷新

---

### 方法 2：使用批量导入（如果有多个账号）

#### JSON 格式：
```json
[
  {
    "email": "your-email@example.com",
    "region": "us-east-1",
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "refreshToken": "your-refresh-token"
  }
]
```

#### 导入步骤：
1. 打开管理后台
2. 点击 **"添加 Kiro 账号"** 标签
3. 滚动到 **"📦 批量导入 OIDC JSON"**
4. 粘贴 JSON 数据
5. 点击 **"验证 JSON"**
6. 点击 **"批量导入"**

---

## 🔑 如何获取 Kiro OIDC 凭证

### 选项 1：使用 Kiro-account-manager
如果你有 Kiro-account-manager：
1. 打开 Kiro-account-manager
2. 登录你的 Kiro 账号
3. 导出 OIDC JSON 数据
4. 复制 `clientId`、`clientSecret` 和 `refreshToken`

### 选项 2：使用 get-kiro-token.bat
项目中包含一个自动获取 Token 的脚本：

```bash
# 运行脚本
E:\mm\vps\get-kiro-token.bat
```

这个脚本会：
1. 提示你输入 Kiro 账号信息
2. 自动完成 OIDC 认证流程
3. 获取 Client ID、Client Secret 和 Refresh Token
4. 显示可以直接使用的 JSON 格式

### 选项 3：手动获取（高级）
如果你熟悉 OIDC 流程：
1. 访问 Kiro OIDC 认证端点
2. 完成授权流程
3. 获取认证码
4. 交换 Token
5. 保存凭证

---

## 🧪 测试你的账号

### 方法 1：通过管理后台测试

#### 1. 刷新 Token
1. 打开管理后台
2. 点击 **"账号管理"** 标签
3. 找到你的账号
4. 点击 **"刷新 Token"** 按钮
5. 查看状态：
   - ✅ 成功 - 账号可用
   - ❌ 失败 - 检查凭证是否正确

#### 2. 查看统计信息
1. 点击 **"统计信息"** 标签
2. 查看账号使用情况

---

### 方法 2：通过 API 测试

#### 1. 测试聊天补全
```bash
# PowerShell
$headers = @{"Content-Type" = "application/json"}
$body = @{
    model = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    messages = @(@{
        role = "user"
        content = "你好，请回复'测试成功'"
    })
    max_tokens = 100
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://ai-api-proxy.2358314123.workers.dev/kiro/v1/chat/completions" -Method POST -Headers $headers -Body $body
```

#### 2. 测试流式响应
```bash
# PowerShell
$headers = @{"Content-Type" = "application/json"}
$body = @{
    model = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    messages = @(@{
        role = "user"
        content = "写一首关于 AI 的短诗"
    })
    max_tokens = 200
    stream = $true
} | ConvertTo-Json -Depth 10

# 注意：流式响应需要特殊处理
curl -X POST "https://ai-api-proxy.2358314123.workers.dev/kiro/v1/chat/completions" `
  -H "Content-Type: application/json" `
  -d $body
```

#### 3. 检查账号状态
```bash
# PowerShell
$headers = @{Authorization = "Bearer kiro-admin-2024"}
Invoke-RestMethod -Uri "https://ai-api-proxy.2358314123.workers.dev/admin/accounts" -Headers $headers
```

---

## 🔍 常见问题排查

### 问题 1：添加账号后 API 调用失败

**可能原因：**
- ❌ Refresh Token 已过期
- ❌ Client ID 或 Client Secret 错误
- ❌ 账号被禁用或受限

**解决方法：**
1. 在管理后台点击 **"刷新 Token"**
2. 如果刷新失败，检查 OIDC 凭证是否正确
3. 尝试重新获取 OIDC 凭证
4. 删除旧账号，重新添加

### 问题 2：The requested operation is not recognized by the service

**原因：** Access Token 无效或已过期

**解决方法：**
1. 刷新 Token（管理后台或 API）
2. 等待几秒后重试
3. 检查账号是否启用

### 问题 3：账号添加成功但无法使用

**检查清单：**
- [ ] 账号是否已启用（enabled = true）
- [ ] Refresh Token 是否有效
- [ ] Client ID/Secret 是否正确
- [ ] 区域设置是否正确
- [ ] 是否等待 Token 刷新完成

### 问题 4：批量导入部分账号失败

**查看导入报告：**
- 检查 **"失败"** 列表中的错误信息
- 常见错误：
  - `Account already exists` - 邮箱重复
  - `Email is required` - 缺少邮箱字段
  - `缺少 clientId` - OIDC 信息不完整

---

## 📊 测试结果示例

### 成功的响应：
```json
{
  "id": "chatcmpl-xxxxx",
  "object": "chat.completion",
  "created": 1733097600,
  "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "测试成功"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```

### 失败的响应：
```json
{
  "error": {
    "message": "The requested operation is not recognized by the service.",
    "type": "invalid_request_error",
    "code": "invalid_token"
  }
}
```

---

## 💡 最佳实践

### 1. 定期刷新 Token
- ✅ 每天自动刷新一次
- ✅ 失败后立即手动刷新
- ✅ 监控刷新状态

### 2. 使用多个账号
- ✅ 添加 2-3 个账号实现负载均衡
- ✅ 避免单个账号过载
- ✅ 提高服务可用性

### 3. 监控使用情况
- ✅ 定期查看统计信息
- ✅ 关注错误率
- ✅ 及时处理异常账号

### 4. 安全管理凭证
- ✅ 不要分享 Client Secret
- ✅ 定期更换管理员密钥
- ✅ 限制 API 访问来源

---

## 📞 需要帮助？

### 查看文档
- **快速参考：** `QUICK_REFERENCE.md`
- **Kiro 指南：** `KIRO_GUIDE.md`
- **批量导入：** `BATCH_IMPORT_GUIDE.md`

### 在线访问
- **管理后台：** https://9cfc812e.ai-api-docs-bim.pages.dev/admin.html
- **API 文档：** https://9cfc812e.ai-api-docs-bim.pages.dev/docs.html

### 联系方式
- **GitHub：** https://github.com/WHUT666/ai-api-proxy
- **问题反馈：** 直接问我！

---

## ✅ 测试检查清单

在添加真实账号后，请按以下清单测试：

- [ ] **1. 添加账号** - 通过 Web 界面或批量导入
- [ ] **2. 查看账号列表** - 确认账号已添加
- [ ] **3. 刷新 Token** - 点击刷新按钮，确认成功
- [ ] **4. 测试 API 调用** - 发送一个简单的聊天请求
- [ ] **5. 检查响应** - 确认返回正确的 AI 回复
- [ ] **6. 查看统计** - 确认使用次数增加
- [ ] **7. 测试流式响应** - 确认流式输出正常
- [ ] **8. 测试多轮对话** - 确认上下文管理正确

---

## 🎉 下一步

当你成功添加并测试账号后：

1. **添加更多账号** - 实现负载均衡
2. **集成到应用** - 使用 API 网关地址
3. **监控使用情况** - 定期查看统计
4. **优化配置** - 根据需求调整设置

**祝测试顺利！** 🚀
