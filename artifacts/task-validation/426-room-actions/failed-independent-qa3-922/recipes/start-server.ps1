$ErrorActionPreference = 'Stop'
$qaRoot = 'C:/w-426-qa3'
$qaOut = "$qaRoot/artifacts/task-validation/426-room-actions/independent-qa3"
if (Get-NetTCPConnection -LocalPort 7521 -State Listen -ErrorAction SilentlyContinue) { throw 'QA lane occupied' }
$env:QA_PORT = '7521'
$env:EV_OUT = $qaOut
$process = Start-Process -FilePath (Get-Command node).Source -ArgumentList 'artifacts/task-validation/426-room-actions/independent-qa3/recipes/qa-server.mjs' -WorkingDirectory $qaRoot -WindowStyle Hidden -RedirectStandardOutput "$qaOut/server.stdout.log" -RedirectStandardError "$qaOut/server.stderr.log" -PassThru
$process.Id | ConvertTo-Json | Set-Content -LiteralPath "$qaOut/server-pid.json"
Write-Output "Owned QA server PID $($process.Id) on7521"
