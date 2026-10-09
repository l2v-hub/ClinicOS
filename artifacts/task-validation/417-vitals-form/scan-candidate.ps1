$ErrorActionPreference='Stop'
$taskSha='02b4ba89af291186a72e040b868da024bb865164'
$taskEnv=(Get-Content -Raw -LiteralPath 'C:/Workspace/ClinicOSHouse/.claude/settings.local.json'|ConvertFrom-Json).env
$taskSecrets=@($taskEnv.psobject.Properties|Where-Object {$_.Name -match 'TOKEN|KEY|SECRET|PASSWORD|CREDENTIAL|CONNECTION_STRING|DATABASE_URL' -and $_.Value -is [string] -and $_.Value.Length -ge 8}|ForEach-Object {$_.Value}|Sort-Object -Unique)
$taskPaths=@(git diff --name-only 0d7adc361b92c8466655d9ed830d2b87bbd0f419 $taskSha)
if($LASTEXITCODE -ne 0 -or $taskPaths.Count -ne 10){throw 'Candidate path gate failed'}
$taskRows=@();$taskChecks=0
foreach($taskPath in $taskPaths){
 if(-not $taskPath.StartsWith('frontend/src/')){throw 'Unexpected candidate scope'}
 $taskInfo=[Diagnostics.ProcessStartInfo]::new('git');$taskInfo.ArgumentList.Add('show');$taskInfo.ArgumentList.Add($taskSha+':'+$taskPath);$taskInfo.RedirectStandardOutput=$true;$taskInfo.RedirectStandardError=$true;$taskInfo.UseShellExecute=$false;$taskInfo.CreateNoWindow=$true
 $taskProcess=[Diagnostics.Process]::Start($taskInfo);$taskStream=[IO.MemoryStream]::new();$taskProcess.StandardOutput.BaseStream.CopyTo($taskStream);$taskProcess.WaitForExit()
 if($taskProcess.ExitCode -ne 0){throw 'Canonical candidate unavailable'}
 $taskBytes=$taskStream.ToArray();$taskText=[Text.Encoding]::UTF8.GetString($taskBytes)
 foreach($taskSecret in $taskSecrets){$taskChecks++;if($taskText.Contains($taskSecret)){throw 'Configured credential detected; promotion denied without secret output'}}
 $taskRows+=@{path=$taskPath;gitBlobSha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskBytes)).ToLower()};$taskStream.Dispose();$taskProcess.Dispose()
}
@{applicationCommit=$taskSha;decision='CANONICAL CANDIDATE CREDENTIAL SCAN PASS';configuredCredentialChecks=$taskChecks;candidateFiles=$taskRows;productionPatientTestMutations=0}|ConvertTo-Json -Depth 5|Set-Content -LiteralPath 'artifacts/task-validation/417-vitals-form/candidate-secret-receipt.json' -Encoding utf8
[pscustomobject]@{files=$taskRows.Count;checks=$taskChecks;decision='PASS'}|ConvertTo-Json
