# 🚀 在 OpenCode 中使用 Kiro API 代理

## 📋 概述

本指南将帮助你在 OpenCode 中配置和使用 Kiro API 代理服务，让 OpenCode 通过我们的免费代理访问 Amazon Q (Kiro) AI 服务。

---

## ⚙️ 配置方法

### 方法 1: 使用 OpenAI 兼容模式（推荐）

OpenCode 支持配置自定义 OpenAI API 端点，我们的服务完全兼容 OpenAI 格式。

#### 步骤 1: 打开 OpenCode 设置

按 `Ctrl+,` (Windows/Linux) 或 `Cmd+,` (Mac) 打开设置

#### 步骤 2: 配置 API 设置

在设置中找到或创建 `.opencode/opencode.json` 文件，添加以下配置：

```json
{
  "apiProvider": "openai",
  "apiKey": "dummy-key",
  "apiBaseUrl": "https://ai-api-proxy.2358314123.workers.dev/kiro/v1",
  "model": "gpt-4",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

#### 步骤 3: 保存并重启

保存配置文件，OpenCode 会自动应用新配置。

---

### 方法 2: 使用环境变量

如果你偏好使用环境变量，可以设置：

#### Windows (PowerShell)
```powershell
$env:OPENAI_API_KEY = "dummy-key"
$env:OPENAI_API_BASE = "https://ai-api-proxy.2358314123.workers.dev/kiro/v1"
```

#### Linux/Mac (Bash/Zsh)
```bash
export OPENAI_API_KEY="dummy-key"
export OPENAI_API_BASE="https://ai-api-proxy.2358314123.workers.dev/kiro/v1"
```

然后启动 OpenCode：
```bash
opencode
```

---

### 方法 3: 直接修改配置文件

#### OpenCode 配置文件位置

**Windows**:
```
%USERPROFILE%\.config\opencode\config.json
或
C:\Users\<你的用户名>\.config\opencode\config.json
```

**Linux/Mac**:
```
~/.config/opencode/config.json
```

#### 配置内容

在配置文件中添加或修改：

```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "dummy-key",
    "baseURL": "https://ai-api-proxy.2358314123.workers.dev/kiro/v1",
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 4096,
    "timeout": 30000
  }
}
```

---

## 🎯 支持的模型

你可以在配置中使用以下任意模型名称，它们都会映射到 Kiro 的 Claude Sonnet 4.5：

### OpenAI 系列
```json
"model": "gpt-4"
"model": "gpt-4o"
"model": "gpt-4-turbo"
"model": "gpt-3.5-turbo"
```

### Claude 系列
```json
"model": "claude-3-5-sonnet"
"model": "claude-3-opus"
"model": "claude-sonnet-4.5"
```

### Anthropic Bedrock 格式
```json
"model": "anthropic.claude-3-5-sonnet-20241022-v2:0"
```

**建议**: 使用 `gpt-4` 或 `claude-3-5-sonnet`

---

## 📝 完整配置示例

### 基础配置
```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "dummy-key",
    "baseURL": "https://ai-api-proxy.2358314123.workers.dev/kiro/v1",
    "model": "gpt-4"
  }
}
```

### 进阶配置
```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "dummy-key",
    "baseURL": "https://ai-api-proxy.2358314123.workers.dev/kiro/v1",
    "model": "claude-3-5-sonnet",
    "temperature": 0.7,
    "maxTokens": 4096,
    "timeout": 60000,
    "stream": true,
    "requestsPerMinute": 30
  },
  "editor": {
    "autoSave": true,
    "formatOnSave": true
  }
}
```

### 多配置文件（项目级）

在项目根目录创建 `.opencode/opencode.json`：

```json
{
  "apiProvider": "openai",
  "apiKey": "dummy-key",
  "apiBaseUrl": "https://ai-api-proxy.2358314123.workers.dev/kiro/v1",
  "model": "gpt-4",
  "systemPrompt": "You are an expert software engineer helping with this project.",
  "codeStyle": {
    "language": "javascript",
    "framework": "react",
    "testingLibrary": "jest"
  }
}
```

---

## 🧪 测试配置

### 方法 1: 使用 OpenCode 命令

在 OpenCode 中打开命令面板 (`Ctrl+Shift+P` 或 `Cmd+Shift+P`)，输入：

```
> Test AI Connection
```

### 方法 2: 发送测试消息

在 OpenCode 的聊天面板中输入：

```
Hello, can you help me?
```

**预期响应**:
```
Hey! I'm Kiro—ready to help you build, debug, or solve whatever you're working on.
```

### 方法 3: 使用诊断工具

访问我们的诊断工具检查配置：

```
https://44820133.ai-api-docs-bim.pages.dev/diagnostic.html
```

---

## 🔧 故障排查

### 问题 1: 连接超时

**症状**: 请求超时，没有响应

**解决方案**:
```json
{
  "ai": {
    "timeout": 60000,  // 增加到 60 秒
    "retries": 3
  }
}
```

### 问题 2: API Key 错误

**症状**: 提示 "Invalid API Key"

**原因**: OpenCode 可能需要一个有效格式的 API Key

**解决方案**: 使用以下任意一个：
```json
"apiKey": "sk-dummy-key-for-opencode"
"apiKey": "dummy-key"
"apiKey": "any-non-empty-string"
```

### 问题 3: 返回空响应

**症状**: 请求成功但内容为空

**解决方案**:
1. 检查账号状态：访问管理后台
   ```
   https://8b08f538.ai-api-docs-bim.pages.dev/admin.html
   ```

2. 刷新账号 Token：
   - 在管理后台找到账号
   - 点击"刷新 Token"按钮

3. 重新测试连接

### 问题 4: 模型不支持

**症状**: 提示模型不存在

**解决方案**: 使用支持的模型名称
```json
"model": "gpt-4"          // ✅ 支持
"model": "claude-3-5-sonnet"  // ✅ 支持
"model": "gpt-4o"         // ✅ 支持
"model": "some-other-model"   // ❌ 不支持
```

---

## 💡 使用技巧

### 1. 项目级配置

为不同项目使用不同配置：

```
my-project/
├── .opencode/
│   └── opencode.json    # 项目特定配置
├── src/
└── package.json
```

### 2. 系统提示优化

根据项目类型自定义系统提示：

```json
{
  "systemPrompt": "You are an expert Python developer specializing in Django web applications. Always follow PEP 8 style guidelines and write comprehensive docstrings."
}
```

### 3. 温度调节

- **创意任务** (文档编写、命名建议): `temperature: 0.8-1.0`
- **代码生成**: `temperature: 0.5-0.7`
- **Bug 修复**: `temperature: 0.2-0.5`

```json
{
  "temperature": 0.7  // 平衡创意和准确性
}
```

### 4. Token 限制

根据任务复杂度调整：

```json
{
  "maxTokens": 2048,   // 简单查询
  "maxTokens": 4096,   // 中等复杂度
  "maxTokens": 8192    // 复杂代码生成
}
```

---

## 🎨 高级配置

### 配置多个 AI 提供商

```json
{
  "ai": {
    "providers": {
      "kiro": {
        "provider": "openai",
        "apiKey": "dummy-key",
        "baseURL": "https://ai-api-proxy.2358314123.workers.dev/kiro/v1",
        "model": "gpt-4",
        "enabled": true
      },
      "openai": {
        "provider": "openai",
        "apiKey": "your-real-openai-key",
        "model": "gpt-4",
        "enabled": false
      }
    },
    "defaultProvider": "kiro"
  }
}
```

### 自定义请求头

如果需要添加自定义请求头：

```json
{
  "ai": {
    "headers": {
      "User-Agent": "OpenCode/1.0",
      "X-Custom-Header": "value"
    }
  }
}
```

### 代理设置

如果你需要通过代理访问：

```json
{
  "ai": {
    "proxy": "http://proxy.example.com:8080",
    "proxyAuth": {
      "username": "user",
      "password": "pass"
    }
  }
}
```

---

## 📊 使用监控

### 查看使用统计

访问管理后台查看 API 使用情况：

```
https://8b08f538.ai-api-docs-bim.pages.dev/admin.html
```

**可查看**:
- 请求总数
- 成功/失败率
- 账号使用情况
- Token 过期状态

### 账号管理

在管理后台可以：
- ✅ 查看所有账号
- ✅ 刷新 Token
- ✅ 添加新账号
- ✅ 删除失效账号
- ✅ 批量导入账号

---

## 🛡️ 安全建议

### 1. 不要分享配置文件

将配置文件添加到 `.gitignore`：

```
.opencode/
.config/opencode/
*.json
```

### 2. 使用环境变量

对于团队项目，使用环境变量而不是硬编码：

```json
{
  "apiKey": "${OPENCODE_API_KEY}",
  "baseURL": "${OPENCODE_API_BASE}"
}
```

### 3. 定期检查账号状态

每周检查一次账号是否正常：
- 访问管理后台
- 查看账号状态
- 刷新即将过期的 Token

---

## 📚 参考资源

### 官方文档
- [OpenCode 文档](https://opencode.ai/docs)
- [项目 GitHub](https://github.com/WHUT666/ai-api-proxy)
- [API 使用指南](USER_GUIDE.md)

### 工具链接
- **API 端点**: https://ai-api-proxy.2358314123.workers.dev/kiro/v1
- **管理后台**: https://8b08f538.ai-api-docs-bim.pages.dev/admin.html
- **诊断工具**: https://44820133.ai-api-docs-bim.pages.dev/diagnostic.html
- **健康检查**: https://ai-api-proxy.2358314123.workers.dev/health

### 支持渠道
- 📖 [完整文档](https://github.com/WHUT666/ai-api-proxy)
- 🐛 [问题反馈](https://github.com/WHUT666/ai-api-proxy/issues)
- 💬 [讨论区](https://github.com/WHUT666/ai-api-proxy/discussions)

---

## ✅ 快速开始检查清单

- [ ] 找到 OpenCode 配置文件位置
- [ ] 添加 API 端点配置
- [ ] 设置 API Key (任意非空字符串)
- [ ] 选择模型 (推荐 `gpt-4`)
- [ ] 保存配置文件
- [ ] 重启 OpenCode
- [ ] 发送测试消息
- [ ] 验证响应内容
- [ ] 调整温度和 Token 参数
- [ ] 享受免费的 AI 辅助编程！

---

## 🎉 开始使用

现在你已经准备好在 OpenCode 中使用 Kiro API 代理了！

**最简配置**:
```json
{
  "apiProvider": "openai",
  "apiKey": "dummy-key",
  "apiBaseUrl": "https://ai-api-proxy.2358314123.workers.dev/kiro/v1",
  "model": "gpt-4"
}
```

保存后立即开始使用！🚀

---

**文档版本**: v2.0.1  
**最后更新**: 2026-06-03  
**维护状态**: ✅ 活跃维护中
