$ErrorActionPreference = 'Stop'
$taskOut = (Resolve-Path 'artifacts/task-validation/426-room-actions/independent-qa').Path
$taskReceipt = Get-Content -Raw -LiteralPath (Join-Path $taskOut 'server/ownership.json') | ConvertFrom-Json
$taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($taskReceipt.pid)"
if (-not $taskProcess -or $taskProcess.CommandLine -notlike '*independent-qa/recipes/qa-server.mjs*') { throw 'Owned process command mismatch' }
$taskListener = @(Get-NetTCPConnection -LocalPort $taskReceipt.port -State Listen -ErrorAction SilentlyContinue)
if ($taskListener.Count -ne 1 -or $taskListener[0].OwningProcess -ne $taskReceipt.pid) { throw 'Owned listener mismatch' }
Stop-Process -Id $taskReceipt.pid
@{pid=$taskReceipt.pid;port=$taskReceipt.port;result='Owned Hidden QA server stopped after browsers closed';commandVerified=$true;listenerVerified=$true} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskOut 'server/shutdown.json')
Write-Output 'QA browser lane handed back; owned server stopped'
