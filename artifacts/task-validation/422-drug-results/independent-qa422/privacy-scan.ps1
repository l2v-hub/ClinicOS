$ErrorActionPreference='Stop'
$qaRoot=[IO.Path]::GetFullPath('artifacts/task-validation/422-drug-results/independent-qa422')
$qaConfig=(Get-Content -Raw -LiteralPath 'C:/Workspace/ClinicOSHouse/.claude/settings.local.json'|ConvertFrom-Json).env
$qaSecrets=@($qaConfig.psobject.Properties|Where-Object { $_.Name -match 'TOKEN|KEY|SECRET|PASSWORD|CREDENTIAL|CONNECTION_STRING|DATABASE_URL' -and $_.Value -is [string] -and $_.Value.Length -ge 8 }|ForEach-Object {$_.Value}|Sort-Object -Unique)
$qaChecks=0;$qaMembers=0;$qaFiles=0
function Test-QABytes([byte[]]$qaBytes){
 $qaText=[Text.Encoding]::UTF8.GetString($qaBytes)
 foreach($qaSecret in $qaSecrets){$script:qaChecks++;if($qaText.Contains($qaSecret)){throw 'Credential found; evidence must not publish'}}
}
$qaPaths=@(Get-ChildItem -LiteralPath $qaRoot -Recurse -File|Where-Object {$_.FullName -notmatch '[\\/]runtime-cache[\\/]' -and $_.Name -notin @('immutable-manifest.json','privacy-receipt.json')})
foreach($qaFile in $qaPaths){
 if($qaFile.Length -gt 100000000){throw 'Evidence exceeds bounded scan size'}
 $qaBytes=[IO.File]::ReadAllBytes($qaFile.FullName);Test-QABytes $qaBytes;$qaFiles++
 if($qaFile.Extension -eq '.zip'){
  $qaMemory=[IO.MemoryStream]::new($qaBytes,$false);$qaZip=[IO.Compression.ZipArchive]::new($qaMemory,[IO.Compression.ZipArchiveMode]::Read)
  foreach($qaEntry in $qaZip.Entries){if($qaEntry.Length -gt 100000000){throw 'Archive member exceeds bound'};$qaMember=[IO.MemoryStream]::new();$qaEntry.Open().CopyTo($qaMember);Test-QABytes $qaMember.ToArray();$qaMember.Dispose();$qaMembers++}
  $qaZip.Dispose();$qaMemory.Dispose()
 }
}
@{filesChecked=$qaFiles;zipMembersChecked=$qaMembers;configuredCredentialChecks=$qaChecks;credentialFindings=0;syntheticFixtureSourceReviewed=true;scope='All independent evidence except non-publishable runtime compiler cache; archives expanded in memory, bounded100MB';limitations='No automated general PHI detector claim, no global vulnerability certification, no clinical RCP validity, no hardware/provider/database certification'}|ConvertTo-Json|Set-Content -LiteralPath ($qaRoot+'/privacy-receipt.json') -Encoding utf8
[pscustomobject]@{files=$qaFiles;zipMembers=$qaMembers;credentialChecks=$qaChecks;findings=0}|ConvertTo-Json
