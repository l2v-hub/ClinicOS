$ErrorActionPreference='Stop'
$taskRoot='C:/w-426/artifacts/task-validation/426-room-actions'
$taskCandidate=(Get-Content -Raw -LiteralPath ($taskRoot+'/frozen-headers-source.json')|ConvertFrom-Json).applicationCommit
$taskTarget='C:/w-426-qa3'
if(Test-Path -LiteralPath $taskTarget){throw 'Assigned new checkout already exists'}
git worktree add --detach $taskTarget $taskCandidate
if($LASTEXITCODE -ne 0){throw 'Isolated worktree creation failed'}
New-Item -ItemType Junction -Path ($taskTarget+'/node_modules') -Target 'C:/Workspace/ClinicOSHouse-worktrees/insulin-online-20261008/node_modules'|Out-Null
$taskEvidence=$taskTarget+'/artifacts/task-validation/426-room-actions/independent-qa3'
New-Item -ItemType Directory -Path ($taskEvidence+'/recipes') -Force|Out-Null
foreach($taskName in @('task-contract.md','qa3-assignment-policy.md','frozen-headers-source.json')){Copy-Item -LiteralPath ($taskRoot+'/'+$taskName) -Destination ($taskEvidence+'/'+$taskName)}
Copy-Item -LiteralPath ($taskRoot+'/failed-independent-qa2-143/original-issue.json') -Destination ($taskEvidence+'/original-issue.json')
foreach($taskName in @('commands.mjs','security.mjs','source-receipt.mjs','qa-server.mjs')){Copy-Item -LiteralPath ($taskRoot+'/'+$taskName) -Destination ($taskEvidence+'/recipes/'+$taskName)}
foreach($taskName in @('browser.mjs','supplemental.mjs','long-labels.mjs','room-headers.mjs','delete-header.mjs')){Copy-Item -LiteralPath ($taskRoot+'/failed-independent-qa2-143/recipes/'+$taskName) -Destination ($taskEvidence+'/recipes/'+$taskName)}
Write-Output ('Assigned new readonly candidate '+$taskCandidate+' to '+$taskTarget)
