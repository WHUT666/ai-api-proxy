# 🚀 AI API 代理 - 快速参考卡

## 📍 你的服务信息

**服务地址：** `https://ai-api-proxy.2358314123.workers.dev`  
**GitHub 仓库：** `https://github.com/WHUT666/ai-api-proxy`  
**当前版本：** v1.0.0 基础版（已运行）  
**状态：** 🟢 运行中

---

## ⚡ 快速测试

### 健康检查
```bash
curl https://ai-api-proxy.2358314123.workers.dev/health
```

### OpenAI 测试
```bash
curl https://ai-api-proxy.2358314123.workers.dev/v1/chat/completions \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"hi"}]}'
```

### Anthropic 测试
```bash
curl https://ai-api-proxy.2358314123.workers.dev/anthropic/v1/messages \
  -H "x-api-key: YOUR_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-haiku-20240307","max_tokens":100,"messages":[{"role":"user","content":"hi"}]}'
```

---

## 🎯 升级到 Kiro 版本

### 为什么要升级？

✅ 支持 **Kiro (Amazon Q)** - 免费使用 AWS AI 服务  
✅ **多账号管理** - 添加多个账号自动轮询  
✅ **Token 自动刷新** - OIDC 账号永久有效  
✅ **Web 管理界面** - 可视化管理账号和统计  
✅ **负载均衡** - 自动选择最优账号  
✅ **使用统计** - 跟踪配额和成功率  

### 升级步骤（10分钟）

#### 1️⃣ 创建 KV 存储

访问：https://dash.cloudflare.com/kv

创建 2 个命名空间：
- `ACCOUNTS` - 存储账号信息
- `STATS` - 存储使用统计

记录它们的 **ID**（类似：`a1b2c3d4e5f6...`）

#### 2️⃣ 更新 Worker 代码

1. 访问：https://dash.cloudflare.com → Workers & Pages
2. 点击你的 Worker：`ai-api-proxy`
3. 点击 **Edit code**
4. 删除所有代码
5. 打开本地文件：`E:\mm\vps\worker-kiro.js`
6. 全选复制，粘贴到编辑器
7. 点击 **Save and Deploy**

#### 3️⃣ 绑定 KV 和设置密钥

1. 点击 **Settings** → **Variables**
2. 找到 **KV Namespace Bindings** 部分
3. 点击 **Add binding**：
   - Variable name: `ACCOUNTS`
   - KV namespace: 选择你创建的 ACCOUNTS
4. 再次点击 **Add binding**：
   - Variable name: `STATS`
   - KV namespace: 选择你创建的 STATS
5. 找到 **Environment Variables** 部分
6. 点击 **Add variable**：
   - Variable name: `ADMIN_KEY`
   - Value: `your-secure-password`（自己设置一个强密码）
7. 点击 **Save and deploy**

#### 4️⃣ 打开管理界面

方式 A：本地打开
```bash
# 在浏览器中打开
start E:\mm\vps\admin-kiro.html
```

方式 B：访问在线版（需要先集成到 Worker）

#### 5️⃣ 配置管理界面

1. 点击 **设置** 标签
2. 填写：
   - **管理员密钥**：你刚才设置的 `ADMIN_KEY`
   - **Worker 地址**：`https://ai-api-proxy.2358314123.workers.dev`
3. 点击 **保存设置**

#### 6️⃣ 添加 Kiro 账号

1. 点击 **添加 Kiro 账号** 标签
2. 获取 Kiro Token：
   - **Windows:** 打开 `%APPDATA%\Code\User\globalStorage\amazon.q-for-vscode\sso\token_cache.json`
   - **macOS:** 打开 `~/Library/Application Support/Code/User/globalStorage/amazon.q-for-vscode/sso/token_cache.json`
   - 复制文件中的 `accessToken` 值
3. 在管理界面填写：
   - 邮箱：你的账号邮箱
   - AWS 区域：选择 us-east-1
   - SSO Token：粘贴刚才复制的 token
4. 点击 **添加账号**

#### 7️⃣ 测试 Kiro API

```bash
curl https://ai-api-proxy.2358314123.workers.dev/kiro/api/v1/streaming-conversations \
  -H "Content-Type: application/json" \
  -d '{
    "conversationState": {
      "currentMessage": {
        "userInputMessage": {
          "content": "Write a hello world in Python"
        }
      },
      "chatTriggerType": "MANUAL"
    }
  }'
```

✅ **升级完成！**

---

## 📚 文档索引

### 入门指南
- `CLOUDFLARE_GUIDE.md` - Cloudflare Workers 部署指南
- `USAGE_GUIDE.md` - 当前服务使用说明
- `KIRO_COMPLETE.md` - Kiro 快速开始（推荐）

### 详细文档
- `KIRO_GUIDE.md` - Kiro 完整使用指南
- `ENHANCED_GUIDE.md` - 增强版功能说明
- `DEPLOYMENT_GUIDE.md` - Docker 部署指南

### 参考信息
- `PROJECT_SUMMARY.md` - 项目总结
- `FINAL_REPORT.md` - 最终报告
- `README.md` - 项目主页

---

## 🎯 常用操作

### 查看 Worker 日志
1. https://dash.cloudflare.com
2. 选择你的 Worker
3. 点击 **Logs** 标签
4. 点击 **Begin log stream**

### 查看使用统计
1. 打开管理界面
2. 点击 **仪表盘** 标签
3. 查看总请求数、成功率等

### 刷新账号 Token
1. 打开管理界面
2. 点击 **账号管理** 标签
3. 找到对应账号
4. 点击 **刷新Token** 按钮

### 添加新账号
1. 打开管理界面
2. 点击 **添加账号** 标签
3. 选择服务类型（OpenAI/Anthropic/Gemini/Kiro）
4. 填写相关信息
5. 点击 **添加账号**

---

## 🔧 故障排查

### Worker 返回 503
**原因：** 没有可用账号  
**解决：** 添加至少一个账号并确保启用

### Token 过期/无效
**原因：** Token 已过期或格式错误  
**解决：** 
- Kiro: 从 IDE 配置文件重新获取
- 其他: 检查 API Key 是否正确

### 管理界面无法连接
**原因：** 密钥或地址错误  
**解决：**
- 检查 ADMIN_KEY 是否匹配
- 确认 Worker 地址正确
- 检查浏览器控制台错误

---

## 🌟 最佳实践

### 1. 安全
- ✅ 使用强密码作为 ADMIN_KEY
- ✅ 定期更换密钥
- ✅ 不要泄露 Token 和 API Key
- ✅ 限制管理界面访问

### 2. 性能
- ✅ 添加多个账号分散负载
- ✅ 选择最近的 AWS 区域
- ✅ 使用 OIDC 认证避免频繁手动更新

### 3. 监控
- ✅ 定期查看使用统计
- ✅ 关注配额使用情况
- ✅ 监控账号状态
- ✅ 检查 Worker 日志

---

## 📞 获取帮助

### 问题反馈
- GitHub Issues: https://github.com/WHUT666/ai-api-proxy/issues
- 查看文档 FAQ 部分

### 相关链接
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Kiro-account-manager](https://github.com/chaogei/Kiro-account-manager)
- [OpenAI API 文档](https://platform.openai.com/docs)
- [Anthropic API 文档](https://docs.anthropic.com/)

---

## ✅ 检查清单

### 基础版（当前）
- [x] Worker 已部署
- [x] 服务正常运行
- [x] 可以访问健康检查端点
- [x] API 代理功能正常

### 升级 Kiro 版
- [ ] 创建 KV 命名空间
- [ ] 更新 Worker 代码
- [ ] 绑定 KV 和设置密钥
- [ ] 配置管理界面
- [ ] 添加 Kiro 账号
- [ ] 测试 Kiro API

---

**保存这个文件作为快速参考！** 📋

需要帮助？查看详细文档或提 Issue！🚀
