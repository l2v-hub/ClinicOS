$ErrorActionPreference='Stop'
$taskServers=@(@{pid=25700;port=7491;command='"C:\Program Files\nodejs\node.exe" artifacts/task-validation/419-calendar-create/qa-server.mjs'},@{pid=39320;port=7494;command='"C:\Program Files\nodejs\node.exe" C:/w-419/artifacts/task-validation/419-calendar-create/qa-server.mjs'})
foreach($server in $taskServers){
 $process=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$server.pid)
 $listener=Get-NetTCPConnection -State Listen -LocalPort $server.port -ErrorAction Stop
 if($process.CommandLine -ne $server.command -or $listener.OwningProcess -ne $server.pid){throw 'Owned QA server identity mismatch; no process stopped'}
}
foreach($server in $taskServers){Stop-Process -Id $server.pid -ErrorAction Stop}
@{at=[DateTime]::UtcNow.ToString('o');decision='STOP EXACT OWNED QA SERVERS AFTER COMPLETED ACCEPTANCE';servers=$taskServers;excluded='All unrelated launchers, production services and worktrees unchanged';deletedFiles=0}|ConvertTo-Json -Depth 5|Set-Content -LiteralPath 'artifacts/task-validation/419-calendar-create/server-stop-receipt.json' -Encoding utf8
'Root419 own7491 and baseline7494 stopped; no files removed'
