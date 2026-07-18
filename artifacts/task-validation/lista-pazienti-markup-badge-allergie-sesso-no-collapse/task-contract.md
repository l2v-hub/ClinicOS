# Task Contract

## Task
- Title: Lista pazienti markup badge allergie sesso no collapse
- Slug: lista-pazienti-markup-badge-allergie-sesso-no-collapse
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

Lista pazienti (`PatientList.tsx`): la tabella/card è avvolta in `ClinicalTableSection` che genera una barra
collassabile "▾ PAZIENTI · N"; il chip "⚠ Allergie" è nella colonna Stato clinico; manca un badge sesso;
il bottone "Nuovo paziente" è piatto. Il mockup vuole tabella sempre aperta, allergie accanto al nome,
badge sesso colorato, CTA ombrata.

## Expected Behaviour

Modifiche a `PatientList.tsx` (solo questo componente) + CSS in App.css/app-additions.css; nessun cambio a
logica dati/fetch/API/altri componenti.
1. Rimosso il wrapper `ClinicalTableSection`: tabella (`.table-wrap--desktop`) e `.pt-card-list` renderizzate
   direttamente, sempre aperte (niente header collassabile).
2. Chip "⚠ Allergie" spostato accanto al nome (`.cell--name` desktop e `.pt-list-card__name` mobile); rimosso
   dalla colonna Stato clinico (che resta stato-pill ricovero + eventuale "Critico").
3. Badge sesso colorato accanto al nome: `.sex-badge--m` azzurro (M), `.sex-badge--f` rosa (F).
4. `.btn-primary` con `box-shadow` blu + hover; "Importa dimissione" resta outline/piatto.
5. Rifiniture tabella (già a spec): header `--surface-raised`, avatar 44 quadrato indigo, `.mrn-tag` indigo, righe 14/24 hover.
Rosso solo per alert clinici.

## Acceptance Criteria

- AC1: nessun `ClinicalTableSection`/barra collassabile attorno alla lista; tabella e card sempre visibili.
- AC2: chip Allergie accanto al nome (desktop + mobile); assente dalla colonna Stato clinico.
- AC3: badge sesso `M` azzurro / `F` rosa accanto al nome; `.btn-primary` ombrato, Importa dimissione piatto.
- AC4: nessun cambio a logica/dati/fetch/API/altri componenti; rosso solo alert; build verde; screenshot @1440 vs mockup.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Presentazione/markup |
| Integration | no | |
| API | no | Backend non toccato |
| Playwright | yes | Screenshot lista pazienti @1440 (tabella aperta, badge nome, sesso, CTA) vs mockup |
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
