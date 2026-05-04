$ErrorActionPreference = "Stop"

$prompts = @(
  ".claude/queue/02-presa-in-carico-documenti.md",
  ".claude/queue/03-diario-parametri-terapie.md",
  ".claude/queue/04-moduli-avanzati.md",
  ".claude/queue/05-Contenzioni.md",
  ".claude/queue/06-Scala Braden.md",
  ".claude/queue/07-Dario Infermieristico.md",
  ".claude/queue/08-Parametri Vitali.md",
  ".claude/queue/09-Terapia Medica.md",
  ".claude/queue/10-Finale.md"
)

foreach ($promptFile in $prompts) {
  Write-Host ""
  Write-Host "================================================="
  Write-Host "Running Claude task file: $promptFile"
  Write-Host "================================================="

  if (-not (Test-Path $promptFile)) {
    Write-Host "File prompt non trovato: $promptFile" -ForegroundColor Red
    break
  }

  # Converte eventuali backslash Windows in slash WSL
  $wslPromptFile = $promptFile -replace "\\", "/"

  # Avvia lo swarm interattivo passando il file prompt.
  # Lo script resta aperto finché tu non fai detach/exit da tmux.
  wsl --cd /mnt/c/Workspace/DG_SE_DEV/ClinicOS bash -lc ".claude/team/start-team-interactive.sh --file '$wslPromptFile'"

  Write-Host ""
  Write-Host "Claude team session ended/detached. Running build..." -ForegroundColor Cyan

  npm run build

  Write-Host ""
  Write-Host "Git status:" -ForegroundColor Cyan
  git status

  git add .

  $phaseName = [System.IO.Path]::GetFileNameWithoutExtension($promptFile)
  git commit -m "Claude phase: $phaseName" --allow-empty

  $answer = Read-Host "Continue with next phase? Type YES to continue"
  if ($answer -ne "YES") {
    Write-Host "Stopped by user."
    break
  }
}