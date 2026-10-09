param([Parameter(Mandatory=$true)][int]$Port,[Parameter(Mandatory=$true)][int]$ExpectedPid,[string]$Script='artifacts/task-validation/424-reading-action/qa-server.mjs')
if ($Script -notin @('artifacts/task-validation/424-reading-action/qa-server.mjs','artifacts/task-validation/424-reading-action/root-rerun/recipes/qa-server.mjs')) { throw 'Server script outside exact allowlist' }
$taskListener=Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
$taskProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$ExpectedPid"
if ($taskListener.OwningProcess -ne $ExpectedPid -or -not $taskProcess.CommandLine.Contains($Script)) { throw 'Exact owned server mismatch; no process stopped' }
Stop-Process -Id $ExpectedPid -ErrorAction Stop
Start-Sleep -Milliseconds 300
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { throw 'Listener still active' }
[pscustomobject]@{port=$Port;pid=$ExpectedPid;command=$taskProcess.CommandLine;listenerFree=$true}|ConvertTo-Json
