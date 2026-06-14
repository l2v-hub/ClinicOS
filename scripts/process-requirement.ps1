param(
    [Parameter(Mandatory = $true)]
    [int]$Issue
)

$ErrorActionPreference = "Stop"

Set-Location "C:\Workspace\DG_SE_DEV\ClinicOS"

New-Item -ItemType Directory -Force ".claude\logs" | Out-Null

$worktreeName = "req-$Issue"
$worktreePath = ".claude\worktrees\$worktreeName"
$logFile = ".claude\logs\REQ-$Issue-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$prompt = "/process-requirement $Issue"

Write-Host "Processing GitHub Issue #$Issue" -ForegroundColor Cyan
Write-Host "Sandbox: $worktreePath" -ForegroundColor Cyan
Write-Host "Log: $logFile" -ForegroundColor Cyan

if (Test-Path $worktreePath) {
    Push-Location $worktreePath

    try {
        claude.exe -p `
          --permission-mode bypassPermissions `
          --output-format stream-json `
          --verbose `
          $prompt 2>&1 |
          Tee-Object -FilePath $logFile
    }
    finally {
        Pop-Location
    }
}
else {
    claude.exe -p `
      --worktree $worktreeName `
      --permission-mode bypassPermissions `
      --output-format stream-json `
      --verbose `
      $prompt 2>&1 |
      Tee-Object -FilePath $logFile
}
