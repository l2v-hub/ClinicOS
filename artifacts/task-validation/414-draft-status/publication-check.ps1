$ErrorActionPreference='Stop'
$taskRoot='artifacts/task-validation/414-draft-status/'
$taskEnv=(Get-Content -Raw -LiteralPath 'C:/Workspace/ClinicOSHouse/.claude/settings.local.json'|ConvertFrom-Json).env
$taskSecrets=@($taskEnv.psobject.Properties|Where-Object { $_.Name -match 'TOKEN|KEY|SECRET|PASSWORD' -and $_.Value -is [string] -and $_.Value.Length -ge 8 }|ForEach-Object {$_.Value}|Sort-Object -Unique)
$taskPaths=@(git ls-files -- $taskRoot | Sort-Object -Unique)
$taskRows=@();$taskChecks=0;$taskZipEntries=0
function Read-TaskGitBytes([string]$taskPath) {
 $taskInfo=[Diagnostics.ProcessStartInfo]::new('git');$taskInfo.ArgumentList.Add('show');$taskInfo.ArgumentList.Add(':'+$taskPath);$taskInfo.RedirectStandardOutput=$true;$taskInfo.RedirectStandardError=$true;$taskInfo.UseShellExecute=$false;$taskInfo.CreateNoWindow=$true
 $taskProcess=[Diagnostics.Process]::Start($taskInfo);$taskStream=[IO.MemoryStream]::new();$taskProcess.StandardOutput.BaseStream.CopyTo($taskStream);$taskProcess.WaitForExit()
 if($taskProcess.ExitCode -ne 0){throw 'Staged artifact unavailable'}
 $taskBytes=$taskStream.ToArray();$taskStream.Dispose();$taskProcess.Dispose();return ,$taskBytes
}
function Test-TaskSecrets([byte[]]$taskBytes) {
 $taskText=[Text.Encoding]::UTF8.GetString($taskBytes)
 foreach($taskSecret in $taskSecrets){$script:taskChecks++;if($taskText.Contains($taskSecret)){throw 'Credential detected; publication prohibited (no secret output)'}}
}
foreach($taskPath in $taskPaths){
 if($taskPath.EndsWith('publication-manifest.json')){continue}
 $taskLocal=[IO.File]::ReadAllBytes((Join-Path (Get-Location) $taskPath));$taskGit=Read-TaskGitBytes $taskPath
 $taskLocalHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskLocal)).ToLower();$taskGitHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskGit)).ToLower()
 $taskNormalization='none'
 if($taskLocalHash -ne $taskGitHash){
  if($taskPath -match '\.(png|jpe?g|zip|webm|pdf)$'){throw 'Binary evidence drift'}
  $taskNormalized=[Text.Encoding]::UTF8.GetBytes([Text.Encoding]::UTF8.GetString($taskLocal).Replace("`r`n","`n"))
  if([Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskNormalized)).ToLower() -ne $taskGitHash){throw 'Substantive evidence drift'}
  $taskNormalization='CRLF to LF only'
 }
 Test-TaskSecrets $taskGit
 if($taskPath.EndsWith('.zip')){
  $taskMemory=[IO.MemoryStream]::new($taskGit,$false);$taskZip=[IO.Compression.ZipArchive]::new($taskMemory,[IO.Compression.ZipArchiveMode]::Read)
  foreach($taskEntry in $taskZip.Entries){
   if($taskEntry.Length -gt 100000000){throw 'Unbounded archive member'}
   $taskMember=[IO.MemoryStream]::new();$taskEntry.Open().CopyTo($taskMember);Test-TaskSecrets $taskMember.ToArray();$taskMember.Dispose();$taskZipEntries++
  }
  $taskZip.Dispose();$taskMemory.Dispose()
 }
 $taskRows+=@{path=$taskPath;sha256=$taskLocalHash;gitBlobSha256=$taskGitHash;exportNormalization=$taskNormalization}
}
$taskReceipt=Get-Content -Raw ($taskRoot+'root-initial/source-receipt.json')|ConvertFrom-Json
$taskQa=Get-Content -Raw ($taskRoot+'independent-qa414/immutable-manifest.json')|ConvertFrom-Json
foreach($taskQaFile in $taskQa.files){
 $taskExpected=$taskRoot+'independent-qa414/'+$taskQaFile.path
 $taskFound=@($taskRows|Where-Object {$_.path -eq $taskExpected})
 if($taskFound.Count -ne 1 -or $taskFound[0].sha256 -ne $taskQaFile.sha256){throw 'Independent immutable proof missing or changed'}
}
@{applicationCommit=$taskReceipt.applicationCommit;applicationSourceSha256=$taskReceipt.sourceSha256;decision='SOURCE-BOUND SYNTHETIC PROOF';secretChecks=$taskChecks;zipEntriesChecked=$taskZipEntries;files=$taskRows;originalIndependentManifestFrozen=$true;productionPatientTestMutations=0;exportPolicy='Independent local manifest immutable; each canonical staged Git blob separately verified, only CRLF to LF normalization allowed.';excluded=@('primary dirty checkout and launchers','unreleased405/408/410 source','original patient audit photos','failed development runs preserved locally not public proof')}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath ($taskRoot+'publication-manifest.json') -Encoding utf8
[pscustomobject]@{artifacts=$taskRows.Count;secretChecks=$taskChecks;zipEntries=$taskZipEntries}|ConvertTo-Json
