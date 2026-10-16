param(
  [ValidateSet('install', 'check', 'remove')][string]$Mode = 'install',
  [string]$Destination = (Join-Path $env:LOCALAPPDATA 'ClinicOS\review-checkout')
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
# Use a separate checkout. Never stash, clean, switch or reset the user's project.
$repository = 'l2v-hub/ClinicOS'
$branch = 'codex/windows-claude-review'
$gh = (Get-Command gh.exe -ErrorAction Stop).Source
$git = (Get-Command git.exe -ErrorAction Stop).Source
$node = (Get-Command node.exe -ErrorAction Stop).Source
if (Test-Path -LiteralPath $Destination) {
  $item = Get-Item -LiteralPath $Destination -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Destination is a redirected path; preserved.' }
  $top = & $git -C $Destination rev-parse --show-toplevel
  if ($LASTEXITCODE -ne 0 -or [IO.Path]::GetFullPath($top.Trim()) -ne [IO.Path]::GetFullPath($Destination)) { throw 'Existing destination is not the dedicated checkout; preserved.' }
  $identity = & $gh repo view $repository --json nameWithOwner --jq .nameWithOwner
  if ($LASTEXITCODE -ne 0 -or $identity.Trim() -ne $repository) { throw 'Repository access unavailable.' }
  $origin = & $git -C $Destination config --get remote.origin.url
  if ($LASTEXITCODE -ne 0 -or $origin.Trim() -notmatch '^(https://github\.com/|git@github\.com:)l2v-hub/ClinicOS(\.git)?$') { throw 'Unexpected checkout origin; preserved.' }
  $changes = & $git -C $Destination status --porcelain
  if ($LASTEXITCODE -ne 0 -or $changes) { throw 'Dedicated checkout has local changes; preserved.' }
  $current = & $git -C $Destination branch --show-current
  if ($LASTEXITCODE -ne 0 -or $current.Trim() -ne $branch) { throw 'Dedicated checkout uses another branch; preserved.' }
  if ($Mode -eq 'install') {
    & $git -C $Destination fetch --quiet --no-tags origin $branch
    if ($LASTEXITCODE -ne 0) { throw 'Fetch failed.' }
    & $git -C $Destination merge --ff-only "origin/$branch"
    if ($LASTEXITCODE -ne 0) { throw 'Fast-forward unavailable; existing commits preserved.' }
    $head = & $git -C $Destination rev-parse HEAD
    $expected = & $git -C $Destination rev-parse "origin/$branch"
    if ($LASTEXITCODE -ne 0 -or $head.Trim() -ne $expected.Trim()) { throw 'Dedicated checkout has local-only commits; preserved.' }
  }
} else {
  if ($Mode -ne 'install') { throw 'Dedicated checkout is absent; nothing changed.' }
  & $gh repo clone $repository $Destination -- --branch $branch --single-branch
  if ($LASTEXITCODE -ne 0) { throw 'Clone failed; original project is untouched.' }
}
$installer = Join-Path $Destination 'scripts\automation\install-claude-review-windows.mjs'
if (-not (Test-Path -LiteralPath $installer)) { throw 'Windows installer is absent; no task installed.' }
if ($Mode -eq 'install') { & $node $installer }
else { & $node $installer "--$Mode" }
if ($LASTEXITCODE -ne 0) { throw 'Review setup blocked; see prerequisite status above.' }
