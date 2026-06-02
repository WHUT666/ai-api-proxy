@echo off
REM 安全部署脚本 - AI API Proxy with Kiro Support
echo ========================================
echo AI API Proxy - 安全部署脚本
echo ========================================
echo.

REM 检查 ADMIN_KEY 是否已设置
echo [1/5] 检查环境变量配置...
if not defined ADMIN_KEY (
    echo.
    echo 警告: ADMIN_KEY 环境变量未设置
    echo 建议设置一个强密码作为管理员密钥
    echo.
    set /p ADMIN_KEY="请输入管理员密钥 (留空跳过): "
)

if defined ADMIN_KEY (
    echo ✓ 管理员密钥已配置
) else (
    echo ! 跳过管理员密钥配置 (管理接口将被禁用)
)
echo.

REM 检查 wrangler 是否安装
echo [2/5] 检查 Wrangler CLI...
where wrangler >nul 2>nul
if errorlevel 1 (
    echo × Wrangler 未安装
    echo 正在安装 Wrangler...
    call npm install -g wrangler
    if errorlevel 1 (
        echo × 安装失败，请手动安装: npm install -g wrangler
        pause
        exit /b 1
    )
)
echo ✓ Wrangler 已就绪
echo.

REM 设置 Secret (如果提供了 ADMIN_KEY)
if defined ADMIN_KEY (
    echo [3/5] 配置管理员密钥到 Cloudflare Secret...
    echo %ADMIN_KEY% | npx wrangler secret put ADMIN_KEY
    if errorlevel 1 (
        echo × 密钥配置失败
        echo 将在 wrangler.toml 中使用明文配置
    ) else (
        echo ✓ 密钥已安全存储到 Cloudflare Secret
    )
) else (
    echo [3/5] 跳过密钥配置
)
echo.

REM 部署 Worker
echo [4/5] 部署 Cloudflare Worker...
npx wrangler deploy
if errorlevel 1 (
    echo × Worker 部署失败
    pause
    exit /b 1
)
echo ✓ Worker 部署成功
echo.

REM 部署 Pages (管理后台)
echo [5/5] 部署管理后台到 Cloudflare Pages...
set /p DEPLOY_PAGES="是否部署管理后台? (y/n): "
if /i "%DEPLOY_PAGES%"=="y" (
    echo 正在部署...
    
    REM 检查是否有 public 目录
    if exist "public\admin-kiro.html" (
        npx wrangler pages deploy public --project-name=ai-api-admin
    ) else if exist "admin-kiro.html" (
        REM 创建临时目录
        if not exist ".deploy" mkdir .deploy
        copy admin-kiro.html .deploy\
        copy public\*.html .deploy\ 2>nul
        npx wrangler pages deploy .deploy --project-name=ai-api-admin
        rmdir /s /q .deploy
    ) else (
        echo × 找不到管理后台文件
    )
    
    if errorlevel 1 (
        echo × Pages 部署失败
    ) else (
        echo ✓ 管理后台部署成功
    )
) else (
    echo 跳过管理后台部署
)
echo.

REM 显示部署信息
echo ========================================
echo 部署完成!
echo ========================================
echo.
echo 下一步操作:
echo.
echo 1. 访问 Worker 地址测试 API:
echo    https://your-worker.workers.dev/health
echo.
echo 2. 访问管理后台 (需要密码):
echo    https://ai-api-admin.pages.dev/admin-kiro.html
echo.
echo 3. 配置管理后台:
echo    - 在"设置"页面输入管理员密钥
echo    - Worker 地址: https://your-worker.workers.dev
echo.
echo 4. 查看完整安全配置指南:
echo    打开 SECURITY_SETUP.md
echo.
echo ========================================
echo 安全提示:
echo ========================================
echo.
echo - 请妥善保管管理员密钥
echo - 建议启用 Cloudflare Access 进一步保护管理后台
echo - 定期检查访问日志和账号使用情况
echo - 定期更换管理员密钥 (每 3-6 个月)
echo.

pause
