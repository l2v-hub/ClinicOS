$ErrorActionPreference='Stop'
$taskSha='973d78e5e109032a36cf89cf80fd8eb2a848a649'
$taskCredentials=(Get-Content -Raw -LiteralPath 'C:/Workspace/ClinicOSHouse/.claude/settings.local.json'|ConvertFrom-Json).env
try {
  $taskHeaders=@{Authorization=('Bearer '+$taskCredentials.VERCEL_TOKEN)}
  $taskList=Invoke-RestMethod -Uri 'https://api.vercel.com/v6/deployments?projectId=prj_6eDFTx8o4IoZhCXr4Sd7LX6dteo6&teamId=team_P8yHboFntuOI9pT0zdgbJAqU&target=production&limit=20' -Headers $taskHeaders
  $taskSelected=@($taskList.deployments|Where-Object {$_.meta.githubCommitSha -eq $taskSha})|Select-Object -First 1
  if (-not $taskSelected) { Write-Output 'Deployment not yet visible'; exit 2 }
  $taskVercel=Invoke-RestMethod -Uri ('https://api.vercel.com/v13/deployments/'+$taskSelected.uid+'?teamId=team_P8yHboFntuOI9pT0zdgbJAqU') -Headers $taskHeaders
  if ($taskVercel.readyState -ne 'READY') { [pscustomobject]@{id=$taskVercel.id;state=$taskVercel.readyState}|ConvertTo-Json; exit 2 }
  if ($taskVercel.meta.githubCommitSha -ne $taskSha -or $taskVercel.gitSource.sha -ne $taskSha -or 'clinicos-eosin.vercel.app' -notin $taskVercel.alias) { throw 'Source/alias mismatch' }
  $taskFront=Invoke-WebRequest -Uri 'https://clinicos-eosin.vercel.app/'
  $taskCssMatch=[regex]::Match($taskFront.Content,'href="(/assets/index-[^" ]+\.css)"')
  if (-not $taskCssMatch.Success) { throw 'Live CSS entry missing' }
  $taskCssUri='https://clinicos-eosin.vercel.app'+$taskCssMatch.Groups[1].Value
  $taskCss=Invoke-WebRequest -Uri $taskCssUri
  $taskBadgeToken=$taskCss.Content.Contains('--badge-success-text:#0b6b60')
  $taskBadgeConsumer=$taskCss.Content.Contains('.stato-pill--ricovero-ricoverato') -and $taskCss.Content.Contains('color:var(--badge-success-text)')
  if ($taskFront.StatusCode -ne 200 -or $taskCss.StatusCode -ne 200 -or -not $taskBadgeToken -or -not $taskBadgeConsumer) { throw 'Live CSS smoke mismatch' }
  [pscustomobject]@{applicationCommit=$taskSha;checkedAt=[datetime]::UtcNow.ToString('o');decision='VERIFIED RELEASE';productionPatientReads=0;productionMutations=0;
    vercel=@{id=$taskVercel.id;state=$taskVercel.readyState;gitSourceSha=$taskVercel.gitSource.sha;githubCommitSha=$taskVercel.meta.githubCommitSha;aliases=$taskVercel.alias;productionAlias='https://clinicos-eosin.vercel.app/';http=$taskFront.StatusCode;cssUrl=$taskCssUri;cssHttp=$taskCss.StatusCode;cssSha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($taskCss.Content))).ToLower();badgeTokenPresent=$taskBadgeToken;badgeConsumerPresent=$taskBadgeConsumer};
    backend=@{status='NOT APPLICABLE';reason='CSS/test-only fix; backend application remains verified406 deployment, no manual backend release.'}
  }|ConvertTo-Json -Depth 6
} catch { Write-Output 'Release inspection failed safely; no raw provider or credential exception.'; exit 1 }
