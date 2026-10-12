# Task Contract

## Task
- Title: 448 barra schede cartella a posizione fissa
- Slug: 448-barra-schede-cartella-a-posizione-fissa
- Type: change
- Date: 2026-10-12

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

Issue #448: nella cartella paziente il controllo globale «Chiudi/Apri tutte le sezioni» (WidgetGroup in App.tsx) compare sopra la testata solo nelle schede con più widget (Panoramica, Clinica), quindi la barra delle schede sta a y≈104 px lì e a y≈67 px in Terapia/Moduli. Tocchi ripetuti finiscono sulla scheda sbagliata.

## Expected Behaviour

Nella cartella paziente (navKey dettaglio-paziente) il controllo globale non viene renderizzato: ogni sezione mantiene il proprio toggle. La barra schede ha la stessa posizione verticale in tutte le schede. Le altre pagine mantengono il controllo.

## Acceptance Criteria

- AC1: la posizione verticale della barra schede è identica (±1 px) in tutte le schede della cartella, misurata con Playwright a 1180×820 e 768×1024.
- AC2: nessun elemento sopra la barra compare o scompare cambiando scheda (nessun .widget-group-controls sopra la barra).
- AC3: fuori dalla cartella il controllo «Apri/Chiudi tutte le sezioni» continua a funzionare; tsc + npm run build + test unit verdi.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | test WidgetGroup controls=false |
| Integration | no | |
| API | no | |
| Playwright | yes | misura y barra schede su tutte le schede, 2 viewport |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

Perdita del comando «chiudi tutte» nella cartella: accettato dalla issue («oppure sparisce»); i toggle per sezione restano.

## Gate Status

READY FOR IMPLEMENTATION
