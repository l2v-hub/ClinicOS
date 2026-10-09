$ErrorActionPreference='Stop'
$taskSha='47a4b16c111d9b9bfd0b138991958a8ca8f6c351'
$taskCredentials=(Get-Content -Raw -LiteralPath 'C:/Workspace/ClinicOSHouse/.claude/settings.local.json'|ConvertFrom-Json).env
$env:GH_TOKEN=$taskCredentials.GH_TOKEN
try {
  $taskRun=gh run view 37903586484 --repo l2v-hub/ClinicOS --json status,conclusion,headSha,url|ConvertFrom-Json
  $taskVercel=Invoke-RestMethod -Uri 'https://api.vercel.com/v13/deployments/dpl_6GFhZBk1mw8yCbDsQZZJPuifZ1SB?teamId=team_P8yHboFntuOI9pT0zdgbJAqU' -Headers @{Authorization=('Bearer '+$taskCredentials.VERCEL_TOKEN)}
  if ($taskRun.status -ne 'completed' -or $taskVercel.readyState -ne 'READY') {
    [pscustomobject]@{backend=$taskRun.status;backendConclusion=$taskRun.conclusion;frontend=$taskVercel.readyState}|ConvertTo-Json
    exit 2
  }
  if ($taskRun.conclusion -ne 'success' -or $taskRun.headSha -ne $taskSha -or $taskVercel.meta.githubCommitSha -ne $taskSha -or $taskVercel.gitSource.sha -ne $taskSha) { throw 'Source/status mismatch' }
  $taskLogText=(gh run view 37903586484 --repo l2v-hub/ClinicOS --log) -join "`n"
  $taskCheckout=[regex]::Match($taskLogText,'git log -1 --format=%H[^\n]*\n[^\n]*?([a-f0-9]{40})')
  if (-not $taskCheckout.Success -or $taskCheckout.Groups[1].Value -ne $taskSha) { throw 'Actual checkout not verified' }
  $taskRailwayMatch=[regex]::Match($taskLogText,'Deployment: https://railway.com/[^\s]*[?&]id=([a-f0-9-]{36})')
  if (-not $taskRailwayMatch.Success) { throw 'Railway deployment ID missing' }
  $taskRailwayId=$taskRailwayMatch.Groups[1].Value
  $taskQuery='query { deployment(id:"'+$taskRailwayId+'") { id status createdAt meta } deploymentLogs(deploymentId:"'+$taskRailwayId+'",limit:500,filter:"20261009090000_explicit_diary_reads") { message timestamp } }'
  $taskRailway=Invoke-RestMethod -Uri 'https://backboard.railway.com/graphql/v2' -Method Post -Headers @{Authorization=('Bearer '+$taskCredentials.RAILWAY_API_TOKEN)} -ContentType 'application/json' -Body (@{query=$taskQuery}|ConvertTo-Json)
  $taskDeployment=$taskRailway.data.deployment
  if ($taskDeployment.status -ne 'SUCCESS') { [pscustomobject]@{railway=$taskDeployment.status;deploymentId=$taskRailwayId}|ConvertTo-Json; exit 2 }
  $taskMigrationMessages=@($taskRailway.data.deploymentLogs | Where-Object { $_.message -match 'Applying migration.*20261009090000_explicit_diary_reads' } | Select-Object timestamp,message)
  $taskMigrationSeen=($taskLogText -match 'Applying migration.*20261009090000_explicit_diary_reads') -or $taskMigrationMessages.Count -gt 0
  if (-not $taskMigrationSeen) { [pscustomobject]@{decision='MIGRATION EVIDENCE PENDING';deploymentId=$taskRailwayId;railway=$taskDeployment.status}|ConvertTo-Json; exit 3 }
  $taskFront=Invoke-WebRequest -Uri 'https://clinicos-eosin.vercel.app/'
  $taskHealth=Invoke-WebRequest -Uri 'https://clinicos-backend-production-df88.up.railway.app/health'
  $taskEntry=[regex]::Match($taskFront.Content,'src="([^"]*/assets/[^" ]+\.js)"')
  if (-not $taskEntry.Success) { throw 'Live bundle entry missing' }
  $taskEntryUri=[uri]::new([uri]'https://clinicos-eosin.vercel.app/',$taskEntry.Groups[1].Value).AbsoluteUri
  $taskBundle=Invoke-WebRequest -Uri $taskEntryUri
  $taskNames=@([regex]::Matches($taskBundle.Content,'[A-Za-z0-9_-]*Consegne[A-Za-z0-9_.-]*\.js').Value|Sort-Object -Unique)
  $taskChunks=@(); $taskQueue=$false
  foreach ($taskName in $taskNames) {
    $taskChunkUrl='https://clinicos-eosin.vercel.app/assets/'+$taskName
    $taskChunk=Invoke-WebRequest -Uri $taskChunkUrl
    $taskFound=$taskChunk.Content.Contains('Non confermate') -and $taskChunk.Content.Contains('/patients/diary-unread')
    if ($taskFound) { $taskChunks+=@{url=$taskChunkUrl;sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($taskChunk.Content))).ToLower();unreadQueuePresent=$true} }
    $taskQueue=$taskQueue -or $taskFound
  }
  if ($taskFront.StatusCode -ne 200 -or $taskHealth.StatusCode -ne 200 -or -not $taskQueue) { throw 'Read-only smoke mismatch' }
  [pscustomobject]@{
    applicationCommit=$taskSha;checkedAt=[datetime]::UtcNow.ToString('o');decision='VERIFIED RELEASE';productionPatientTestMutations=0;
    vercel=@{id=$taskVercel.id;state=$taskVercel.readyState;gitSourceSha=$taskVercel.gitSource.sha;githubCommitSha=$taskVercel.meta.githubCommitSha;aliases=$taskVercel.alias;productionAlias='https://clinicos-eosin.vercel.app/';http=$taskFront.StatusCode;bundleUrl=$taskEntryUri;bundleSha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($taskBundle.Content))).ToLower();unreadQueueChunks=$taskChunks};
    backend=@{runId=37903586484;runUrl=$taskRun.url;eventHeadSha=$taskRun.headSha;actualCheckoutSha=$taskSha;workflowConclusion=$taskRun.conclusion;railwayDeploymentId=$taskRailwayId;railwayStatus=$taskDeployment.status;imageDigest=$taskDeployment.meta.imageDigest;healthUrl='https://clinicos-backend-production-df88.up.railway.app/health';healthHttp=$taskHealth.StatusCode;migrationName='20261009090000_explicit_diary_reads';migrationLogObserved=$taskMigrationSeen;migrationApplicationMessages=$taskMigrationMessages;provenance='Actual Actions checkout log + Railway deployment ID + provider SUCCESS/image digest + explicit Applying migration log; no production patient test writes'}
  }|ConvertTo-Json -Depth 7
} catch { Write-Output 'Release inspection failed safely; inspect selected diagnostic fields, no raw provider/credential exception.'; exit 1 }
