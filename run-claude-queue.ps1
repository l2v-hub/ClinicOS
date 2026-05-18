$ErrorActionPreference = "Stop"

$prompts = @(
  ".claude/queue/01-cartella-clinica-base.md"
 
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

}