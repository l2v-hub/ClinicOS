# Task Contract

## Task
- Title: Scheda paziente header card e diario a card markup
- Slug: scheda-paziente-header-card-e-diario-a-card-markup
- Type: feature
- Date: 2026-07-18

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

I due item della scheda paziente non ottenibili in puro CSS (approvati dall'utente per micro-deroga
presentazionale JSX): (1) `PatientCompactHeader` è una riga di testo compatta senza avatar/bottoni;
(2) `DiarioPazienteTab` rende le voci come `<table>` (ClinicalTable), non card per-ruolo.

## Expected Behaviour

(1) Header card come da mockup `design-mockup.html`: avatar 56×56 iniziali (--indigo-bg/--blue),
nome 24/800, badge stato/allergie, riga meta muted (MRN mono, età·sesso, camera/letto, stato ricovero),
bottoni "Stampa scheda" (neutro) e "Invio in PS" (--red). (2) Diario a card: ogni voce card bianca r15
con border-left 4px colore-ruolo (Medico --blue, Infermiere --purple, OSS --emerald, Fisio --amber,
Altro neutro), badge ruolo pill, autore/ora muted, testo 14px lh1.55.
Solo presentazione (avatar/card/layout); nessun cambio a dati, fetch, API, o al modello dati.

## Acceptance Criteria

- AC1: Header scheda paziente reso card (avatar 56, nome 24/800, badge, meta muted, bottoni Stampa/Invio-in-PS rosso).
- AC2: Diario reso a card per-voce con border-left colore-ruolo + badge ruolo pill; nessuna tabella scura.
- AC3: Nessun cambio a logica/dati/fetch/API/backend/Prisma; rosso solo per alert clinici; no `!important` ingiustificato.
- AC4: `cd frontend && npm run build` verde; screenshot scheda paziente (Panoramica + Diario) di conferma.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Presentazione |
| Integration | no | |
| API | no | Backend non toccato |
| Playwright | yes | Screenshot header card + Diario a card |
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

<!-- Rischi noti e mitigazioni. -->

## Gate Status

READY FOR IMPLEMENTATION
