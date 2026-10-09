$ErrorActionPreference='Stop'
$taskSha='02b4ba89af291186a72e040b868da024bb865164'
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
  $taskNames=@([regex]::Matches($taskBundle.Content,'[A-Za-z0-9_-]*(?:PatientDetail|PatientParameters|MultiPatientParametri)[A-Za-z0-9_.-]*\.js').Value|Sort-Object -Unique)
  foreach($taskName in @($taskNames)) {
    $taskParent=Invoke-WebRequest -Uri ('https://clinicos-eosin.vercel.app/assets/'+$taskName)
    $taskNames+=@([regex]::Matches($taskParent.Content,'[A-Za-z0-9_-]*Patient(?:VitalSignsView|ParameterEntry|Parameters)[A-Za-z0-9_.-]*\.js').Value)
  }
  foreach($taskName in @($taskNames|Sort-Object -Unique)) {
    $taskParent=Invoke-WebRequest -Uri ('https://clinicos-eosin.vercel.app/assets/'+$taskName)
    $taskNames+=@([regex]::Matches($taskParent.Content,'[A-Za-z0-9_-]*Parameter(?:ReadingForm|EntryPanel)[A-Za-z0-9_.-]*\.js').Value)
  }
  $taskNames=@($taskNames|Sort-Object -Unique)
  $taskNames+=@([regex]::Matches($taskBundle.Content,'[A-Za-z0-9_-]*MultiPatientParametri[A-Za-z0-9_.-]*\.js').Value)
  $taskChunks=@();$taskActionsFound=$false;$taskStatusFound=$false;$taskCompactFound=$false
  foreach($taskName in $taskNames) {
    $taskUrl='https://clinicos-eosin.vercel.app/assets/'+$taskName
    $taskChunk=Invoke-WebRequest -Uri $taskUrl
    $taskActions=$taskChunk.Content.Contains('Salva rilevazione') -and $taskChunk.Content.Contains('Campo successivo');$taskStatus=$taskChunk.Content.Contains('NEWS2 in tempo reale');$taskCompact=$taskChunk.Content.Contains('parameter-reading-form')
    $taskChunks+=@{url=$taskUrl;http=$taskChunk.StatusCode;sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($taskChunk.Content))).ToLower();explicitActionsPresent=$taskActions;liveNews2Present=$taskStatus;sharedFormPresent=$taskCompact}
    $taskActionsFound=$taskActionsFound -or $taskActions;$taskStatusFound=$taskStatusFound -or $taskStatus;$taskCompactFound=$taskCompactFound -or $taskCompact
  }
  if ($taskFront.StatusCode -ne 200 -or $taskHealth.StatusCode -ne 200 -or -not ($taskActionsFound -and $taskStatusFound -and $taskCompactFound)) { throw 'Read-only smoke mismatch' }
  [pscustomobject]@{applicationCommit=$taskSha;checkedAt=[datetime]::UtcNow.ToString('o');decision='VERIFIED RELEASE';productionPatientTestMutations=0;
    vercel=@{id=$taskVercel.id;state=$taskVercel.readyState;gitSourceSha=$taskVercel.gitSource.sha;githubCommitSha=$taskVercel.meta.githubCommitSha;productionAlias='https://clinicos-eosin.vercel.app/';http=$taskFront.StatusCode;bundleUrl=$taskEntryUri;bundleSha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($taskBundle.Content))).ToLower();parameterChunks=$taskChunks};
    backend=@{changed=$false;retainedApplication='47a4b16c111d9b9bfd0b138991958a8ca8f6c351';retainedDeployment='ed539cb2-224c-4221-8e7a-0f0901039987';healthHttp=$taskHealth.StatusCode;provenance='No417backend/schema/API edits; accepted409retained, no production patient test writes.'}}|ConvertTo-Json -Depth 7
} catch { Write-Output 'Release inspection failed safely; no raw credential/provider exception'; exit 1 }
