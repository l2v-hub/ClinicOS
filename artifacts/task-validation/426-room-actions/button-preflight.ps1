$ErrorActionPreference='Stop'
$taskRoot='C:/w-426/artifacts/task-validation/426-room-actions'
$taskOut=$taskRoot+'/root-button'
if(Get-NetTCPConnection -State Listen -LocalPort 7523 -ErrorAction SilentlyContinue){throw 'Assigned preflight port occupied'}
New-Item -ItemType Directory -Path ($taskOut+'/recipes') -Force|Out-Null
foreach($taskName in @('confirm-bounds.mjs','qa-server.mjs')){Copy-Item -LiteralPath ($taskRoot+'/failed-independent-qa3-922/recipes/'+$taskName) -Destination ($taskOut+'/recipes/'+$taskName)}
$env:EV_OUT=$taskOut
$env:QA_PORT='7523'
$env:APP_URL='http://127.0.0.1:7523'
$env:SOURCE_COMMIT='working-remediation-from922a801f-not-immutable'
$taskNode=(Get-Command node).Source
$taskProcess=Start-Process -FilePath $taskNode -ArgumentList @('artifacts/task-validation/426-room-actions/root-button/recipes/qa-server.mjs') -WorkingDirectory 'C:/w-426' -WindowStyle Hidden -PassThru -RedirectStandardOutput ($taskOut+'/server.log') -RedirectStandardError ($taskOut+'/server-error.log')
@{decision='AUTHORIZED OWNED ROOT SYNTHETIC BROWSER PREFLIGHT';pid=$taskProcess.Id;port=7523;source='Working remediation, NOT release proof';at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath ($taskOut+'/server-start.json') -Encoding utf8
try {
 for($taskAttempt=0;$taskAttempt -lt 30;$taskAttempt++) {if(Get-NetTCPConnection -State Listen -LocalPort 7523 -ErrorAction SilentlyContinue){break};Start-Sleep -Milliseconds 300}
 node artifacts/task-validation/426-room-actions/root-button/recipes/confirm-bounds.mjs artifacts/task-validation/426-room-actions/root-button/confirm-bounds01 *> ($taskOut+'/preflight.log')
 if($LASTEXITCODE -ne 0){throw 'Strong preflight failed; evidence retained, no release'}
 Write-Output 'Actual complete-text/glyph/pixel confirmation preflight PASS'
} finally {
 $taskActual=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$taskProcess.Id)
 $taskListeners=@(Get-NetTCPConnection -State Listen -LocalPort 7523 -ErrorAction SilentlyContinue)
 if(!$taskActual -or !$taskActual.CommandLine.Contains('artifacts/task-validation/426-room-actions/root-button/recipes/qa-server.mjs') -or $taskListeners.Count -ne 1 -or $taskListeners[0].OwningProcess -ne $taskProcess.Id){throw 'Stop identity mismatch, do not kill unrelated process'}
 @{decision='AUTHORIZED STOP OWNED PREFLIGHT PID';pid=$taskProcess.Id;verifiedCommand=$taskActual.CommandLine;port=7523;at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath ($taskOut+'/server-stop-policy.json') -Encoding utf8
 Stop-Process -Id $taskProcess.Id
 if(Get-NetTCPConnection -State Listen -LocalPort 7523 -ErrorAction SilentlyContinue){throw 'Owned preflight listener remains active'}
 @{listenerFree=$true;allRecipeBrowsersClosed=$true;at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath ($taskOut+'/server-stop.json') -Encoding utf8
}
