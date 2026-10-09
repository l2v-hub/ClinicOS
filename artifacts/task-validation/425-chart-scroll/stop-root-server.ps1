$ErrorActionPreference='Stop'
$taskListener=Get-NetTCPConnection -LocalPort 7513 -State Listen -ErrorAction Stop
$taskPid=[int]$taskListener.OwningProcess
$taskProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$taskPid"
if($taskProcess.Name -ne 'node.exe' -or $taskProcess.CommandLine -notmatch '425-chart-scroll[/\\]root-rerun2[/\\]recipes[/\\]qa-server\.mjs'){throw 'Server identity not authorized for stop'}
$taskPolicy=@{action='STOP OWN VERIFIED QA SERVER';decision='AUTHORIZED';pid=$taskPid;port=7513;commandLine=$taskProcess.CommandLine;scope='Root synthetic QA process only; no other process or server';at=[DateTime]::UtcNow.ToString('o')}
$taskPolicy|ConvertTo-Json|Set-Content -LiteralPath artifacts/task-validation/425-chart-scroll/root-rerun2/server-stop-policy.json -Encoding utf8
Stop-Process -Id $taskPid
for($taskRetry=0;$taskRetry -lt 10;$taskRetry++){if(-not (Get-NetTCPConnection -LocalPort 7513 -State Listen -ErrorAction SilentlyContinue)){break};Start-Sleep -Milliseconds 100}
$taskFree=-not [bool](Get-NetTCPConnection -LocalPort 7513 -State Listen -ErrorAction SilentlyContinue)
@{pid=$taskPid;port=7513;listenerFree=$taskFree;verifiedCommandLine=$taskProcess.CommandLine;stoppedAt=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath artifacts/task-validation/425-chart-scroll/root-rerun2/server-stop.json -Encoding utf8
if(-not $taskFree){throw 'Own QA listener remains; lane not released'}
Write-Output 'Verified own QA server stopped; root browser lane released'
