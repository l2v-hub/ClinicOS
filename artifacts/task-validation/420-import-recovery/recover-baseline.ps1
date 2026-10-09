$ErrorActionPreference='Stop'
$taskRoot=(Resolve-Path -LiteralPath 'artifacts/task-validation/420-import-recovery').Path
$taskDestination=Join-Path $taskRoot 'before-run-02/source-from-trace'
if(Test-Path -LiteralPath $taskDestination){throw 'Never overwrite recovered evidence'}
New-Item -ItemType Directory -Path $taskDestination | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskArchive=[IO.Compression.ZipFile]::OpenRead((Join-Path $taskRoot 'before-run-02/trace/before.zip'))
$taskMapping=@{'fixture.mjs'='resources/src@b3fa122a4b6f909e51ed44bde915798bf81b903b.txt';'before.mjs'='resources/src@68a3947d0a544cb115c67076371e27b1a56bf582.txt'}
$taskFiles=@()
try {foreach($taskName in $taskMapping.Keys){
 $taskEntry=$taskArchive.GetEntry($taskMapping[$taskName]);if(!$taskEntry){throw 'Original trace source missing'}
 $taskInput=$taskEntry.Open();$taskOutput=[IO.MemoryStream]::new()
 try {$taskInput.CopyTo($taskOutput);$taskBytes=$taskOutput.ToArray()} finally {$taskInput.Dispose();$taskOutput.Dispose()}
 [IO.File]::WriteAllBytes((Join-Path $taskDestination ($taskName+'.source')),$taskBytes)
 $taskFiles+=@{path=$taskName+'.source';originalZipEntry=$taskEntry.FullName;bytes=$taskBytes.Length;sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskBytes)).ToLower()}
}} finally {$taskArchive.Dispose()}
@{recoveredAt=[DateTime]::UtcNow.ToString('o');source='Original Playwright before-run-02 trace captured recipe bytes during baseline execution';applicationCommit='fa028c11ffe5dbfe514df8110e6ccf7f6b977602';snapshotPolicy='Post-run byte extraction from original immutable trace, not invented pre-run snapshot or current modified fixture copy';files=$taskFiles}|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $taskDestination 'provenance.json') -Encoding utf8
Write-Output 'Original baseline recipe bytes recovered from retained trace; no source mutation'
