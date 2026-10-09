$ErrorActionPreference='Stop'
$taskSha='8b327ca55ab5d8d4c5e0c19afcb828c017eeb3df'
$taskCredentials=(Get-Content -Raw -LiteralPath 'C:/Workspace/ClinicOSHouse/.claude/settings.local.json'|ConvertFrom-Json).env
try {
  $taskHeaders=@{Authorization=('Bearer '+$taskCredentials.VERCEL_TOKEN)}
  $taskList=Invoke-RestMethod -Uri 'https://api.vercel.com/v6/deployments?projectId=prj_6eDFTx8o4IoZhCXr4Sd7LX6dteo6&teamId=team_P8yHboFntuOI9pT0zdgbJAqU&target=production&limit=15' -Headers $taskHeaders
  $taskMatches=@($taskList.deployments|Where-Object {$_.meta.githubCommitSha -eq $taskSha})
  if ($taskMatches.Count -eq 0) { Write-Output 'Candidate deployment not yet present'; exit 2 }
  $taskId=$taskMatches[0].uid
  $taskVercel=Invoke-RestMethod -Uri ('https://api.vercel.com/v13/deployments/'+$taskId+'?teamId=team_P8yHboFntuOI9pT0zdgbJAqU') -Headers $taskHeaders
  if ($taskVercel.readyState -ne 'READY') { [pscustomobject]@{frontend=$taskVercel.readyState;deploymentId=$taskId}|ConvertTo-Json; exit 2 }
  if ($taskVercel.meta.githubCommitSha -ne $taskSha -or $taskVercel.gitSource.sha -ne $taskSha -or $taskVercel.alias -notcontains 'clinicos-eosin.vercel.app') { throw 'Source/alias mismatch' }
  $taskFront=Invoke-WebRequest -Uri 'https://clinicos-eosin.vercel.app/'
  $taskHealth=Invoke-WebRequest -Uri 'https://clinicos-backend-production-df88.up.railway.app/health'
  $taskEntry=[regex]::Match($taskFront.Content,'src="([^"]*/assets/[^" ]+\.js)"')
  if (-not $taskEntry.Success) { throw 'Live bundle missing' }
  $taskEntryUri=[uri]::new([uri]'https://clinicos-eosin.vercel.app/',$taskEntry.Groups[1].Value).AbsoluteUri
  $taskBundle=Invoke-WebRequest -Uri $taskEntryUri
  $taskNames=@([regex]::Matches($taskBundle.Content,'[A-Za-z0-9_-]*PatientList[A-Za-z0-9_.-]*\.js').Value|Sort-Object -Unique)
  $taskChunks=@();$taskRegime=$false
  foreach ($taskName in $taskNames) {
    $taskUrl='https://clinicos-eosin.vercel.app/assets/'+$taskName
    $taskChunk=Invoke-WebRequest -Uri $taskUrl
    $taskFound=$taskChunk.Content.Contains('Regime registrato') -and $taskChunk.Content.Contains('Non dimessi') -and $taskChunk.Content.Contains('non_disponibile')
    if ($taskFound) {$taskChunks+=@{url=$taskUrl;http=$taskChunk.StatusCode;sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($taskChunk.Content))).ToLower();regimeControlsPresent=$true}}
    $taskRegime=$taskRegime -or $taskFound
  }
  # Some bundlers inline the list into the entry. Accept only the same concrete strings.
  $taskEntryHasRegime=$taskBundle.Content.Contains('Regime registrato') -and $taskBundle.Content.Contains('Non dimessi') -and $taskBundle.Content.Contains('non_disponibile')
  if ($taskFront.StatusCode -ne 200 -or $taskHealth.StatusCode -ne 200 -or (-not $taskRegime -and -not $taskEntryHasRegime)) {throw 'Read-only smoke mismatch'}
  [pscustomobject]@{applicationCommit=$taskSha;checkedAt=[datetime]::UtcNow.ToString('o');decision='VERIFIED RELEASE';productionPatientTestMutations=0;
    vercel=@{id=$taskVercel.id;state=$taskVercel.readyState;gitSourceSha=$taskVercel.gitSource.sha;githubCommitSha=$taskVercel.meta.githubCommitSha;aliases=$taskVercel.alias;productionAlias='https://clinicos-eosin.vercel.app/';http=$taskFront.StatusCode;bundleUrl=$taskEntryUri;bundleSha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($taskBundle.Content))).ToLower();regimeChunks=$taskChunks;entryContainsRegime=$taskEntryHasRegime};
    backend=@{changed=$false;retainedApplication='47a4b16c111d9b9bfd0b138991958a8ca8f6c351';retainedDeployment='ed539cb2-224c-4221-8e7a-0f0901039987';healthUrl='https://clinicos-backend-production-df88.up.railway.app/health';healthHttp=$taskHealth.StatusCode;provenance='No411backend/schema/API changes; previously verified409retained. No fake redeployment or production patient test write.'}}|ConvertTo-Json -Depth 7
} catch {Write-Output 'Release inspection failed safely; no raw credential/provider exception';exit 1}
