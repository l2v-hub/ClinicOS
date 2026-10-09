$ErrorActionPreference='Stop'
$qaListener=@(Get-NetTCPConnection -LocalPort 7515 -State Listen -ErrorAction SilentlyContinue)
if($qaListener.Count -ne 1){throw 'Expected exact owned listener'}
$qaServer=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$qaListener[0].OwningProcess)
if($qaServer.ProcessId -ne 31520 -or $qaServer.CommandLine -notmatch 'independent-qa/qa-server.mjs'){throw 'Ownership mismatch; no stop'}
$qaRecord=@{before=@{pid=$qaServer.ProcessId;commandLine=$qaServer.CommandLine;port=7515};policy='Stop only verified QA-owned server after serial browser complete'}
Stop-Process -Id $qaServer.ProcessId
Start-Sleep -Milliseconds 400
if(Get-NetTCPConnection -LocalPort 7515 -State Listen -ErrorAction SilentlyContinue){throw 'Port still busy'}
$qaRecord.after=@{listenerAbsent=$true;port=7515}
$qaRecord|ConvertTo-Json -Depth 4|Set-Content -LiteralPath 'artifacts/task-validation/424-reading-action/independent-qa/server-stop-receipt.json' -Encoding utf8
