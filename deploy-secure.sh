#!/bin/bash
# 安全部署脚本 - AI API Proxy with Kiro Support

echo "========================================"
echo "AI API Proxy - 安全部署脚本"
echo "========================================"
echo ""

# 检查 ADMIN_KEY 是否已设置
echo "[1/5] 检查环境变量配置..."
if [ -z "$ADMIN_KEY" ]; then
    echo ""
    echo "警告: ADMIN_KEY 环境变量未设置"
    echo "建议设置一个强密码作为管理员密钥"
    echo ""
    read -p "请输入管理员密钥 (留空跳过): " ADMIN_KEY
fi

if [ -n "$ADMIN_KEY" ]; then
    echo "✓ 管理员密钥已配置"
else
    echo "! 跳过管理员密钥配置 (管理接口将被禁用)"
fi
echo ""

# 检查 wrangler 是否安装
echo "[2/5] 检查 Wrangler CLI..."
if ! command -v wrangler &> /dev/null; then
    echo "× Wrangler 未安装"
    echo "正在安装 Wrangler..."
    npm install -g wrangler
    if [ $? -ne 0 ]; then
        echo "× 安装失败，请手动安装: npm install -g wrangler"
        exit 1
    fi
fi
echo "✓ Wrangler 已就绪"
echo ""

# 设置 Secret (如果提供了 ADMIN_KEY)
if [ -n "$ADMIN_KEY" ]; then
    echo "[3/5] 配置管理员密钥到 Cloudflare Secret..."
    echo "$ADMIN_KEY" | npx wrangler secret put ADMIN_KEY
    if [ $? -ne 0 ]; then
        echo "× 密钥配置失败"
        echo "将在 wrangler.toml 中使用明文配置"
    else
        echo "✓ 密钥已安全存储到 Cloudflare Secret"
    fi
else
    echo "[3/5] 跳过密钥配置"
fi
echo ""

# 部署 Worker
echo "[4/5] 部署 Cloudflare Worker..."
npx wrangler deploy
if [ $? -ne 0 ]; then
    echo "× Worker 部署失败"
    exit 1
fi
echo "✓ Worker 部署成功"
echo ""

# 部署 Pages (管理后台)
echo "[5/5] 部署管理后台到 Cloudflare Pages..."
read -p "是否部署管理后台? (y/n): " DEPLOY_PAGES
if [ "$DEPLOY_PAGES" = "y" ] || [ "$DEPLOY_PAGES" = "Y" ]; then
    echo "正在部署..."
    
    # 检查是否有 public 目录
    if [ -f "public/admin-kiro.html" ]; then
        npx wrangler pages deploy public --project-name=ai-api-admin
    elif [ -f "admin-kiro.html" ]; then
        # 创建临时目录
        mkdir -p .deploy
        cp admin-kiro.html .deploy/
        cp public/*.html .deploy/ 2>/dev/null || true
        npx wrangler pages deploy .deploy --project-name=ai-api-admin
        rm -rf .deploy
    else
        echo "× 找不到管理后台文件"
    fi
    
    if [ $? -ne 0 ]; then
        echo "× Pages 部署失败"
    else
        echo "✓ 管理后台部署成功"
    fi
else
    echo "跳过管理后台部署"
fi
echo ""

# 显示部署信息
echo "========================================"
echo "部署完成!"
echo "========================================"
echo ""
echo "下一步操作:"
echo ""
echo "1. 访问 Worker 地址测试 API:"
echo "   https://your-worker.workers.dev/health"
echo ""
echo "2. 访问管理后台 (需要密码):"
echo "   https://ai-api-admin.pages.dev/admin-kiro.html"
echo ""
echo "3. 配置管理后台:"
echo "   - 在\"设置\"页面输入管理员密钥"
echo "   - Worker 地址: https://your-worker.workers.dev"
echo ""
echo "4. 查看完整安全配置指南:"
echo "   cat SECURITY_SETUP.md"
echo ""
echo "========================================"
echo "安全提示:"
echo "========================================"
echo ""
echo "- 请妥善保管管理员密钥"
echo "- 建议启用 Cloudflare Access 进一步保护管理后台"
echo "- 定期检查访问日志和账号使用情况"
echo "- 定期更换管理员密钥 (每 3-6 个月)"
echo ""
