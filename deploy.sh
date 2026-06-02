#!/bin/bash

# AI API Proxy 部署脚本

echo "🚀 AI API 代理部署脚本"
echo "========================"
echo ""

# 检查是否安装了必要的工具
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 未安装"
        return 1
    else
        echo "✅ $1 已安装"
        return 0
    fi
}

echo "检查依赖..."
check_command git
check_command node

echo ""
echo "请选择部署平台:"
echo "1) Railway"
echo "2) Render"
echo "3) Fly.io"
echo "4) 本地测试"
echo ""
read -p "输入选项 (1-4): " choice

case $choice in
    1)
        echo ""
        echo "📦 Railway 部署步骤："
        echo "1. 访问 https://railway.app"
        echo "2. 使用 GitHub 登录"
        echo "3. 点击 'New Project' -> 'Deploy from GitHub repo'"
        echo "4. 选择此仓库"
        echo "5. Railway 会自动检测 Dockerfile 并部署"
        echo "6. 部署完成后，点击 'Generate Domain' 获取公网地址"
        echo ""
        echo "💡 Railway 免费额度: \$5 一次性试用"
        ;;
    2)
        echo ""
        echo "📦 Render 部署步骤："
        echo "1. 访问 https://render.com"
        echo "2. 使用 GitHub 登录"
        echo "3. 点击 'New +' -> 'Blueprint'"
        echo "4. 选择此仓库"
        echo "5. Render 会自动读取 render.yaml 并部署"
        echo "6. 部署完成后会自动分配公网地址"
        echo ""
        echo "💡 Render 免费额度: Free 实例（有限制但永久免费）"
        echo "   - 15分钟无请求后会休眠"
        echo "   - 首次唤醒需要几秒钟"
        ;;
    3)
        echo ""
        echo "📦 Fly.io 部署步骤："
        echo ""
        if check_command flyctl; then
            read -p "是否现在部署到 Fly.io? (y/n): " deploy_now
            if [ "$deploy_now" = "y" ]; then
                echo "正在登录 Fly.io..."
                flyctl auth login
                echo ""
                echo "正在创建应用..."
                flyctl launch --no-deploy
                echo ""
                echo "正在部署..."
                flyctl deploy
                echo ""
                echo "✅ 部署完成！"
                flyctl status
            fi
        else
            echo "请先安装 flyctl:"
            echo "curl -L https://fly.io/install.sh | sh"
            echo ""
            echo "安装后运行以下命令："
            echo "  flyctl auth login"
            echo "  flyctl launch"
            echo "  flyctl deploy"
        fi
        echo ""
        echo "💡 Fly.io 免费额度:"
        echo "   - 最多3个共享CPU虚拟机"
        echo "   - 每月160GB出站流量"
        echo "   - 自动休眠（无请求时）"
        ;;
    4)
        echo ""
        echo "🔧 本地测试部署"
        echo ""
        
        if [ ! -d "node_modules" ]; then
            echo "正在安装依赖..."
            npm install
        fi
        
        echo ""
        echo "✅ 启动服务器..."
        echo "访问 http://localhost:3000"
        echo ""
        npm start
        ;;
    *)
        echo "❌ 无效的选项"
        exit 1
        ;;
esac

echo ""
echo "========================"
echo "📖 查看 README.md 了解使用方法"
