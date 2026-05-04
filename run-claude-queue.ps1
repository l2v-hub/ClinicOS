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
  Write-Host "Running Claude prompt: $promptFile"
  Write-Host "================================================="

  if (-not (Test-Path $promptFile)) {
    Write-Host "File prompt non trovato: $promptFile" -ForegroundColor Red
    break
  }

  $phaseName = [System.IO.Path]::GetFileNameWithoutExtension($promptFile)
  $logDir = ".claude\logs"
  $logFile = "$logDir\$phaseName.log"

  New-Item -ItemType Directory -Force -Path $logDir | Out-Null

  $prompt = Get-Content $promptFile -Raw

claude.exe -p "$prompt" `
  --allowedTools "Read,Edit,Write,Glob,Grep,Bash(npm run build),Bash(git diff),Bash(git status)" `
  --output-format text `
  --verbose 2>&1 | Tee-Object -FilePath $logFile
  
  Write-Host ""
  Write-Host "Claude log saved to: $logFile" -ForegroundColor Cyan

  npm run build

  git status
  git add .
  git commit -m "Claude phase: $phaseName" --allow-empty

  $answer = Read-Host "Continue with next phase? Type YES to continue"
  if ($answer -ne "YES") {
    Write-Host "Stopped by user."
    break
  }
}