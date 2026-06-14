param(
  [string]$RepositoryPath = "C:\Workspace\DG_SE_DEV\ClinicOS"
)

$ErrorActionPreference = "Stop"
Set-Location $RepositoryPath
gh auth status
gh repo view | Out-Null

function Ensure-Label {
  param([string]$Name,[string]$Color,[string]$Description)
  & gh label create $Name `
    --color $Color `
    --description $Description `
    --force |
    Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Host "Label già presente: $Name" -ForegroundColor DarkGray }
}

function New-Req {
  param([string]$ReqId,[string]$Title,[string]$Body,[string[]]$Labels)
  $tmp = Join-Path $env:TEMP ("$ReqId-" + [guid]::NewGuid().ToString("N") + ".md")
  Set-Content -Path $tmp -Value $Body -Encoding UTF8
  $args = @("issue","create","--title","$ReqId $Title","--body-file",$tmp)
  foreach($l in $Labels){ $args += @("--label",$l) }
  $url = & gh @args
  if($LASTEXITCODE -ne 0){ throw "Creazione $ReqId fallita" }
  Remove-Item $tmp -Force
  Write-Host "$ReqId -> $url" -ForegroundColor Green
}

Ensure-Label "clinicos-requirement" "1D76DB" "ClinicOS requirement"
Ensure-Label "priority-critical" "B60205" "Critical blocking priority"
Ensure-Label "priority-high" "D93F0B" "High priority"
Ensure-Label "ai-integration" "6F42C1" "AI/model integration"
Ensure-Label "frontend" "0366D6" "Frontend"
Ensure-Label "backend" "0E8A16" "Backend/API"
Ensure-Label "security" "B60205" "Security and privacy"
Ensure-Label "qa-required" "FBCA04" "Acceptance criteria and tests required"
Ensure-Label "status-ready" "0E8A16" "Ready to be processed"

$closing = @'

## Regola di chiusura comune

Processare il REQ in branch/worktree isolato. Eseguire l'app in sandbox, creare acceptance matrix, test automatici e funzionali, `npm run build`, screenshot desktop/tablet della UI che dimostra il comportamento, commit con prefisso REQ, push, preview deploy e commento finale con commit, test, deploy e screenshot. Chiudere solo con tutti i criteri PASS.

Non inserire API key, documenti sanitari, nomi reali o dati identificativi in codice, log, screenshot, issue o commit.
'@

$req013 = @'
# REQ-013 — Configurare provider AI, modello e segreti senza hardcoding

## Obiettivo
Creare una configurazione backend e un adapter provider-neutral per il flusso "Importa lettera di dimissioni".

## Requisiti
- Usare SDK Google GenAI lato backend.
- Variabili server-side:
  - `AI_PROVIDER=google`
  - `AI_MODEL=gemma-4-31b-it`
  - `GEMINI_API_KEY`
  - `AI_EXTRACTION_SCHEMA_PATH`
  - `AI_EXTRACTION_PROMPT_PATH`
  - `AI_TIMEOUT_MS`
  - `AI_MAX_RETRIES`
  - `AI_MAX_FILES`
  - `AI_MAX_TOTAL_MB`
- Interfaccia `AiExtractionProvider`.
- Implementazione `GoogleGemmaExtractionProvider`.
- Validazione configurazione all'avvio.
- `.env.example` senza segreti.
- Nessuna chiave nel frontend, in variabili `VITE_*`, nel repository o nei log.
- Modello/provider sostituibili senza cambiare route e UI.
- Timeout, retry e logging sicuro.

## Acceptance criteria
- [ ] Provider e modello sono configurabili via environment.
- [ ] La chiave è usata solo dal backend.
- [ ] Il bundle frontend non contiene la chiave.
- [ ] Cambiando `AI_MODEL` cambia il modello senza modifica al frontend.
- [ ] Configurazione mancante produce errore controllato.
- [ ] Log privi di segreti e contenuto completo dei documenti.

## Test
- [ ] Config valida/assente.
- [ ] Modello non disponibile.
- [ ] Timeout/retry.
- [ ] Secret scan repository e bundle.
- [ ] Build backend/frontend.
- [ ] Screenshot UI servizio disponibile/non disponibile.

## Commit
`REQ-013: configure AI provider model and secrets`

'@ + $closing

New-Req -ReqId "REQ-013" -Title "Configurare provider AI modello e segreti senza hardcoding" -Body $req013 -Labels @("clinicos-requirement","priority-critical","ai-integration","backend","security","qa-required","status-ready")

$req014 = @'
# REQ-014 — Backend upload multiplo e job di estrazione documentale

## Dipendenze
REQ-013 e UX già definita in REQ-008.

## Obiettivo
Ricevere più documenti/foto, validarli, conservarli temporaneamente e gestire l'estrazione come job.

## Requisiti
- Endpoint multipart per job di import.
- Upload multiplo.
- Tipi ammessi configurabili: PDF, DOC/DOCX, TXT, JPG/JPEG, PNG, WEBP; TIFF/HEIC solo se supportati.
- Validazione MIME reale, estensione, dimensione per file e totale.
- Hash SHA-256 e deduplica.
- Stati: `uploaded`, `validating`, `processing`, `review_ready`, `failed`, `expired`, `confirmed`.
- Endpoint stato, rimozione file, annullamento e risultato.
- Storage temporaneo con retention/cleanup.
- Idempotency key.
- Nessuna creazione paziente durante upload.
- Immagini inviate come immagini.
- PDF usato direttamente se il provider lo supporta, altrimenti estrazione testo/render pagine.
- DOC/DOCX convertito in testo normalizzato.

## Acceptance criteria
- [ ] Più file nello stesso job.
- [ ] File non ammessi rifiutati senza perdere i validi.
- [ ] Stato e avanzamento consultabili.
- [ ] Duplicati rilevati.
- [ ] Annullamento e cleanup funzionanti.
- [ ] Nessun dato paziente scritto.

## Test
- [ ] PDF singolo.
- [ ] PDF + immagini.
- [ ] DOCX.
- [ ] ZIP/EXE rifiutati.
- [ ] Limiti file/dimensione.
- [ ] Duplicato.
- [ ] Screenshot lista file e avanzamento.

## Commit
`REQ-014: add multi-file document import jobs`

'@ + $closing

New-Req -ReqId "REQ-014" -Title "Creare backend upload multiplo e job di estrazione documentale" -Body $req014 -Labels @("clinicos-requirement","priority-high","ai-integration","backend","qa-required","status-ready")

$req015 = @'
# REQ-015 — Integrazione Gemma e output strutturato ClinicOS

## Dipendenze
REQ-013 e REQ-014.

## Obiettivo
Inviare i documenti del job al modello configurato e ottenere JSON validato secondo lo schema ClinicOS.

## Requisiti
- Versionare nel backend schema JSON e prompt italiano già predisposti.
- Caricare schema e prompt da path configurabili.
- Versionare schema e prompt.
- Inviare tutti i file validi.
- Capability probe per immagini, documenti e structured output.
- Non assumere che ogni modello supporti response schema.
- Se `gemma-4-31b-it` non accetta lo schema:
  - JSON rigoroso;
  - validazione server-side;
  - retry di correzione configurabile;
  - oppure `AI_STRUCTURED_MODEL` separato e configurabile.
- Validazione AJV/Zod.
- Risultato con modello, versione schema/prompt, job id, warning ed errori.
- Dati mancanti non inventati.
- Date/orari normalizzati quando possibile.
- Raw response solo temporanea e mai nei log.

## Acceptance criteria
- [ ] Modello scelto da configurazione.
- [ ] Schema ClinicOS usato realmente.
- [ ] Output JSON parseabile e validato.
- [ ] Risposte non conformi rifiutate/corrette entro limite retry.
- [ ] Modello sostituibile senza modifica UI.
- [ ] Nessuna diagnosi o dato inventato.
- [ ] Errori provider/schema distinguibili.

## Test
- [ ] Documento sintetico completo.
- [ ] Campi mancanti.
- [ ] Foto documento.
- [ ] Multi-documento.
- [ ] JSON invalido.
- [ ] Modello incompatibile.
- [ ] Timeout/retry.
- [ ] Screenshot fase Elaborazione e risultato.

## Commit
`REQ-015: integrate configurable Gemma structured extraction`

'@ + $closing

New-Req -ReqId "REQ-015" -Title "Integrare Gemma per estrazione strutturata ClinicOS" -Body $req015 -Labels @("clinicos-requirement","priority-critical","ai-integration","backend","qa-required","status-ready")

$req016 = @'
# REQ-016 — Merge multi-documento con provenienza e conflitti

## Dipendenza
REQ-015.

## Obiettivo
Unire risultati di più documenti senza perdere fonti e senza scegliere silenziosamente valori conflittuali.

## Requisiti
- Merge deterministico per documento.
- Deduplica diagnosi, allergie, farmaci, terapie, note e parametri.
- Regole temporali configurabili.
- Conflitti espliciti.
- Provenienza per campo/elemento: file, pagina/sezione se disponibile, estratto sintetico, data documento e modello.
- Stati: `extracted`, `missing`, `conflict`, `low_confidence`, `manually_confirmed`.
- Report campi compilabili, mancanti, conflittuali e duplicati.
- Nessun valore conflittuale sovrascritto automaticamente.

## Acceptance criteria
- [ ] Proposta unica da più documenti.
- [ ] Nessun duplicato identico.
- [ ] Conflitti visibili.
- [ ] Ogni dato mantiene la fonte.
- [ ] L'utente può scegliere il valore corretto.

## Test
- [ ] Documenti identici.
- [ ] Indirizzi diversi.
- [ ] Terapie duplicate/aggiornate.
- [ ] Allergia in un solo documento.
- [ ] Screenshot conflitto e provenienza.

## Commit
`REQ-016: merge multi-document extraction with provenance`

'@ + $closing

New-Req -ReqId "REQ-016" -Title "Unire dati da documenti multipli con provenienza e conflitti" -Body $req016 -Labels @("clinicos-requirement","priority-high","ai-integration","backend","qa-required","status-ready")

$req017 = @'
# REQ-017 — Revisione e precompilazione del form Nuovo Paziente

## Dipendenze
REQ-008, REQ-015 e REQ-016.

## Obiettivo
Precompilare i tab Anagrafica, Ingresso, Assegnazione, Note e Documenti senza salvataggio automatico.

## Requisiti
- Step Caricamento, Elaborazione, Revisione nella stessa popup padre.
- Mapping esplicito schema -> form ClinicOS.
- Evidenziare campi estratti, mancanti, conflittuali e modificati manualmente.
- Fonte consultabile.
- Modifica manuale di ogni campo.
- Accettazione/rifiuto per campo o sezione.
- Validazione campi obbligatori.
- Documenti mantenuti nel tab Documenti.
- Riepilogo campi compilati/mancanti/warning/conflitti.
- In caso di errore AI, compilazione manuale senza perdere file.
- Nessun record creato prima di "Crea paziente".

## Acceptance criteria
- [ ] Form precompilato.
- [ ] Tutti i campi modificabili.
- [ ] Nessun dato inventato nei campi mancanti.
- [ ] Conflitti richiedono scelta.
- [ ] Fonte consultabile.
- [ ] Documenti collegati alla procedura.
- [ ] Desktop e tablet corretti.

## Test
- [ ] Anagrafica/Ingresso/Assegnazione.
- [ ] Diagnosi, allergie, farmaci.
- [ ] Campo obbligatorio mancante.
- [ ] Conflitto.
- [ ] Modifica manuale.
- [ ] Screenshot Caricamento, Elaborazione e Revisione.

## Commit
`REQ-017: prefill new patient form from reviewed extraction`

'@ + $closing

New-Req -ReqId "REQ-017" -Title "Precompilare il form Nuovo Paziente con revisione umana" -Body $req017 -Labels @("clinicos-requirement","priority-high","ai-integration","frontend","backend","qa-required","status-ready")

$req018 = @'
# REQ-018 — Persistenza transazionale e idempotente del paziente importato

## Dipendenza
REQ-017.

## Obiettivo
Creare paziente e dati correlati solo dopo revisione e conferma, evitando duplicati e salvataggi parziali.

## Requisiti
- Endpoint di conferma job.
- Validazione server-side.
- Rilevamento duplicati per codice fiscale e combinazione nome/cognome/data nascita.
- Conferma esplicita su possibile duplicato.
- Transazione per paziente, cartella/presa in carico, diagnosi, allergie, farmaci/terapie, parametri, note e documenti.
- Riutilizzare domain service/API esistenti.
- Idempotency key.
- Rollback completo.
- Job `confirmed` solo dopo commit.
- Audit tra job, paziente e documenti.
- Nessun accesso diretto del modello al DB.

## Acceptance criteria
- [ ] Creazione solo dopo conferma.
- [ ] Doppia conferma non duplica.
- [ ] Errore intermedio fa rollback.
- [ ] Dati correlati associati correttamente.
- [ ] Documenti collegati.
- [ ] Duplicati segnalati.
- [ ] Refresh mostra dati persistiti.

## Test
- [ ] Creazione completa sintetica.
- [ ] Doppio click.
- [ ] Errore a metà transazione.
- [ ] Possibile duplicato.
- [ ] Refresh.
- [ ] Screenshot paziente creato.

## Commit
`REQ-018: persist reviewed patient import transactionally`

'@ + $closing

New-Req -ReqId "REQ-018" -Title "Creare il paziente e i dati correlati in modo transazionale" -Body $req018 -Labels @("clinicos-requirement","priority-critical","ai-integration","backend","qa-required","status-ready")

$req019 = @'
# REQ-019 — Sicurezza, privacy, audit e retention del flusso AI

## Dipendenze
REQ-013, REQ-014 e REQ-018.

## Obiettivo
Proteggere documenti sanitari, segreti e operazioni del flusso.

## Requisiti
- Autenticazione/autorizzazione e ruoli.
- Audit di upload, hash file, modello/schema, conferma e paziente creato.
- Nessun contenuto clinico completo nei log.
- Masking dati sensibili negli errori.
- Storage temporaneo protetto e retention configurabile.
- Eliminazione provider quando supportata.
- Cancellazione manuale job.
- Rate limit, limiti file, timeout e cost guard.
- MIME sniffing, filename sanitizzato, antivirus hook se disponibile, nessuna esecuzione file.
- Segreti solo Railway/secret manager.
- Documentazione privacy/DPA prima di dati reali.
- Test solo con documenti sintetici.

## Acceptance criteria
- [ ] Solo utenti autorizzati importano.
- [ ] Audit completo.
- [ ] Nessun dato clinico completo nei log.
- [ ] Cleanup temporaneo.
- [ ] Nessun segreto nel repository.
- [ ] Upload malevoli rifiutati.
- [ ] Rate limit/limiti attivi.
- [ ] Documentazione operativa disponibile.

## Test
- [ ] Utente non autorizzato.
- [ ] MIME contraffatto.
- [ ] Filename malevolo.
- [ ] Retention/cleanup.
- [ ] Audit end-to-end.
- [ ] Secret scan.
- [ ] Screenshot errore sicuro.

## Commit
`REQ-019: secure and audit AI document import`

'@ + $closing

New-Req -ReqId "REQ-019" -Title "Proteggere dati sanitari audit e ciclo di vita documenti AI" -Body $req019 -Labels @("clinicos-requirement","priority-critical","ai-integration","backend","security","qa-required","status-ready")

$req020 = @'
# REQ-020 — Test end-to-end, sandbox, screenshot e deployment gate

## Dipendenze
REQ-013 fino a REQ-019.

## Obiettivo
Certificare l'intero flusso in sandbox prima della produzione.

## Requisiti
- Fixture sintetiche: PDF, JPG, conflitto, documento incompleto e file non ammesso.
- Provider mock per CI.
- Test real-provider separato con secret protetto.
- Playwright end-to-end: Nuovo paziente -> upload multiplo -> estrazione -> revisione -> modifica -> conferma -> paziente creato.
- Screenshot: upload, elaborazione, revisione, conflitto, form precompilato e paziente creato.
- Viewport 1366x768 e 1024x768.
- GitHub Action: secret scan, test, build, mock E2E e artefatti screenshot.
- Preview deploy prima del merge.
- Smoke test produzione.
- Cost guard e massimo retry/timeout.
- Nessuna chiave o dato sanitario reale negli artefatti.

## Acceptance criteria
- [ ] Happy path completo passa.
- [ ] Nessun dato sanitario reale.
- [ ] CI deterministica con mock.
- [ ] Test real-provider protetto.
- [ ] Screenshot prodotti.
- [ ] Preview e produzione superano smoke test.
- [ ] Paziente sintetico contiene i dati attesi.
- [ ] Nessuna chiave negli artefatti.

## Test
- [ ] Happy path multi-file.
- [ ] Documento incompleto.
- [ ] Conflitto.
- [ ] File invalido.
- [ ] Timeout provider.
- [ ] JSON non conforme.
- [ ] Duplicato e rollback.
- [ ] Desktop/tablet.
- [ ] Preview/produzione.

## Commit
`REQ-020: add end-to-end AI import quality gate`

'@ + $closing

New-Req -ReqId "REQ-020" -Title "Certificare end-to-end importazione con sandbox screenshot e gate" -Body $req020 -Labels @("clinicos-requirement","priority-critical","ai-integration","frontend","backend","security","qa-required","status-ready")

Write-Host "`nVerifica con:" -ForegroundColor Cyan
Write-Host 'gh issue list --label "clinicos-requirement" --state open --limit 100' -ForegroundColor Yellow
