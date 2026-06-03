# 📖 OpenCode 快速配置指南

## 🚀 3 步完成配置

### 步骤 1: 创建配置文件

在你的项目根目录创建 `.opencode/opencode.json`：

```json
{
  "apiProvider": "openai",
  "apiKey": "dummy-key",
  "apiBaseUrl": "https://ai-api-proxy.2358314123.workers.dev/kiro/v1",
  "model": "gpt-4"
}
```

### 步骤 2: 测试连接

在 OpenCode 聊天框输入：

```
Hello, are you working?
```

### 步骤 3: 开始编码

现在你可以：
- ✅ 让 AI 帮你写代码
- ✅ 解释复杂的代码逻辑
- ✅ 修复 Bug
- ✅ 重构代码
- ✅ 编写文档

---

## 🎯 常用命令示例

### 代码生成
```
Write a Python function to calculate fibonacci numbers
```

### Bug 修复
```
This code has a bug, can you fix it?
[粘贴你的代码]
```

### 代码解释
```
Explain what this function does:
[粘贴代码]
```

### 重构建议
```
How can I improve this code?
[粘贴代码]
```

---

## 📝 配置文件位置

### Windows
```
C:\Users\<你的用户名>\.config\opencode\config.json
```

### Linux/Mac
```
~/.config/opencode/config.json
```

### 项目级（推荐）
```
你的项目/.opencode/opencode.json
```

---

## 🔧 故障排查

### 问题：无法连接

**解决方案 1**: 检查网络连接
```bash
curl https://ai-api-proxy.2358314123.workers.dev/health
```

**解决方案 2**: 增加超时时间
```json
{
  "timeout": 60000
}
```

### 问题：返回空响应

**解决方案**: 刷新账号 Token
1. 访问：https://8b08f538.ai-api-docs-bim.pages.dev/admin.html
2. 找到账号，点击"刷新 Token"
3. 重新尝试

---

## 💡 推荐配置

### 适合编程任务
```json
{
  "apiProvider": "openai",
  "apiKey": "dummy-key",
  "apiBaseUrl": "https://ai-api-proxy.2358314123.workers.dev/kiro/v1",
  "model": "gpt-4",
  "temperature": 0.5,
  "maxTokens": 4096
}
```

### 适合创意任务
```json
{
  "apiProvider": "openai",
  "apiKey": "dummy-key",
  "apiBaseUrl": "https://ai-api-proxy.2358314123.workers.dev/kiro/v1",
  "model": "claude-3-5-sonnet",
  "temperature": 0.8,
  "maxTokens": 4096
}
```

---

## 🎉 完成！

你现在可以在 OpenCode 中免费使用 AI 助手了！

**需要帮助？**
- 📖 [完整指南](OPENCODE_INTEGRATION_GUIDE.md)
- 🐛 [问题反馈](https://github.com/WHUT666/ai-api-proxy/issues)
- 🔧 [诊断工具](https://44820133.ai-api-docs-bim.pages.dev/diagnostic.html)

---

**提示**: 建议将 `.opencode/` 添加到 `.gitignore` 避免提交配置文件！
