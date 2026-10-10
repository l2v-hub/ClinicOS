$ErrorActionPreference='Stop'
$qaRoot='C:/w-426-qa4'
$qaOut="$qaRoot/artifacts/task-validation/426-room-actions/independent-qa4"
if(Get-NetTCPConnection -LocalPort 7525 -State Listen -ErrorAction SilentlyContinue){throw 'Assigned port already occupied'}
$env:QA_PORT='7525'
$env:EV_OUT="$qaOut/runtime01"
$qaProc=Start-Process -FilePath (Get-Command node).Source -ArgumentList "$qaOut/recipes/qa-server.mjs" -WorkingDirectory $qaRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput "$qaOut/server.stdout.log" -RedirectStandardError "$qaOut/server.stderr.log"
$qaRecord=[ordered]@{at=(Get-Date).ToUniversalTime().ToString('o');head='30e8023e8b88dcd8b5e40544f1597ee0c046a41c';pid=$qaProc.Id;port=7525;script="$qaOut/recipes/qa-server.mjs";decision='ALLOW OWNED SYNTHETIC LOCAL SERVER';scope='Exclusive assigned browser lane; no production API/credentials/writes'}
$qaRecord|ConvertTo-Json -Depth 5|Set-Content -LiteralPath "$qaOut/server-start-policy.json"
$qaReady=$false
for($qaAttempt=0;$qaAttempt -lt 60;$qaAttempt++){
  if($qaProc.HasExited){throw 'Owned local server exited'}
  try{$qaResponse=Invoke-WebRequest 'http://127.0.0.1:7525' -TimeoutSec 2;if($qaResponse.StatusCode -eq 200){$qaReady=$true;break}}catch{}
  Start-Sleep -Milliseconds 500
}
if(-not $qaReady){throw 'Owned local server not ready'}
Write-Output "Owned Vite server ready on assigned port7525 PID$($qaProc.Id)"
