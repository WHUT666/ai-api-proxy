# 🚀 Kiro 版本升级 - 操作清单

## ✅ 你现在应该看到的窗口

- ✅ **窗口1**: Cloudflare Worker Settings 页面
- ✅ **窗口2**: 记事本打开了 `token_cache.json`（如果找到了）
- ✅ **窗口3**: 浏览器打开了 `admin-kiro.html` 管理界面

---

## 📋 当前进度检查

### 已完成的步骤：
- [ ] 步骤1: 创建了 ACCOUNTS 和 STATS 两个 KV 命名空间
- [ ] 步骤2: 更新了 Worker 代码为 worker-kiro.js 并部署
- [ ] 步骤3: 绑定了 KV 并设置了 ADMIN_KEY 环境变量

### 待完成的步骤：
- [ ] 步骤4: 获取 Kiro Token
- [ ] 步骤5: 配置管理界面
- [ ] 步骤6: 添加第一个 Kiro 账号
- [ ] 步骤7: 测试 Kiro API

---

## 📝 步骤 4：获取 Kiro Token

### 情况 A：找到了 token_cache.json 文件 ✅

如果记事本已打开文件：

1. 在文件中查找 `"accessToken":`
2. 复制引号内的值（类似：`eyJraWQiOiJ...` 很长的字符串）
3. **保存这个 Token**，稍后要用

**示例：**
```json
{
  "accessToken": "eyJraWQiOiJhYmMxMjM...",  ← 复制这个值
  "expiresAt": "2024-06-03T10:00:00.000Z"
}
```

### 情况 B：没找到文件 ❌

**手动查找：**

**对于 VS Code：**
```
路径：%APPDATA%\Code\User\globalStorage\amazon.q-for-vscode\sso\token_cache.json
完整路径：C:\Users\你的用户名\AppData\Roaming\Code\User\globalStorage\amazon.q-for-vscode\sso\token_cache.json
```

**对于 Cursor：**
```
路径：%APPDATA%\Cursor\User\globalStorage\amazon.q-for-vscode\sso\token_cache.json
完整路径：C:\Users\你的用户名\AppData\Roaming\Cursor\User\globalStorage\amazon.q-for-vscode\sso\token_cache.json
```

**如果还是找不到：**

1. 打开 VS Code 或 Cursor
2. 确认已安装 **Amazon Q** 插件
3. 确认已登录 Amazon Q 账号
4. 重新运行：`get-kiro-token.bat`

---

## 📝 步骤 5：配置管理界面

在打开的 `admin-kiro.html` 页面中：

### 5.1 打开设置

1. 点击顶部的 **设置** 标签
2. 填写以下信息：

**管理员密钥：**
```
kiro-admin-2024
```
（或你在步骤3设置的密码）

**Worker 地址：**
```
https://ai-api-proxy.2358314123.workers.dev
```

3. 点击 **保存设置** 按钮
4. 看到 "✅ 设置已保存" 提示

### 5.2 测试连接

1. 点击 **仪表盘** 标签
2. 如果配置正确，应该显示：
   - 总请求数: 0
   - 成功率: 0%
   - 账号数量: 0

**如果显示错误：**
- 检查 ADMIN_KEY 是否正确
- 检查 Worker 地址是否正确
- 确认 Worker 已部署成功

---

## 📝 步骤 6：添加第一个 Kiro 账号

### 6.1 准备信息

你需要：
- ✅ Kiro Token（步骤4获取的）
- ✅ 邮箱地址（你的账号邮箱）
- ✅ AWS 区域（建议：us-east-1）

### 6.2 添加账号

1. 点击 **添加 Kiro 账号** 标签
2. 填写表单：

**邮箱：**
```
your-email@example.com
```
（填你的真实邮箱）

**AWS 区域：**
```
us-east-1
```
（下拉选择，推荐 us-east-1）

**认证类型：**
```
SSO Token
```
（选择这个最简单）

**SSO Token：**
```
eyJraWQiOiJ...
```
（粘贴步骤4复制的 Token）

3. 点击 **添加账号** 按钮
4. 看到 "✅ Kiro 账号添加成功" 提示

### 6.3 验证账号

1. 点击 **账号管理** 标签
2. 应该看到刚添加的账号：
   - 服务：Kiro
   - 邮箱：your-email@example.com
   - 状态：启用 ✅
   - 区域：us-east-1

---

## 📝 步骤 7：测试 Kiro API

### 7.1 通过管理界面测试

1. 在 **账号管理** 标签
2. 找到你的 Kiro 账号
3. 点击 **测试** 按钮
4. 应该返回成功响应

### 7.2 通过 API 测试

打开命令行测试：

**测试 1：健康检查**
```bash
curl https://ai-api-proxy.2358314123.workers.dev/health
```

应该返回：
```json
{
  "status": "ok",
  "timestamp": "2024-06-02T..."
}
```

**测试 2：Kiro API**
```bash
curl https://ai-api-proxy.2358314123.workers.dev/kiro/api/v1/streaming-conversations \
  -H "Content-Type: application/json" \
  -d "{\"conversationState\":{\"currentMessage\":{\"userInputMessage\":{\"content\":\"Write hello world in Python\"}},\"chatTriggerType\":\"MANUAL\"}}"
```

应该返回 Kiro 的回复（Python 代码示例）

---

## 🎉 升级完成检查清单

完成后，你应该：

- ✅ Worker 已更新为 Kiro 版本
- ✅ KV 命名空间已创建并绑定
- ✅ 管理员密钥已设置
- ✅ 至少添加了一个 Kiro 账号
- ✅ 管理界面可以正常访问
- ✅ API 测试通过

---

## 🔧 故障排查

### 问题 1：管理界面无法连接
**原因：** ADMIN_KEY 或 Worker 地址错误

**解决：**
1. 检查 Cloudflare Settings → Environment Variables
2. 确认 ADMIN_KEY 值正确
3. 确认 Worker 地址无误

### 问题 2：添加账号失败
**原因：** Token 格式错误或已过期

**解决：**
1. 重新获取 Token（运行 get-kiro-token.bat）
2. 确保复制完整的 Token（包括 eyJ 开头）
3. 确认 Token 未过期

### 问题 3：API 调用失败
**原因：** 账号未启用或 Token 无效

**解决：**
1. 在管理界面检查账号状态
2. 点击 "刷新Token" 按钮
3. 或重新添加账号

### 问题 4：KV 绑定失败
**原因：** Variable name 不匹配

**解决：**
1. 确认 Variable name 必须是：`ACCOUNTS` 和 `STATS`（大写）
2. 删除错误的绑定，重新添加
3. 保存并重新部署

---

## 📞 需要帮助？

### 查看详细文档
- `KIRO_COMPLETE.md` - 完整指南
- `KIRO_GUIDE.md` - 详细说明
- `QUICK_REFERENCE.md` - 快速参考

### 常见问题
参考文档中的 FAQ 部分

### 提交问题
GitHub Issues: https://github.com/WHUT666/ai-api-proxy/issues

---

## 🎯 下一步建议

升级完成后，你可以：

1. **添加更多账号**
   - 添加多个 Kiro 账号实现负载均衡
   - 添加 OpenAI/Claude/Gemini 账号

2. **监控使用情况**
   - 定期查看仪表盘
   - 监控配额使用

3. **集成到项目**
   - 将你的代码指向新的代理地址
   - 享受完整功能

---

**完成每个步骤后，勾选对应的复选框 ✅**

祝升级顺利！🚀
