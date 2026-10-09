$ErrorActionPreference='Stop'
$taskSha='c11c0990f6313a53a8bcde467046eecef69e012a'
$taskCredentials=(Get-Content -Raw -LiteralPath 'C:/Workspace/ClinicOSHouse/.claude/settings.local.json'|ConvertFrom-Json).env
$env:GH_TOKEN=$taskCredentials.GH_TOKEN
try {
  $taskRun=gh run view 37893378620 --repo l2v-hub/ClinicOS --json status,conclusion,headSha,url|ConvertFrom-Json
  $taskVercel=Invoke-RestMethod -Uri 'https://api.vercel.com/v13/deployments/dpl_FsEgnzXDHUsKqDs67R3swyPnjpXe?teamId=team_P8yHboFntuOI9pT0zdgbJAqU' -Headers @{Authorization=('Bearer '+$taskCredentials.VERCEL_TOKEN)}
  if ($taskRun.status -ne 'completed' -or $taskVercel.readyState -ne 'READY') {
    [pscustomobject]@{backend=$taskRun.status;backendConclusion=$taskRun.conclusion;frontend=$taskVercel.readyState}|ConvertTo-Json
    exit 2
  }
  if ($taskRun.conclusion -ne 'success' -or $taskRun.headSha -ne $taskSha -or $taskVercel.meta.githubCommitSha -ne $taskSha -or $taskVercel.gitSource.sha -ne $taskSha) { throw 'Source/status mismatch' }
  $taskLog=gh run view 37893378620 --repo l2v-hub/ClinicOS --log
  $taskLogText=$taskLog -join "`n"
  $taskCheckoutMatch=[regex]::Match($taskLogText,'git log -1 --format=%H[^\n]*\n[^\n]*?([a-f0-9]{40})')
  if (-not $taskCheckoutMatch.Success -or $taskCheckoutMatch.Groups[1].Value -ne $taskSha) { throw 'Actual checkout not verified' }
  $taskRailwayMatch=[regex]::Match($taskLogText,'Deployment: https://railway.com/[^\s]*[?&]id=([a-f0-9-]{36})')
  if (-not $taskRailwayMatch.Success) { throw 'Railway deployment ID missing' }
  $taskRailwayId=$taskRailwayMatch.Groups[1].Value
  $taskQuery='query { deployment(id:"'+$taskRailwayId+'") { id status createdAt meta } }'
  $taskRailway=Invoke-RestMethod -Uri 'https://backboard.railway.com/graphql/v2' -Method Post -Headers @{Authorization=('Bearer '+$taskCredentials.RAILWAY_API_TOKEN)} -ContentType 'application/json' -Body (@{query=$taskQuery}|ConvertTo-Json)
  $taskRailwayDeployment=$taskRailway.data.deployment
  if ($taskRailwayDeployment.status -ne 'SUCCESS') { [pscustomobject]@{railway=$taskRailwayDeployment.status;deploymentId=$taskRailwayId}|ConvertTo-Json; exit 2 }
  $taskFront=Invoke-WebRequest -Uri 'https://clinicos-eosin.vercel.app/'
  $taskHealth=Invoke-WebRequest -Uri 'https://clinicos-backend-production-df88.up.railway.app/health'
  $taskEntry=[regex]::Match($taskFront.Content,'src="([^"]+/assets/[^" ]+\.js|/assets/[^" ]+\.js)"')
  if (-not $taskEntry.Success) { throw 'Live bundle entry missing' }
  $taskEntryUri=[uri]::new([uri]'https://clinicos-eosin.vercel.app/',$taskEntry.Groups[1].Value).AbsoluteUri
  $taskBundle=Invoke-WebRequest -Uri $taskEntryUri
  $taskHashBytes=[System.Text.Encoding]::UTF8.GetBytes($taskBundle.Content)
  $taskBundleHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskHashBytes)).ToLower()
  $taskChunkPattern='[A-Za-z0-9_-]*(?:Patient|patient|Therapy|therapy|Cartella|cartella|intakeTherapies)[A-Za-z0-9_.-]*\.js'
  $taskChunkNames=@([regex]::Matches($taskBundle.Content,$taskChunkPattern).Value|Sort-Object -Unique)
  $taskChunkReceipts=@()
  $taskGuard=$false
  $taskPreview=$false
  for ($taskChunkIndex=0; $taskChunkIndex -lt $taskChunkNames.Count; $taskChunkIndex++) {
    $taskChunkName=$taskChunkNames[$taskChunkIndex]
    $taskChunk=Invoke-WebRequest -Uri ('https://clinicos-eosin.vercel.app/assets/'+$taskChunkName)
    foreach ($taskReference in [regex]::Matches($taskChunk.Content,$taskChunkPattern).Value) { if ($taskReference -notin $taskChunkNames) { $taskChunkNames+=$taskReference } }
    $taskChunkGuard=$taskChunk.Content.Contains('Via registrata da verificare: contiene un regime terapeutico.')
    $taskChunkPreview=$taskChunk.Content.Contains('Tipo terapia:')
    if ($taskChunkGuard -or $taskChunkPreview) {
      $taskChunkReceipts+=@{url=('https://clinicos-eosin.vercel.app/assets/'+$taskChunkName);sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($taskChunk.Content))).ToLower();legacyReviewGuardPresent=$taskChunkGuard;distinctTypePreviewPresent=$taskChunkPreview}
    }
    $taskGuard=$taskGuard -or $taskChunkGuard
    $taskPreview=$taskPreview -or $taskChunkPreview
  }
  if ($taskFront.StatusCode -ne 200 -or $taskHealth.StatusCode -ne 200 -or -not $taskGuard -or -not $taskPreview) { throw 'Read-only smoke mismatch' }
  [pscustomobject]@{
    applicationCommit=$taskSha;checkedAt=[datetime]::UtcNow.ToString('o');decision='VERIFIED RELEASE';productionMutations=0;
    vercel=@{id=$taskVercel.id;state=$taskVercel.readyState;gitSourceSha=$taskVercel.gitSource.sha;githubCommitSha=$taskVercel.meta.githubCommitSha;aliases=$taskVercel.alias;productionAlias='https://clinicos-eosin.vercel.app/';http=$taskFront.StatusCode;bundleUrl=$taskEntryUri;bundleSha256=$taskBundleHash;clinicalChunks=$taskChunkReceipts;legacyReviewGuardPresent=$taskGuard;distinctTypePreviewPresent=$taskPreview};
    backend=@{runId=37893378620;runUrl=$taskRun.url;eventHeadSha=$taskRun.headSha;actualCheckoutSha=$taskSha;workflowConclusion=$taskRun.conclusion;railwayDeploymentId=$taskRailwayId;railwayStatus=$taskRailwayDeployment.status;imageDigest=$taskRailwayDeployment.meta.imageDigest;healthUrl='https://clinicos-backend-production-df88.up.railway.app/health';healthHttp=$taskHealth.StatusCode;provenance='Actual Actions checkout log + printed Railway deployment ID + provider SUCCESS/image digest; Railway metadata itself has no git SHA'}
  }|ConvertTo-Json -Depth 6
} catch { Write-Output 'Release inspection failed safely; inspect selected diagnostic fields, no raw provider/credential exception.'; exit 1 }
