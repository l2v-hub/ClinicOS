# Phase 5 — synthetic Italian speech fixtures for the voice tests (Windows only).
# Voice: the it-IT system voice (e.g. "Microsoft Elsa Desktop"), 16 kHz mono PCM16 WAV.
# Synthetic phrases only: no real patient data. Non-speech fixtures (silence, noise) are made by
# scripts/voice/make-fixtures.py, which also pads every speech file with leading/trailing silence.
#
#   powershell -ExecutionPolicy Bypass -File scripts/voice/make-fixtures.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$out = Join-Path $PSScriptRoot 'fixtures/raw'
New-Item -ItemType Directory -Force -Path $out | Out-Null

$phrases = [ordered]@{
  'read-overview'      = 'Dimmi tutto su questo ospite.'
  'vitals-120-80'      = 'Registra pressione centoventi su ottanta per questo ospite.'
  'vitals-140-90'      = 'Registra pressione centoquaranta su novanta per questo ospite.'
  'conferma'           = 'Conferma.'
  'ambiguous-ferri'    = 'Registra pressione centotrenta su ottanta per Ferri.'
  'out-of-scope'       = 'Registra pressione centoventi su ottanta per Esposito.'
  'prescribe'          = 'Prescrivi paracetamolo mille milligrammi, una compressa per bocca alle otto e alle venti, per questo ospite.'
  'administration'     = 'Registra una somministrazione per questo ospite.'
}

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'it-IT' } | Select-Object -First 1
if (-not $voice) { throw 'No it-IT voice installed' }
$synth.SelectVoice($voice.VoiceInfo.Name)
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
foreach ($name in $phrases.Keys) {
  $synth.SetOutputToWaveFile((Join-Path $out "$name.wav"), $format)
  $synth.Speak($phrases[$name])
}
$synth.SetOutputToNull()
$synth.Dispose()
Write-Output "voice: $($voice.VoiceInfo.Name) -> $out"
