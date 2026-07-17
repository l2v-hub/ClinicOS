# Task Contract

## Task
- Title: Restyle fix prioritari topbar header stat-card icone
- Slug: restyle-fix-prioritari-topbar-header-stat-card-icone
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

Refresh visivo (Step 1 — FIX PRIORITARI di `design-parity.md`): (1) topbar `.compact-topbar`
quasi vuota (solo icona ricerca a destra, banda bianca); (2) testata sezioni tabella
`.cts__header` (ClinicalTableSection) navy scura `#1A3357`; (3) `.stat-card` con barretta-accento
`border-top` colorata; (4) pulsante Note parametri usa emoji 📝, con altre emoji residue (⏰ scadenze, 👥 empty-state).

## Expected Behaviour

(1) Topbar popolata come da mockup `ClinicOS RSA.html`: a sinistra trigger ricerca globale
(`--surface-raised`, r12, h42, icona + "Cerca paziente, camera, MRN…") che apre l'overlay ricerca
esistente; a destra pill turno/reparto (`--emerald-bg`/`--teal`, dot verde) + blocco utente
(avatar iniziali + nome + ruolo) da `utente` reale. (2) `.cts__header` chiara: `--surface-raised`,
testo `--text`, badge pill `--indigo-bg`/`--indigo`, bordo inferiore `--border`. (3) `.stat-card`
senza barra accento superiore (bordo neutro + ombra; accento solo su value/action). (4) Emoji Note→
`IcoMessage`, ⏰→`IcoClock`, 👥→`IcoUser`. Nessuna modifica a backend/API/logica; markup toccato solo
per topbar shell e swap emoji→icona (deroga esplicita del task). Rosso solo per alert clinici.

## Acceptance Criteria

- AC1: Topbar popolata/coerente col mockup (ricerca a sinistra funzionante via overlay esistente, pill reparto + utente a destra) oppure, in mancanza di dati, banda compressa senza vuoto bianco.
- AC2: `.cts__header` chiara (surface-raised/text/border, badge indigo pill) — niente fondo navy.
- AC3: `.stat-card` senza `border-top` colorato; card = bordo `--border` + `--shadow-card`.
- AC4: Emoji 📝/⏰/👥 sostituite con icone del set (IcoMessage/IcoClock/IcoUser); nessuna emoji residua in quei punti.
- AC5: Sezioni 1–4 di design-parity.md restano applicate; rosso solo per alert clinici; niente `!important` ingiustificato.
- AC6: `cd frontend && npm run build` verde; regressione visiva senza layout rotti; banda allergie e soglie parametri (SpO₂<92 rosso, TC≥37,5 ambra) intatte.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Solo styling/markup presentazione |
| Integration | no | Nessun cambio integrazione |
| API | no | Backend non toccato |
| Playwright | yes | Regressione visiva screen-by-screen + topbar/header/stat-card/icone |
| Persistence after refresh | no | Nessun dato creato/modificato |
| Agnos action registry | no | Non impattato |
| Voice simulation | no | Non impattato |
| OCR/import test | no | Non impattato |
| Security/privacy scan | no | Nessun dato/secret toccato |

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
