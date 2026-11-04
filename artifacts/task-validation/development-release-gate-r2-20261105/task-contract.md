# Task Contract

## Task
- Title: Qualificazione del gate dedicato development ClinicOS
- Slug: development-release-gate-r2-20261105
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
- AC1: target project/environment/services e sourceM sono costanti, separati dalla revisione workflow W; nessun input puo ripuntare demo/production.
- AC2: preflight legge prove canoniche di review/QA/merge e approvazione umana nativa indipendente; non inizializza o cambia il ledger e non eredita un GH_TOKEN divergente.
- AC3: ogni operazione live mutativa fallisce prima di reservation e provider write finche action verifier e atomic effect non sono realmente qualificati; nessun mock e una prova live.
- AC4: test negativi coprono target, source, approvazioni/check, rerun, perdita autorita, concorrenza nota, esiti incerti e credenziali normalizzate; CI nuovo senza credenziali.
- AC5: limiti operativi, revisioni effettive, gate mancanti e assenza di deployment/parita sono espliciti. Questo prerequisito non chiude l'obiettivo completo ambiente development.
## Test Plan
| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Guard configurazione e destinazione |
| Integration | yes | DB/runtime isolati |
| API | yes | Cinque ruoli e famiglie funzionali |
| Playwright | no | Nessuna UI modificata; la futura parita ambiente rimane da eseguire |
| Persistence after refresh | yes | Documenti e dati persistenti |
| Agnos action registry | yes | Disponibilita e policy azioni |
| Voice simulation | no | Nessun runtime distribuito in questo prerequisito |
| OCR/import test | no | Nessun runtime distribuito in questo prerequisito |
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
