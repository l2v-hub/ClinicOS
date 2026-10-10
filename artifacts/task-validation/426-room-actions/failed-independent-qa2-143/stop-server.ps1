$ErrorActionPreference='Stop'
$evidenceRoot='C:/w-426-qa2/artifacts/task-validation/426-room-actions/independent-qa2'
$serverRecord=Get-Content -LiteralPath "$evidenceRoot/server-receipt.json" -Raw | ConvertFrom-Json
$ownedProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$($serverRecord.pid)"
$listener=Get-NetTCPConnection -LocalPort 7519 -State Listen -ErrorAction Stop
if($listener.OwningProcess -ne $serverRecord.pid){throw 'Listener ownership mismatch'}
if(!$ownedProcess.CommandLine.Contains('artifacts/task-validation/426-room-actions/independent-qa2/recipes/qa-server.mjs')){throw 'Process command mismatch'}
Stop-Process -Id $serverRecord.pid -ErrorAction Stop
Start-Sleep -Milliseconds 300
if(Get-NetTCPConnection -LocalPort 7519 -State Listen -ErrorAction SilentlyContinue){throw 'Port remains owned'}
@{pid=$serverRecord.pid;verifiedCommand=$ownedProcess.CommandLine;port=7519;stopped=$true;browserLane='RELEASED';allRecipeBrowsersClosed=$true} | ConvertTo-Json | Set-Content -LiteralPath "$evidenceRoot/lane-handoff.json"
