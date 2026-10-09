param([Parameter(Mandatory=$true)][string]$Attempt)
$ErrorActionPreference='Stop'
if($Attempt -notin @('ordinary','extra','strong')){throw 'Unknown owned server attempt'}
$targetScript="artifacts/task-validation/422-drug-results/root-rerun/$Attempt/qa-server.mjs"
$listener=Get-NetTCPConnection -State Listen -LocalPort 7509
$ownedProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
if($ownedProcess.Name -ne 'node.exe' -or $ownedProcess.CommandLine -ne ('"C:\Program Files\nodejs\node.exe" '+$targetScript)){throw 'Exact owned command required'}
$receipt=@{decision='AUTHORIZED STOP EXACT OWNED LOCAL QA SERVER';authority='Root sole browser writer; synthetic local QA session';pid=$ownedProcess.ProcessId;command=$ownedProcess.CommandLine;port=7509;at=[DateTime]::UtcNow.ToString('o')}
Stop-Process -Id $ownedProcess.ProcessId
if(Get-NetTCPConnection -State Listen -LocalPort 7509 -ErrorAction SilentlyContinue){throw 'Port remains active'}
$receipt.result='OWNED SERVER STOPPED AND PORT FREE'
$receipt|ConvertTo-Json|Set-Content -LiteralPath "artifacts/task-validation/422-drug-results/root-rerun/$Attempt/stop-owner.json" -Encoding utf8
Write-Output $receipt.result
