# Task Contract

## Task
- Title: Restyle batch lista pazienti scheda paziente consegne
- Slug: restyle-batch-lista-pazienti-scheda-paziente-consegne
- Type: refactor
- Date: 2026-07-17

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

Batch restyle 3 schermate verso mockup `design_handoff_restyle/ClinicOS RSA.html`:
Lista pazienti, Scheda paziente (Panoramica/Clinica/Diario), Consegne. Divergenze:
header tabella/sezione scuri, card piatte, spaziature/pesi non allineati, Diario a tabella
invece che a card, righe troppo alte, avatar/badge da rifinire.

## Expected Behaviour

Prevalentemente CSS (`App.css`/`app-additions.css`, token `var(--…)`, rosso solo alert clinici);
dove il mockup richiede elementi assenti (avatar consegna, pastiglie) si applicano **minime deroghe
presentazionali** al markup senza toccare dati/logica/IA/backend/API.
- Lista pazienti: header chiaro, avatar 44 quadrato indigo, badge/mrn/righe a spec, card r18.
- Scheda paziente: header card, banda sicurezza allergie/rischi, header tabelle chiari, Diario a card
  con border-left per ruolo, tab L2 pill, righe dati ingresso compatte, mini-card riepilogo uniformi.
- Consegne: card con border-left 5px per priorità, badge pill colorati, avatar 40, assegnatario su riga
  separata, chip filtro pill, contenuto con max-width di pagina.

## Acceptance Criteria

- AC1 (Lista pazienti): header sezione/colonna chiari (`--surface-raised`, label 12/800 xmuted); avatar `.op-avatar-sm` 44 quadrato `--indigo-bg`/`--blue`; righe 14/24, nome 15/700; badge stato pill 12/800; `.mrn-tag` indigo; card `.table-wrap` r18; chevron `#c2ccda`.
- AC2 (Scheda paziente): header card (avatar 56, nome 24/800, badge, meta muted); banda sicurezza allergie(--red)/rischi(--amber) con border-left 5px; header tabelle/Diario chiari (non navy); Diario a card con border-left per ruolo + chip filtro pill; tab L2 pill; righe dati ingresso compatte; mini-card riepilogo uniformi.
- AC3 (Consegne): `.consegna-card` bordo + border-left 5px priorità (urgente `--red`/alta `--amber`/normale neutro); badge priorità/stato pill colorati; avatar 40; assegnatario su riga separata con `border-top`; chip filtro pill; contenuto con max-width di pagina.
- AC4: rosso solo per alert clinici; nessun `!important` ingiustificato; nessun cambio a logica/dati/backend/API.
- AC5: `cd frontend && npm run build` verde; screenshot delle schermate a conferma.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Solo CSS/presentazione |
| Integration | no | |
| API | no | Backend non toccato |
| Playwright | yes | Screenshot lista pazienti, scheda paziente (Panoramica/Clinica/Diario), consegne |
| Persistence after refresh | no | Nessun dato modificato |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | Nessun dato/secret |

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

<!-- Rischi noti e mitigazioni. -->

## Gate Status

READY FOR IMPLEMENTATION
