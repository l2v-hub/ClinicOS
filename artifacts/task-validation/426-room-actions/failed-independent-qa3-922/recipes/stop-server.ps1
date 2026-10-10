$ErrorActionPreference = 'Stop'
$qaOut = 'C:/w-426-qa3/artifacts/task-validation/426-room-actions/independent-qa3'
$qaProcessId = [int](Get-Content -Raw -LiteralPath "$qaOut/server-pid.json" | ConvertFrom-Json)
$process = Get-CimInstance Win32_Process -Filter "ProcessId=$qaProcessId"
$listener = Get-NetTCPConnection -LocalPort 7521 -State Listen -ErrorAction Stop
if (!$process -or $process.Name -ne 'node.exe' -or $process.CommandLine -notlike '*artifacts/task-validation/426-room-actions/independent-qa3/recipes/qa-server.mjs*' -or $listener.OwningProcess -ne $qaProcessId) { throw 'Server ownership mismatch, no stop permitted' }
$receipt = @{ decision = 'AUTHORIZED OWN QA SERVER STOP'; pid = $qaProcessId; port = 7521; commandLine = $process.CommandLine; exactOwnedCheckout = 'C:/w-426-qa3'; observedListenerOwner = $listener.OwningProcess }
$receipt | ConvertTo-Json | Set-Content -LiteralPath "$qaOut/server-stop-policy.json"
Stop-Process -Id $qaProcessId
if (Get-NetTCPConnection -LocalPort 7521 -State Listen -ErrorAction SilentlyContinue) { throw 'QA listener not released' }
$receipt.result = 'STOPPED; browser recipes explicitly closed every context and browser in finally';
$receipt | ConvertTo-Json | Set-Content -LiteralPath "$qaOut/server-stop-receipt.json"
Write-Output "Owned QA server $qaProcessId stopped; browser lane7521 released"
