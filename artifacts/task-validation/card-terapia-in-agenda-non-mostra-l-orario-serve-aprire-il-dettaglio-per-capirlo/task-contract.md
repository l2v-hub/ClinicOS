# Task Contract

## Task

- Title: Card terapia in agenda non mostra l'orario, serve aprire il dettaglio per capirlo
- Slug: card-terapia-in-agenda-non-mostra-l-orario-serve-aprire-il-dettaglio-per-capirlo
- Type: fix (frontend, chiarezza UI)
- Date: 2026-08-10

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Contesto

Segnalazione utente, diretta conseguenza del ciclo precedente (fix del posizionamento
`earliestOra`): nella griglia oraria dell'agenda (admin e operatore), la card di una fascia
terapia (`.agt-admin-therapy-row`, CSS `grid-column: 1 / -1`) occupa SEMPRE l'intera riga della
griglia, spingendo la vera riga oraria (`.agt-admin-time` + celle operatore) alla riga
IMMEDIATAMENTE SOTTO, senza alcun elemento visivo che colleghi la card al suo orario. L'utente
vede la card "Terapia Pomeriggio" e, per sapere se si riferisce alle 14:00 o alle 16:00, e'
costretto ad aprirne il dettaglio (click → modal).

`TherapySlotCard`/`TherapySlotDot` (`frontend/src/components/shared/TherapySlotOverlay.tsx`) sono
condivisi da `AdminAgenda.tsx` E `OperatorAgenda.tsx` — un'unica correzione risolve entrambe le
schermate.

## Expected Behaviour

La card della fascia terapia mostra il proprio orario direttamente su di se' (non solo nel
dettaglio), cosi' l'utente non deve piu' correlarla con la riga sottostante ne' aprirla per capire
a quale orario si riferisce.

## Acceptance Criteria

- AC1 — `TherapySlotCard` mostra l'orario (`slot.ora`) accanto/vicino all'etichetta della fascia.
- AC2 — `TherapySlotDot` (vista settimanale compatta) include l'orario nel proprio tooltip/testo
  visibile, per coerenza.
- AC3 — Nessuna modifica al comportamento di click/apertura dettaglio (gia' corretto).
- AC4 — `npx tsc --noEmit`, `npm run build`, `npm test` invariati/verdi.

### Aperti — verificati a runtime nel validation-report

- AC-R1: nell'agenda admin, la card terapia mostra l'orario reale senza bisogno di aprirla.
- AC-R2: nell'agenda operatore, stessa cosa (component condiviso).
- AC-R3: zero errori console.

## Test Plan

| Test type        | Required | Reason                                 |
| ---------------- | -------: | -------------------------------------- |
| Unit             |       no | markup puro, coperto da Playwright     |
| Playwright       |      yes | verifica visiva del testo renderizzato |
| Security/privacy |       no | nessun dato coinvolto                  |

## Risks

**R1 — Fuori ambito, deliberatamente.** Non affronta il caso (documentato nel ciclo precedente
come rischio residuo) di piu' orari reali diversi raggruppati sotto un'unica card — quello
richiede un redesign della griglia, non in questo ciclo.

## Gate Status

READY FOR IMPLEMENTATION
