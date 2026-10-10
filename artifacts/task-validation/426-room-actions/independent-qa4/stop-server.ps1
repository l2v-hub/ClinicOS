$ErrorActionPreference='Stop'
$qaOut='C:/w-426-qa4/artifacts/task-validation/426-room-actions/independent-qa4'
$qaStart=Get-Content -LiteralPath "$qaOut/server-start-policy.json" -Raw|ConvertFrom-Json
$qaProc=Get-CimInstance Win32_Process -Filter "ProcessId=$($qaStart.pid)"
if(-not $qaProc -or $qaProc.CommandLine -notlike '*C:/w-426-qa4/artifacts/task-validation/426-room-actions/independent-qa4/recipes/qa-server.mjs*'){throw 'Owned process identity mismatch'}
$qaListeners=@(Get-NetTCPConnection -LocalPort 7525 -State Listen -ErrorAction SilentlyContinue)
if($qaListeners.Count -ne 1 -or $qaListeners[0].OwningProcess -ne $qaStart.pid){throw 'Owned listener identity mismatch'}
$qaDecision=[ordered]@{head=$qaStart.head;at=(Get-Date).ToUniversalTime().ToString('o');decision='ALLOW STOP EXACT OWNED SERVER';pid=$qaStart.pid;commandLine=$qaProc.CommandLine;listeners=@($qaListeners|Select-Object LocalAddress,LocalPort,OwningProcess);scope='Only own Vite process after browser contexts closed'}
$qaDecision|ConvertTo-Json -Depth 6|Set-Content -LiteralPath "$qaOut/server-stop-policy.json"
Stop-Process -Id $qaStart.pid
Start-Sleep -Milliseconds 300
if(Get-CimInstance Win32_Process -Filter "ProcessId=$($qaStart.pid)"){throw 'Owned server still running'}
if(Get-NetTCPConnection -LocalPort 7525 -State Listen -ErrorAction SilentlyContinue){throw 'Assigned listener not released'}
[ordered]@{head=$qaStart.head;at=(Get-Date).ToUniversalTime().ToString('o');browserLane='RELEASED';port=7525;ownPid=$qaStart.pid;commandAndListenerVerified=$true;processStopped=$true;listenerReleased=$true;allBrowserContextsClosed=$true;scope='Root may now replay frozen recipes serially in its assigned lane'}|ConvertTo-Json -Depth 5|Set-Content -LiteralPath "$qaOut/lane-handoff.json"
Write-Output 'Owned PID2972 stopped; exclusive browser lane7525 RELEASED'
