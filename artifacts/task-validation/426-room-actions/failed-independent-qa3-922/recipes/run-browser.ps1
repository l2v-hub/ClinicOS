$ErrorActionPreference = 'Stop'
$env:APP_URL = 'http://127.0.0.1:7521'
$env:SOURCE_COMMIT = '922a801f5c64cbeff02e2c14298d4dd5a16e622f'
$qaOut = 'artifacts/task-validation/426-room-actions/independent-qa3'
$map = @(
  @{ recipe = 'browser'; output = 'browser01'; cases = 6 },
  @{ recipe = 'supplemental'; output = 'supplemental01'; cases = 5 },
  @{ recipe = 'long-labels'; output = 'long01'; cases = 6 },
  @{ recipe = 'room-headers'; output = 'room-headers01'; cases = 2 },
  @{ recipe = 'delete-header'; output = 'delete-header01'; cases = 1 },
  @{ recipe = 'confirm-bounds'; output = 'confirm-bounds01'; cases = 1 }
)
foreach ($entry in $map) {
  $recipePath = "$qaOut/recipes/$($entry.recipe).mjs"
  $entry.hash = (Get-FileHash -LiteralPath $recipePath -Algorithm SHA256).Hash.ToLowerInvariant()
}
$map | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath "$qaOut/browser-recipes-frozen.json"
foreach ($entry in $map) {
  node "$qaOut/recipes/$($entry.recipe).mjs" "$qaOut/$($entry.output)" *> "$qaOut/$($entry.output).log"
  if ($LASTEXITCODE -ne 0) { throw "Browser recipe $($entry.recipe) failed. Raw failure retained." }
  Write-Output "PASS $($entry.recipe) $($entry.cases) cases"
}
