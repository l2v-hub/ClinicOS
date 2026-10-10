$ErrorActionPreference='Stop'
$taskRoot='C:/w-427/artifacts/task-validation/427-agenda-identity/root-rerun'
if(Get-NetTCPConnection -State Listen -LocalPort 7526 -ErrorAction SilentlyContinue){throw 'Assigned browser port occupied'}
$taskHandoff=Get-Content -Raw 'C:/w-427/artifacts/task-validation/427-agenda-identity/independent-qa/lane-handoff.json'|ConvertFrom-Json
if($taskHandoff.browserLane -ne 'RELEASED'){throw 'Independent browser lane not released'}
$env:EV_OUT=$taskRoot
$env:QA_PORT='7526'
$taskRecipe='artifacts/task-validation/427-agenda-identity/root-rerun/recipes/qa-server.mjs'
$taskProcess=Start-Process -FilePath (Get-Command node).Source -ArgumentList @($taskRecipe) -WorkingDirectory 'C:/w-427' -WindowStyle Hidden -PassThru -RedirectStandardOutput ($taskRoot+'/server.log') -RedirectStandardError ($taskRoot+'/server-error.log')
@{decision='AUTHORIZED ROOT OWNED SERVER AFTER INDEPENDENT HANDOFF';pid=$taskProcess.Id;port=7526;root='C:/w-427';recipe=$taskRecipe;at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath ($taskRoot+'/server-start.json') -Encoding utf8
Write-Output ('Root owned synthetic QA server PID '+$taskProcess.Id)
