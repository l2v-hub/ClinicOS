$ErrorActionPreference='Stop'
$taskRoot='C:/w-426/artifacts/task-validation/426-room-actions'
$taskCandidate=(Get-Content -Raw -LiteralPath ($taskRoot+'/frozen-release-source.json')|ConvertFrom-Json).applicationCommit
$taskTarget='C:/w-426-qa4'
if(Test-Path -LiteralPath $taskTarget){throw 'Assigned checkout already exists'}
git worktree add --detach $taskTarget $taskCandidate
if($LASTEXITCODE -ne 0){throw 'Assigned checkout creation failed'}
New-Item -ItemType Junction -Path ($taskTarget+'/node_modules') -Target 'C:/Workspace/ClinicOSHouse-worktrees/insulin-online-20261008/node_modules'|Out-Null
$taskEvidence=$taskTarget+'/artifacts/task-validation/426-room-actions/independent-qa4'
New-Item -ItemType Directory -Path ($taskEvidence+'/recipes') -Force|Out-Null
foreach($taskName in @('task-contract.md','qa4-assignment-policy.md','frozen-release-source.json','browser-plan.json')){Copy-Item -LiteralPath ($taskRoot+'/'+$taskName) -Destination ($taskEvidence+'/'+$taskName)}
Copy-Item -LiteralPath ($taskRoot+'/failed-independent-qa3-922/original-issue.json') -Destination ($taskEvidence+'/original-issue.json')
foreach($taskName in @('commands.mjs','security.mjs','source-receipt.mjs','qa-server.mjs')){Copy-Item -LiteralPath ($taskRoot+'/'+$taskName) -Destination ($taskEvidence+'/recipes/'+$taskName)}
foreach($taskName in @('browser.mjs','supplemental.mjs','long-labels.mjs','room-headers.mjs','delete-header.mjs','confirm-bounds.mjs')){Copy-Item -LiteralPath ($taskRoot+'/failed-independent-qa3-922/recipes/'+$taskName) -Destination ($taskEvidence+'/recipes/'+$taskName)}
Copy-Item -LiteralPath ($taskRoot+'/root-header-inspection/recipes/confirm-bounds.mjs') -Destination ($taskEvidence+'/recipes/header-vertical.mjs')
Write-Output ('Assigned NEW readonly candidate '+$taskCandidate+' to '+$taskTarget)
