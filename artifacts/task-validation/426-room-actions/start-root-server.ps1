$ErrorActionPreference='Stop'
$taskRoot='C:/w-426/artifacts/task-validation/426-room-actions/root-rerun4'
if(Get-NetTCPConnection -State Listen -LocalPort 7524 -ErrorAction SilentlyContinue){throw 'Assigned browser port occupied'}
$env:EV_OUT=$taskRoot
$env:QA_PORT='7524'
$taskNode=(Get-Command node).Source
$taskProcess=Start-Process -FilePath $taskNode -ArgumentList @('artifacts/task-validation/426-room-actions/root-rerun4/recipes/qa-server.mjs') -WorkingDirectory 'C:/w-426' -WindowStyle Hidden -PassThru -RedirectStandardOutput ($taskRoot+'/server.log') -RedirectStandardError ($taskRoot+'/server-error.log')
$taskReceipt=@{decision='AUTHORIZED ROOT OWNED QA SERVER AFTER INDEPENDENT HANDOFF';pid=$taskProcess.Id;port=7524;root='C:/w-426';recipe='artifacts/task-validation/426-room-actions/root-rerun4/recipes/qa-server.mjs';at=[DateTime]::UtcNow.ToString('o')}
$taskReceipt|ConvertTo-Json|Set-Content -LiteralPath ($taskRoot+'/server-start.json') -Encoding utf8
Write-Output ('Root owned synthetic QA server PID '+$taskProcess.Id)
