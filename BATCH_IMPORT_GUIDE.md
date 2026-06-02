# 🎉 OIDC JSON 批量导入功能 - 使用指南

## ✅ 功能已完成并部署

### 🌐 访问地址
- **管理后台：** https://9cfc812e.ai-api-docs-bim.pages.dev/admin.html
- **API 网关：** https://ai-api-proxy.2358314123.workers.dev

---

## 📋 功能介绍

参考 Kiro-account-manager 项目，我们实现了完整的 OIDC JSON 批量导入功能，让你可以一次性导入多个 Kiro 账号。

### ✨ 主要特性

- ✅ **批量导入** - 一次导入多个 OIDC 账号
- ✅ **JSON 验证** - 导入前验证数据格式和必填字段
- ✅ **重复检测** - 自动跳过已存在的账号
- ✅ **详细报告** - 显示成功/失败的账号列表
- ✅ **错误提示** - 清晰的错误信息帮助排查问题
- ✅ **兼容格式** - 支持单个对象或数组格式

---

## 📝 JSON 格式说明

### 标准格式（OIDC 账号）

```json
[
  {
    "email": "user1@example.com",
    "region": "us-east-1",
    "clientId": "your-client-id-1",
    "clientSecret": "your-client-secret-1",
    "refreshToken": "your-refresh-token-1",
    "accessToken": "current-access-token-1"
  },
  {
    "email": "user2@example.com",
    "region": "us-west-2",
    "clientId": "your-client-id-2",
    "clientSecret": "your-client-secret-2",
    "refreshToken": "your-refresh-token-2"
  }
]
```

### 单个账号格式

```json
{
  "email": "user@example.com",
  "region": "us-east-1",
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "refreshToken": "your-refresh-token",
  "accessToken": "current-access-token",
  "idToken": "your-id-token",
  "expiresAt": 1733097600000,
  "enabled": true
}
```

### 字段说明

| 字段 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `email` | ✅ | 账号邮箱 | `user@example.com` |
| `clientId` | ✅ | OIDC Client ID | `xxxxxxxxxx` |
| `clientSecret` | ✅ | OIDC Client Secret | `xxxxxxxxxx` |
| `refreshToken` | ✅ | 刷新 Token | `eyJ...` |
| `region` | ❌ | AWS 区域 | `us-east-1` (默认) |
| `accessToken` | ❌ | 当前访问 Token | `eyJ...` |
| `idToken` | ❌ | ID Token | `eyJ...` |
| `expiresAt` | ❌ | 过期时间戳 | `1733097600000` |
| `enabled` | ❌ | 是否启用 | `true` (默认) |

---

## 🚀 使用步骤

### 步骤 1：准备 JSON 数据

#### 方式 A：从 Kiro-account-manager 导出

如果你使用 Kiro-account-manager：
1. 打开 Kiro-account-manager
2. 选择要导出的账号
3. 导出为 JSON 格式
4. 复制 JSON 内容

#### 方式 B：手动创建

创建一个 JSON 文件，格式参考上面的示例：

```json
[
  {
    "email": "account1@gmail.com",
    "clientId": "abc123",
    "clientSecret": "secret123",
    "refreshToken": "eyJraWQiOi..."
  },
  {
    "email": "account2@gmail.com",
    "clientId": "def456",
    "clientSecret": "secret456",
    "refreshToken": "eyJraWQiOi..."
  }
]
```

### 步骤 2：打开管理后台

访问：https://9cfc812e.ai-api-docs-bim.pages.dev/admin.html

### 步骤 3：配置管理界面

1. 点击 **"设置"** 标签
2. 填写：
   - 管理员密钥：`kiro-admin-2024`
   - Worker 地址：`https://ai-api-proxy.2358314123.workers.dev`
3. 点击 **"保存设置"**

### 步骤 4：批量导入

1. 点击 **"添加 Kiro 账号"** 标签
2. 滚动到 **"📦 批量导入 OIDC JSON"** 部分
3. 将 JSON 数据粘贴到文本框
4. 点击 **"验证 JSON"** 按钮（可选，但推荐）
5. 确认无误后，点击 **"批量导入"** 按钮

### 步骤 5：查看结果

导入完成后会显示：
- **总数**：尝试导入的账号数量
- **成功**：成功导入的账号列表
- **失败**：失败的账号及错误原因

---

## 🎯 API 接口说明

### 批量导入 API

**端点：** `POST /admin/accounts/kiro/batch`

**请求头：**
```
Authorization: Bearer kiro-admin-2024
Content-Type: application/json
```

**请求体：**
```json
[
  {
    "email": "user@example.com",
    "clientId": "xxx",
    "clientSecret": "xxx",
    "refreshToken": "xxx"
  }
]
```

**响应示例：**
```json
{
  "success": true,
  "results": {
    "total": 3,
    "success": [
      {
        "email": "user1@example.com",
        "id": "a1b2c3d4-..."
      },
      {
        "email": "user2@example.com",
        "id": "e5f6g7h8-..."
      }
    ],
    "failed": [
      {
        "email": "user3@example.com",
        "error": "Account already exists"
      }
    ]
  },
  "message": "Imported 2 accounts, 1 failed"
}
```

### cURL 示例

```bash
curl -X POST https://ai-api-proxy.2358314123.workers.dev/admin/accounts/kiro/batch \
  -H "Authorization: Bearer kiro-admin-2024" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "email": "user1@example.com",
      "clientId": "client-id-1",
      "clientSecret": "client-secret-1",
      "refreshToken": "refresh-token-1"
    },
    {
      "email": "user2@example.com",
      "clientId": "client-id-2",
      "clientSecret": "client-secret-2",
      "refreshToken": "refresh-token-2"
    }
  ]'
```

### JavaScript 示例

```javascript
const accounts = [
  {
    email: 'user1@example.com',
    clientId: 'client-id-1',
    clientSecret: 'client-secret-1',
    refreshToken: 'refresh-token-1'
  },
  {
    email: 'user2@example.com',
    clientId: 'client-id-2',
    clientSecret: 'client-secret-2',
    refreshToken: 'refresh-token-2'
  }
];

const response = await fetch('https://ai-api-proxy.2358314123.workers.dev/admin/accounts/kiro/batch', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer kiro-admin-2024',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(accounts)
});

const result = await response.json();
console.log(result);
```

---

## ❓ 常见问题

### 1. 导入失败：Account already exists

**原因：** 该邮箱的账号已经存在

**解决：** 
- 从 JSON 中移除该账号
- 或先删除已存在的账号

### 2. 导入失败：Email is required

**原因：** 账号数据中缺少 `email` 字段

**解决：** 确保每个账号都有 `email` 字段

### 3. 导入失败：Please fill in Client ID and Client Secret

**原因：** OIDC 账号缺少 `clientId` 或 `clientSecret`

**解决：** 确保提供完整的 OIDC 认证信息

### 4. JSON 格式错误

**原因：** JSON 语法不正确

**解决：**
- 使用在线 JSON 验证器检查格式
- 确保所有字符串用双引号
- 检查逗号和括号是否匹配

### 5. 验证通过但导入失败

**原因：** 可能是网络问题或服务器错误

**解决：**
- 检查管理员密钥是否正确
- 检查 Worker 地址是否正确
- 查看浏览器控制台错误信息

---

## 🔍 数据验证规则

批量导入会执行以下验证：

### 必填字段检查
- ✅ `email` - 必须存在
- ✅ `clientId` - OIDC 账号必须
- ✅ `clientSecret` - OIDC 账号必须
- ✅ `refreshToken` - OIDC 账号必须

### 重复检查
- ✅ 检查邮箱是否已存在
- ✅ 只检查 provider='kiro' 的账号

### 格式检查
- ✅ JSON 格式是否正确
- ✅ 支持数组或单个对象

---

## 💡 最佳实践

### 1. 先验证再导入

使用 "验证 JSON" 按钮先检查数据格式，确保无误后再导入。

### 2. 小批量导入

建议每次导入 10-20 个账号，避免一次性导入过多导致超时。

### 3. 保留原始数据

导入前保存一份原始 JSON 数据，以便导入失败时重试。

### 4. 检查导入结果

导入完成后仔细查看结果报告，确认所有账号都成功导入。

### 5. 测试账号可用性

导入后在 "账号管理" 页面检查账号状态，必要时刷新 Token。

---

## 🎊 功能对比

| 功能 | 单个添加 | 批量导入 |
|------|---------|---------|
| **速度** | 慢 | 快 |
| **适用场景** | 1-2 个账号 | 3+ 个账号 |
| **操作复杂度** | 低 | 中 |
| **错误提示** | 即时 | 汇总报告 |
| **重复检测** | ✅ | ✅ |
| **支持格式** | 表单 | JSON |

---

## 📊 示例数据

### 示例 1：最小配置

```json
[
  {
    "email": "test@example.com",
    "clientId": "abc123",
    "clientSecret": "secret123",
    "refreshToken": "eyJ..."
  }
]
```

### 示例 2：完整配置

```json
[
  {
    "email": "user@example.com",
    "region": "us-east-1",
    "clientId": "abc123",
    "clientSecret": "secret123",
    "refreshToken": "eyJraWQi...",
    "accessToken": "eyJhbGci...",
    "idToken": "eyJhbGci...",
    "expiresAt": 1733097600000,
    "enabled": true
  }
]
```

### 示例 3：多区域账号

```json
[
  {
    "email": "us-user@example.com",
    "region": "us-east-1",
    "clientId": "us-client-id",
    "clientSecret": "us-secret",
    "refreshToken": "us-refresh-token"
  },
  {
    "email": "eu-user@example.com",
    "region": "eu-west-1",
    "clientId": "eu-client-id",
    "clientSecret": "eu-secret",
    "refreshToken": "eu-refresh-token"
  },
  {
    "email": "asia-user@example.com",
    "region": "ap-northeast-1",
    "clientId": "asia-client-id",
    "clientSecret": "asia-secret",
    "refreshToken": "asia-refresh-token"
  }
]
```

---

## 🚀 技术实现

### Worker API 端点

**位置：** `worker-kiro.js`  
**端点：** `POST /admin/accounts/kiro/batch`

**关键特性：**
- ✅ 支持数组和单个对象
- ✅ 自动去重检测
- ✅ 详细的错误报告
- ✅ 原子性操作（每个账号独立处理）
- ✅ UUID 自动生成

### 前端界面

**位置：** `public/admin.html`

**关键功能：**
- ✅ JSON 语法高亮文本框
- ✅ 实时验证
- ✅ 导入结果可视化
- ✅ 成功/失败分类显示
- ✅ 一键清空

---

## 📚 相关文档

- **项目主页：** [FINAL_SUCCESS.md](FINAL_SUCCESS.md)
- **Kiro 指南：** [KIRO_GUIDE.md](KIRO_GUIDE.md)
- **快速参考：** [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Web 界面指南：** [WEB_DEPLOYMENT_COMPLETE.md](WEB_DEPLOYMENT_COMPLETE.md)

---

## 🎉 总结

批量导入功能让你可以：
- ⚡ **快速导入** - 一次导入多个账号，节省时间
- 🔍 **自动验证** - 导入前检查数据格式
- 📊 **详细报告** - 清晰了解导入结果
- 🔒 **安全可靠** - 重复检测，防止数据冲突

**立即体验：** https://9cfc812e.ai-api-docs-bim.pages.dev/admin.html

---

**有任何问题随时告诉我！** 💪
