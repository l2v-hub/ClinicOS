$ErrorActionPreference='Stop'
$taskPort=7517
if(Get-NetTCPConnection -LocalPort $taskPort -State Listen -ErrorAction SilentlyContinue){throw 'Reserved port already occupied'}
$taskRoot='C:/w-426/artifacts/task-validation/426-room-actions/baseline'
New-Item -ItemType Directory -Force -Path $taskRoot|Out-Null
$env:QA_PORT=[string]$taskPort;$env:EV_OUT=$taskRoot
$taskProcess=Start-Process -FilePath (Get-Command node).Source -ArgumentList 'artifacts/task-validation/426-room-actions/qa-server.mjs' -WorkingDirectory 'C:/w-426' -WindowStyle Hidden -RedirectStandardOutput ($taskRoot+'/server.log') -RedirectStandardError ($taskRoot+'/server-error.log') -PassThru
@{decision='AUTHORIZED SYNTHETIC QA SERVER ONLY';pid=$taskProcess.Id;port=$taskPort;worktree='C:/w-426';script='artifacts/task-validation/426-room-actions/qa-server.mjs';appBaseline='b7ae14d120c1e70ccf72784206a505f8c48f975e';at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath ($taskRoot+'/server-receipt.json') -Encoding utf8
[pscustomobject]@{pid=$taskProcess.Id;port=$taskPort}|ConvertTo-Json
