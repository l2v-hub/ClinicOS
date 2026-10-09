$taskOwn = 'C:/w-425-qa2/artifacts/task-validation/425-chart-scroll/independent-qa2'
$taskListener = Get-NetTCPConnection -LocalPort 7515 -State Listen
$taskServerPid = $taskListener.OwningProcess
$taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$taskServerPid"
if ($taskListener.LocalAddress -ne '127.0.0.1' -or $taskProcess.CommandLine -notlike '*independent-qa2/recipes/qa-server.mjs*') { throw 'Owned server identity mismatch; stop refused' }
$taskReceipt = @{ action='STOP OWNED SYNTHETIC QA SERVER'; authorizedBy='root assigned serial lane and scoped teardown'; pid=$taskServerPid; port=7515; commandLine=$taskProcess.CommandLine; identityVerified=$true }
$taskReceipt | ConvertTo-Json | Set-Content -LiteralPath "$taskOwn/server-stop-policy.json"
Stop-Process -Id $taskServerPid
Start-Sleep -Milliseconds 500
$taskFree = @(Get-NetTCPConnection -LocalPort 7515 -State Listen -ErrorAction SilentlyContinue).Count -eq 0
@{pid=$taskServerPid;port=7515;free=$taskFree} | ConvertTo-Json | Set-Content -LiteralPath "$taskOwn/server-stop-verified.json"
if (-not $taskFree) { throw 'Port still busy; cannot hand off lane' }
Write-Output 'Owned QA server stopped and lane7515 free'
