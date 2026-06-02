# Kiro API 调试脚本

$headers = @{
    Authorization = "Bearer kiro-admin-2024"
    "Content-Type" = "application/json"
}

Write-Output "=== Kiro API 调试测试 ==="
Write-Output ""

# 1. 获取账号列表
Write-Output "1. 获取账号列表..."
try {
    $accounts = Invoke-RestMethod -Uri "https://ai-api-proxy.2358314123.workers.dev/admin/accounts" -Headers $headers
    $firstAccount = $accounts.accounts[0]
    Write-Output "✅ 找到 $($accounts.accounts.Count) 个账号"
    Write-Output "   第一个账号: $($firstAccount.email)"
    Write-Output "   账号 ID: $($firstAccount.id)"
    Write-Output "   区域: $($firstAccount.region)"
    Write-Output ""
} catch {
    Write-Output "❌ 获取账号失败: $($_.Exception.Message)"
    exit 1
}

# 2. 刷新 Token
Write-Output "2. 刷新账号 Token..."
try {
    $refreshResult = Invoke-RestMethod `
        -Uri "https://ai-api-proxy.2358314123.workers.dev/admin/accounts/$($firstAccount.id)/refresh" `
        -Method POST `
        -Headers $headers
    
    if ($refreshResult.success) {
        Write-Output "✅ Token 刷新成功"
        Write-Output "   新 Token 长度: $($refreshResult.accessToken.Length) 字符"
        Write-Output ""
    } else {
        Write-Output "❌ Token 刷新失败: $($refreshResult.error)"
        exit 1
    }
} catch {
    Write-Output "❌ 刷新请求失败: $($_.Exception.Message)"
    exit 1
}

# 3. 等待数据同步
Write-Output "3. 等待 2 秒让数据同步..."
Start-Sleep -Seconds 2
Write-Output ""

# 4. 再次获取账号信息
Write-Output "4. 验证 Token 是否已保存..."
try {
    $updatedAccounts = Invoke-RestMethod -Uri "https://ai-api-proxy.2358314123.workers.dev/admin/accounts" -Headers $headers
    $updatedAccount = $updatedAccounts.accounts | Where-Object { $_.id -eq $firstAccount.id }
    
    Write-Output "   过期时间: $($updatedAccount.expiresAt)"
    if ($updatedAccount.expiresAt) {
        $expireDate = [DateTimeOffset]::FromUnixTimeMilliseconds($updatedAccount.expiresAt).LocalDateTime
        $timeLeft = $expireDate - (Get-Date)
        Write-Output "   过期日期: $expireDate"
        Write-Output "   剩余时间: $($timeLeft.TotalMinutes.ToString('F0')) 分钟"
    }
    Write-Output ""
} catch {
    Write-Output "❌ 获取更新后账号失败: $($_.Exception.Message)"
}

# 5. 测试 Kiro API 调用
Write-Output "5. 测试 Kiro API 调用..."
try {
    $apiHeaders = @{"Content-Type" = "application/json"}
    $body = @{
        model = "claude-3-5-sonnet"
        messages = @(
            @{
                role = "user"
                content = "请回复'测试成功'"
            }
        )
        max_tokens = 50
    } | ConvertTo-Json -Depth 10
    
    Write-Output "   请求 URL: https://ai-api-proxy.2358314123.workers.dev/kiro/v1/chat/completions"
    Write-Output "   请求模型: claude-3-5-sonnet"
    Write-Output ""
    Write-Output "   发送请求..."
    
    $apiResponse = Invoke-WebRequest `
        -Uri "https://ai-api-proxy.2358314123.workers.dev/kiro/v1/chat/completions" `
        -Method POST `
        -Headers $apiHeaders `
        -Body $body `
        -UseBasicParsing `
        -TimeoutSec 60
    
    Write-Output "✅ API 调用成功！"
    Write-Output "   状态码: $($apiResponse.StatusCode)"
    Write-Output ""
    Write-Output "   响应内容:"
    $responseJson = $apiResponse.Content | ConvertFrom-Json
    $responseJson | ConvertTo-Json -Depth 5
    Write-Output ""
    
    if ($responseJson.choices -and $responseJson.choices[0].message.content) {
        Write-Output "   AI 回复: $($responseJson.choices[0].message.content)"
    }
    
} catch {
    Write-Output "❌ API 调用失败"
    Write-Output "   状态码: $($_.Exception.Response.StatusCode.value__)"
    Write-Output "   错误: $($_.Exception.Message)"
    
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorBody = $reader.ReadToEnd()
        $reader.Close()
        $stream.Close()
        
        if ($errorBody) {
            Write-Output ""
            Write-Output "   错误详情:"
            try {
                $errorJson = $errorBody | ConvertFrom-Json
                $errorJson | ConvertTo-Json -Depth 3
            } catch {
                Write-Output $errorBody
            }
        }
    }
}

Write-Output ""
Write-Output "=== 测试完成 ==="
