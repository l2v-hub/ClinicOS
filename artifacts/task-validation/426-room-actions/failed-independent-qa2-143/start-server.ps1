$ErrorActionPreference='Stop'
$taskRoot='C:/w-426-qa2'
$evidenceRoot="$taskRoot/artifacts/task-validation/426-room-actions/independent-qa2"
if(Get-NetTCPConnection -LocalPort 7519 -State Listen -ErrorAction SilentlyContinue){throw 'Reserved port in use'}
$env:QA_PORT='7519'
$env:EV_OUT=$evidenceRoot
$serverProcess=Start-Process (Get-Command node).Source -ArgumentList @('artifacts/task-validation/426-room-actions/independent-qa2/recipes/qa-server.mjs') -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput "$evidenceRoot/server.log" -RedirectStandardError "$evidenceRoot/server-error.log" -PassThru
$serverRecord=Get-CimInstance Win32_Process -Filter "ProcessId=$($serverProcess.Id)"
@{pid=$serverProcess.Id;commandLine=$serverRecord.CommandLine;port=7519;head='1436602e81d0c03625cfa73ce24974099e919612';purpose='Actual repository Vite React compiler; API transport intercepted before wire'} | ConvertTo-Json | Set-Content -LiteralPath "$evidenceRoot/server-receipt.json"
Write-Output "Owned QA2 server PID $($serverProcess.Id)"
