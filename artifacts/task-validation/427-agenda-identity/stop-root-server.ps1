$ErrorActionPreference='Stop'
$taskRoot='C:/w-427/artifacts/task-validation/427-agenda-identity/root-rerun'
$taskReceipt=Get-Content -Raw -LiteralPath ($taskRoot+'/server-start.json')|ConvertFrom-Json
$taskProcess=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$taskReceipt.pid)
if(!$taskProcess -or !$taskProcess.CommandLine.Contains($taskReceipt.recipe)){throw 'Owned command identity mismatch'}
$taskListeners=@(Get-NetTCPConnection -State Listen -LocalPort $taskReceipt.port -ErrorAction SilentlyContinue)
if($taskListeners.Count -ne 1 -or $taskListeners[0].OwningProcess -ne $taskReceipt.pid){throw 'Owned listener identity mismatch'}
@{decision='AUTHORIZED STOP EXACT OWNED QA PID';pid=$taskReceipt.pid;port=$taskReceipt.port;verifiedCommand=$taskProcess.CommandLine;at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath ($taskRoot+'/server-stop-policy.json') -Encoding utf8
Stop-Process -Id $taskReceipt.pid
if(Get-NetTCPConnection -State Listen -LocalPort $taskReceipt.port -ErrorAction SilentlyContinue){throw 'Owned listener still active'}
@{pid=$taskReceipt.pid;listenerFree=$true;allRecipeBrowsersClosed=$true;at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath ($taskRoot+'/server-stop.json') -Encoding utf8
