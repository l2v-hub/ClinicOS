param(
  [string]$PromptFile
)

$ErrorActionPreference = "Stop"

Set-Location "C:\Workspace\DG_SE_DEV\ClinicOS"

if ($PromptFile) {
  if (-not (Test-Path $PromptFile)) {
    Write-Host "File prompt non trovato: $PromptFile" -ForegroundColor Red
    exit 1
  }

  $task = Get-Content $PromptFile -Raw
}
else {
  $task = Read-Host "Inserisci il task per Claude Agent Team"
}

$tempFile = ".claude/team/current-task.md"
Set-Content -Path $tempFile -Value $task -Encoding UTF8

Write-Host "Avvio Claude Agent Team in tmux..." -ForegroundColor Cyan

wsl --cd /mnt/c/Workspace/DG_SE_DEV/ClinicOS bash -lc ".claude/team/start-team-interactive.sh --file .claude/team/current-task.md"