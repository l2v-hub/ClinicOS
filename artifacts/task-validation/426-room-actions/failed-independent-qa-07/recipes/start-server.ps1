$ErrorActionPreference = 'Stop'
$taskOut = (Resolve-Path 'artifacts/task-validation/426-room-actions/independent-qa').Path
$taskPort = if ($env:QA_PORT) { [int]$env:QA_PORT } else { 7518 }
if (Get-NetTCPConnection -State Listen -LocalPort $taskPort -ErrorAction SilentlyContinue) { throw 'Reserved QA port already owned' }
$env:EV_OUT = Join-Path $taskOut 'server'
$env:QA_PORT = [string]$taskPort
New-Item -ItemType Directory -Path $env:EV_OUT -Force | Out-Null
$taskNode = (Get-Command node).Source
$taskServer = Start-Process -FilePath $taskNode -ArgumentList 'artifacts/task-validation/426-room-actions/independent-qa/recipes/qa-server.mjs' -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $env:EV_OUT 'stdout.log') -RedirectStandardError (Join-Path $env:EV_OUT 'stderr.log')
@{ pid=$taskServer.Id; port=$taskPort; command='recipes/qa-server.mjs'; source='07c3f7d13e8ac99a1af1238ec3661502950f45e3' } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $env:EV_OUT 'ownership.json')
Write-Output "Owned QA server PID $($taskServer.Id), port $taskPort"
