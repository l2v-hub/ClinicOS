# Task Contract

## Task
- Title: Ambiente development isolato ClinicOS
- Slug: development-isolated-20261104
- Type: config
- Date: 2026-11-04

## Impact Classification
| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes |
| Database/Persistence | yes |
| Agnos AI / Chatbot | yes |
| Voice | yes |
| OCR / Import | yes |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour
Accesso Railway ripristinato; progetto dedicato vuoto creato e verificato. La demo resta il baseline. Nessun candidato distribuito.

## Expected Behaviour
Un solo ambiente development persistente, cinque profili passwordless con policy server invariata e tutte le funzioni del baseline. Dati esclusivamente sintetici e storage/credenziali/sessioni isolati. Nessun passaggio alias prima di parita completa.

## Acceptance Criteria
- AC1: source/build/deploy esatti, progetto e unico ambiente dedicati, DB/volume/runtime isolati e ricevute verificate.
- AC2: tutte le 145 decisioni effettive confrontate per cinque ruoli; allow/deny API e UI, reload, logout e revoca provati.
- AC3: pazienti/ingressi/import/OCR/originali/terapie/protocolli/parametri/diari/consegne/agenda/letti/operatori/note/assistant/voice provati con dati sintetici.
- AC4: persistenza dopo reload/nuovo login/riavvio; failure OCR/runtime, validazione, conflitti e accesso negato sul solo candidato.
- AC5: CI, Claude Max autentico quando pertinente, QA finale indipendente e gate protetti prima del rilascio; rollback reversibile senza eliminare ambienti.

## Test Plan
| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Guard configurazione e destinazione |
| Integration | yes | DB/runtime isolati |
| API | yes | Cinque ruoli e famiglie funzionali |
| Playwright | yes | Desktop/mobile per cinque ruoli |
| Persistence after refresh | yes | Documenti e dati persistenti |
| Agnos action registry | yes | Disponibilita e policy azioni |
| Voice simulation | yes | Parita voce |
| OCR/import test | yes | Originali e ripresa errori |
| Security/privacy scan | yes | Segreti e dati sintetici |

## Evidence Plan
- validation-report.md con prove effettive e pass/fail/skip separati.
- Ricevute target/source/build/deploy senza valori segreti.
- Screenshot e tracce sanificate con revisione privacy indipendente.
- Matrice di parita con ciascuna funzione, ruolo, risultato e prova.

## Risks
Il runtime AI demo inventariato non ha deployment attivo. Il runtime production non e un fallback autorizzato. ServiceCreate puo propagare su ambienti dello stesso progetto: usare esclusivamente progetto dedicato. Nessun test storico con DELETE/UPDATE SQL o cambio policy contro demo/DB condiviso. Nessun seed o copia dati storici senza autorita specifica. Nessun riuso dei vecchi budget.

## Gate Status
READY FOR IMPLEMENTATION

