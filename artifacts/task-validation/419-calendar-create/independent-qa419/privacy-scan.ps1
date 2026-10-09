$ErrorActionPreference = 'Stop'
$qaRoot = (Resolve-Path -LiteralPath 'artifacts/task-validation/419-calendar-create/independent-qa419').Path
$settings = Get-Content -LiteralPath 'C:/Workspace/ClinicOSHouse/.claude/settings.local.json' -Raw | ConvertFrom-Json
$needles = @($settings.env.PSObject.Properties | Where-Object { $_.Name -match '(TOKEN|SECRET|KEY|PASSWORD|CONNECTION)' -and $_.Value -is [string] -and $_.Value.Length -ge 12 } | ForEach-Object Value | Sort-Object -Unique)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$violations = [System.Collections.Generic.List[string]]::new()
$fileCount = 0; $zipEntries = 0; $checks = 0
function Check-Bytes([byte[]]$content, [string]$label) {
  $decoded = [System.Text.Encoding]::UTF8.GetString($content)
  foreach ($needle in $needles) { $script:checks++; if ($decoded.Contains($needle)) { $violations.Add($label + ': configured credential') } }
  if ($decoded -match '(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{50,}|sk-proj-[A-Za-z0-9_-]{40,}|AKIA[0-9A-Z]{16})') { $violations.Add($label + ': known secret format') }
}
foreach ($file in Get-ChildItem -LiteralPath $qaRoot -File -Recurse) {
  if ($file.FullName.StartsWith((Join-Path $qaRoot 'runtime-cache') + [IO.Path]::DirectorySeparatorChar)) { continue }
  $fileCount++; Check-Bytes ([IO.File]::ReadAllBytes($file.FullName)) ($file.Name)
  if ($file.Extension -eq '.zip') {
    $archive = [IO.Compression.ZipFile]::OpenRead($file.FullName)
    try { foreach ($entry in $archive.Entries) {
      if ($entry.Name -eq '') { continue }; $zipEntries++
      $inputStream = $entry.Open(); $buffer = [IO.MemoryStream]::new()
      try { $inputStream.CopyTo($buffer); Check-Bytes ($buffer.ToArray()) ($file.Name + ':' + $entry.FullName) }
      finally { $inputStream.Dispose(); $buffer.Dispose() }
    }} finally { $archive.Dispose() }
  }
}
$receipt = [ordered]@{ checkedAt = [DateTime]::UtcNow.ToString('o'); files = $fileCount; expandedZipEntries = $zipEntries; configuredCredentials = $needles.Count; actualCredentialChecks = $checks; findings = $violations.Count; productionPatientMutations = 0; limitations = 'Synthetic fixtures reviewed. No claim of comprehensive pre-existing repository PHI audit.' }
if ($violations.Count -gt 0) { throw ('Independent QA artifacts unsafe; findings count ' + $violations.Count) }
$receipt | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $qaRoot 'privacy-scan-receipt.json') -Encoding utf8
$receipt | ConvertTo-Json -Compress
