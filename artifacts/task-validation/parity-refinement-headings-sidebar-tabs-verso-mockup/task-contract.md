# Task Contract

## Task
- Title: Parity refinement headings sidebar tabs verso mockup
- Slug: parity-refinement-headings-sidebar-tabs-verso-mockup
- Type: refactor
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

Confronto rendering vs `design-mockup.html` (report `parity-analysis/PARITY-DIFF.md`): divari di parità
visiva ad alto impatto — (1) i titoli h1/h2 usano `system-ui` (override in `index.css` `--heading`) invece di
Public Sans, e sono più piccoli/leggeri del mockup; il `<body>` non ha font-family; (2) la sidebar ha label
11/600 (troppo piccole/bold), barra blu a sinistra sull'attivo e raggio 10px, mentre il mockup usa label ~13/400,
solo pastiglia traslucida (niente barra), raggio ~14px; (3) i tab L2 (Panoramica/Clinica/Diario) sono underline
e L3 sono segmenti sbiaditi, mentre il mockup usa pill blu piene sull'attivo.

## Expected Behaviour

Solo CSS. (1) Titoli in Public Sans, dimensione/peso vicini al mockup (titolo pagina ~28px/800); body con
`--font-ui`. (2) Sidebar: label ~13/400, rimossa la barra blu, raggio 14, attivo = pastiglia traslucida.
(3) Tab L2/L3: attivo pill blu piena testo bianco, inattivo muted. Deviazione consapevole dal nav-contract
CLAUDE.md (underline L2 / segmented L3) per combaciare col mockup richiesto dall'utente. Rosso solo alert clinici.

## Acceptance Criteria

- AC1: h1/h2 e titolo pagina in Public Sans; titolo pagina ~28px/800; body font-family `--font-ui`.
- AC2: sidebar label ~13px/400-500, nessuna barra blu sull'attivo, raggio item ~14px, attivo = pastiglia traslucida.
- AC3: tab L2 e L3: attivo = pill blu piena testo bianco; inattivo muted; coerenti su scheda paziente.
- AC4: `cd frontend && npm run build` verde; screenshot dashboard + scheda paziente che mostrano l'avvicinamento al mockup.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Solo CSS |
| Integration | no | |
| API | no | Backend non toccato |
| Playwright | yes | Screenshot dashboard + scheda paziente (nav/tab/heading) vs mockup |
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
