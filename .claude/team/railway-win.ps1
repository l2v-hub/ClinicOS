param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$RailwayArgs
)

Set-Location "C:\Workspace\DG_SE_DEV\ClinicOS"

& railway @RailwayArgs

exit $LASTEXITCODE
