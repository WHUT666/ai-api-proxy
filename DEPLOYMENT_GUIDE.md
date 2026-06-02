## 🚀 完整部署指南

### 步骤 1: 创建 GitHub 仓库

1. 访问 https://github.com/new
2. 填写仓库信息：
   - Repository name: `ai-api-proxy` (或你喜欢的名称)
   - Description: `AI API reverse proxy for OpenAI, Anthropic, and Google Gemini`
   - 选择 **Public** 或 **Private**
   - ❌ 不要勾选 "Add a README file"
   - ❌ 不要添加 .gitignore
   - ❌ 不要选择 license
3. 点击 **Create repository**

### 步骤 2: 推送代码到 GitHub

复制 GitHub 页面显示的命令，或直接运行：

```bash
# 添加远程仓库（替换为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/ai-api-proxy.git

# 推送代码
git branch -M master
git push -u origin master
```

### 步骤 3: 部署到 Render（推荐）

#### 3.1 注册/登录 Render

1. 访问 https://dashboard.render.com
2. 点击右上角 **Get Started** 或 **Sign In**
3. 选择 **Sign in with GitHub**（推荐）或使用邮箱注册

#### 3.2 部署服务

**方法 A: 使用 Blueprint（自动化）**

1. 在 Render Dashboard，点击 **New +** 
2. 选择 **Blueprint**
3. 点击 **Connect a repository**
4. 授权 Render 访问你的 GitHub
5. 选择 `ai-api-proxy` 仓库
6. Render 会自动检测 `render.yaml` 文件
7. 点击 **Apply** 开始部署
8. 等待 2-3 分钟，部署完成

**方法 B: 手动创建 Web Service**

1. 在 Render Dashboard，点击 **New +**
2. 选择 **Web Service**
3. 连接你的 GitHub 仓库
4. 配置如下：
   - **Name**: `ai-api-proxy`
   - **Environment**: `Docker`
   - **Plan**: `Free`
   - **Docker Build Context Directory**: 留空或 `./`
   - **Dockerfile Path**: `./Dockerfile`
5. 展开 **Advanced** 设置：
   - **Health Check Path**: `/health`
6. 点击 **Create Web Service**
7. 等待构建和部署完成

#### 3.3 获取服务地址

部署成功后，你会看到：
- 服务状态变为 **Live** 🟢
- 顶部显示服务地址，如：`https://ai-api-proxy-xxxx.onrender.com`

### 步骤 4: 测试部署

#### 4.1 测试健康检查

```bash
curl https://your-app.onrender.com/health
```

预期响应：
```json
{
  "status": "ok",
  "timestamp": "2026-06-02T07:30:00.000Z"
}
```

#### 4.2 测试 OpenAI 代理

```bash
curl https://your-app.onrender.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Say hello"}]
  }'
```

#### 4.3 测试 Anthropic 代理

```bash
curl https://your-app.onrender.com/anthropic/v1/messages \
  -H "x-api-key: YOUR_ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Say hello"}]
  }'
```

### 步骤 5: 在应用中使用

将你的 AI 应用配置中的 API 端点替换为你的代理地址：

**原来：**
```javascript
const openai = new OpenAI({
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'your-key'
});
```

**改为：**
```javascript
const openai = new OpenAI({
  baseURL: 'https://your-app.onrender.com/v1',
  apiKey: 'your-key'
});
```

---

## ⚠️ 重要提示

### Render Free 实例限制

- ✅ 永久免费，无需信用卡
- ⚠️ **15分钟无请求后会自动休眠**
- ⚠️ 休眠后首次请求需要 10-30 秒唤醒
- ⚠️ 每月 750 小时运行时间（约31天）
- ⚠️ 带宽限制：100GB/月

### 避免休眠的方法

1. **使用定时 ping 服务**（不推荐，浪费资源）
2. **升级到付费方案** ($7/月)
3. **接受休眠**（个人使用完全够用）

### 监控服务状态

在 Render Dashboard 中可以：
- 查看实时日志
- 监控 CPU/内存使用
- 查看请求统计
- 设置告警通知

---

## 🎯 快速命令参考

```bash
# 推送代码更新
git add .
git commit -m "Update proxy configuration"
git push

# 查看本地服务日志
npm start

# 本地测试
curl http://localhost:3000/health

# 测试部署服务
curl https://your-app.onrender.com/health
```

---

## 📞 需要帮助？

如果部署过程中遇到问题：

1. 检查 Render Dashboard 的日志
2. 确认 GitHub 仓库已正确推送
3. 验证 `render.yaml` 和 `Dockerfile` 配置
4. 查看主 README.md 的故障排查部分

---

**完成这些步骤后，你的 AI API 代理服务就可以正常使用了！** 🎉
