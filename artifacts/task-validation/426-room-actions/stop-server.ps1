$ErrorActionPreference='Stop'
$taskPid=30312
$taskProcess=Get-CimInstance Win32_Process -Filter "ProcessId = $taskPid"
if(-not $taskProcess -or $taskProcess.CommandLine -notlike '*node.exe*artifacts/task-validation/426-room-actions/qa-server.mjs*'){throw 'Process identity mismatch; no stop'}
$taskListener=@(Get-NetTCPConnection -LocalPort 7517 -State Listen -ErrorAction SilentlyContinue)
if($taskListener.Count -gt 0 -and @($taskListener | Where-Object OwningProcess -ne $taskPid).Count -gt 0){throw 'Port owner mismatch; no stop'}
@{decision='AUTHORIZED STOP ONLY OWNED QA SERVER';pid=$taskPid;command=$taskProcess.CommandLine;listenerOwners=@($taskListener.OwningProcess);at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath 'C:/w-426/artifacts/task-validation/426-room-actions/root-initial02/server-stop-policy.json' -Encoding utf8
Stop-Process -Id $taskPid
if(Get-NetTCPConnection -LocalPort 7517 -State Listen -ErrorAction SilentlyContinue){throw 'Port not released'}
Write-Output 'Root browser lane released; owned server stopped'
