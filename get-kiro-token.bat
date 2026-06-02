@echo off
echo ====================================
echo     Kiro Token 获取助手
echo ====================================
echo.
echo 正在查找 Kiro Token 文件...
echo.

REM VS Code 路径
set VSCODE_PATH=%APPDATA%\Code\User\globalStorage\amazon.q-for-vscode\sso\token_cache.json

REM Cursor 路径
set CURSOR_PATH=%APPDATA%\Cursor\User\globalStorage\amazon.q-for-vscode\sso\token_cache.json

echo 检查 VS Code 配置文件...
if exist "%VSCODE_PATH%" (
    echo [找到] VS Code Token 文件
    echo 路径: %VSCODE_PATH%
    echo.
    echo 正在打开文件...
    notepad.exe "%VSCODE_PATH%"
    goto :found
)

echo 检查 Cursor 配置文件...
if exist "%CURSOR_PATH%" (
    echo [找到] Cursor Token 文件
    echo 路径: %CURSOR_PATH%
    echo.
    echo 正在打开文件...
    notepad.exe "%CURSOR_PATH%"
    goto :found
)

echo.
echo [未找到] 无法找到 Kiro Token 文件
echo.
echo 请确认：
echo 1. 已在 VS Code 或 Cursor 中安装 Amazon Q 插件
echo 2. 已登录 Amazon Q 账号
echo.
echo 手动查找路径：
echo VS Code: %VSCODE_PATH%
echo Cursor: %CURSOR_PATH%
echo.
pause
exit

:found
echo.
echo ====================================
echo 找到 Token 文件并已打开！
echo ====================================
echo.
echo 请在打开的文件中查找：
echo   "accessToken": "eyJ..."
echo.
echo 复制 accessToken 的值（引号内的内容）
echo 这就是你需要的 Kiro Token
echo.
echo ====================================
pause
