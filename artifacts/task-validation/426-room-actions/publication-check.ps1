$ErrorActionPreference='Stop'
$taskRoot='artifacts/task-validation/426-room-actions/'
$taskEnv=(Get-Content -Raw -LiteralPath 'C:/Workspace/ClinicOSHouse/.claude/settings.local.json'|ConvertFrom-Json).env
$taskSecrets=@($taskEnv.psobject.Properties|Where-Object { $_.Name -match 'TOKEN|KEY|SECRET|PASSWORD|CREDENTIAL|CONNECTION_STRING|DATABASE_URL' -and $_.Value -is [string] -and $_.Value.Length -ge 8 }|ForEach-Object {$_.Value}|Sort-Object -Unique)
$taskPaths=@(git ls-files -- $taskRoot | Sort-Object -Unique)
$taskRows=@();$taskChecks=0;$taskZipEntries=0
$taskInfo=[Diagnostics.ProcessStartInfo]::new('git');$taskInfo.ArgumentList.Add('cat-file');$taskInfo.ArgumentList.Add('--batch');$taskInfo.RedirectStandardInput=$true;$taskInfo.RedirectStandardOutput=$true;$taskInfo.RedirectStandardError=$true;$taskInfo.UseShellExecute=$false;$taskInfo.CreateNoWindow=$true
$taskProcess=[Diagnostics.Process]::Start($taskInfo)
function Read-TaskGitBytes([string]$taskPath) {
 $taskProcess.StandardInput.WriteLine(':'+$taskPath);$taskProcess.StandardInput.Flush()
 $taskOutput=$taskProcess.StandardOutput.BaseStream;$taskHeader=[Collections.Generic.List[byte]]::new()
 do {$taskByte=$taskOutput.ReadByte();if($taskByte -lt 0){throw 'Staged artifact stream unavailable'};if($taskByte -ne 10){$taskHeader.Add([byte]$taskByte)}} while($taskByte -ne 10)
 $taskParts=[Text.Encoding]::ASCII.GetString($taskHeader.ToArray()).Split(' ')
 if($taskParts.Count -ne 3 -or $taskParts[1] -ne 'blob'){throw 'Staged artifact unavailable'}
 $taskSize=[int]::Parse($taskParts[2]);if($taskSize -gt 100000000){throw 'Artifact exceeds bounded publication size'}
 $taskBytes=[byte[]]::new($taskSize);$taskOffset=0
 while($taskOffset -lt $taskSize){$taskRead=$taskOutput.Read($taskBytes,$taskOffset,$taskSize-$taskOffset);if($taskRead -le 0){throw 'Truncated canonical blob'};$taskOffset+=$taskRead}
 if($taskOutput.ReadByte() -ne 10){throw 'Canonical blob framing mismatch'}
 return ,$taskBytes
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
  $taskUtf8=[Text.UTF8Encoding]::new($false,$true)
  $taskNormalized=$taskUtf8.GetBytes($taskUtf8.GetString($taskLocal).Replace("`r`n","`n"))
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
$taskProcess.StandardInput.Close();$taskProcess.WaitForExit();if($taskProcess.ExitCode -ne 0){throw 'Canonical stream failed'};$taskProcess.Dispose()
$taskReceipt=Get-Content -Raw ($taskRoot+'release-gate-receipt.json')|ConvertFrom-Json
foreach($taskQaFolder in @('failed-independent-qa-07','failed-independent-qa2-143','failed-independent-qa3-922','independent-qa4')){
$taskQa=Get-Content -Raw ($taskRoot+$taskQaFolder+'/artifact-manifest.json')|ConvertFrom-Json
foreach($taskQaFile in $taskQa.files){
 $taskExpected=$taskRoot+$taskQaFolder+'/'+$taskQaFile.path
 $taskFound=@($taskRows|Where-Object {$_.path -eq $taskExpected})
 if($taskFound.Count -ne 1 -or $taskFound[0].sha256 -ne $taskQaFile.sha256){throw 'Independent immutable proof missing or changed'}
}
}
@{applicationCommit=$taskReceipt.applicationCommit;applicationSourceSha256=$taskReceipt.sourceSha256;decision='SOURCE-BOUND SYNTHETIC PROOF';secretChecks=$taskChecks;zipEntriesChecked=$taskZipEntries;files=$taskRows;originalIndependentManifestFrozen=$true;productionPatientTestMutations=0;exportPolicy='Independent local manifest immutable, including all declared preliminary failures; each canonical staged Git blob separately verified, only CRLF to LF normalization allowed.';excluded=@('primary dirty checkout and launchers','unreleased405/408/410/416 source','original patient audit photos','root development failures retained locally; independent failures included immutably')}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath ($taskRoot+'publication-manifest.json') -Encoding utf8
[pscustomobject]@{artifacts=$taskRows.Count;secretChecks=$taskChecks;zipEntries=$taskZipEntries}|ConvertTo-Json
