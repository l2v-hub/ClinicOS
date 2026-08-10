# Task Validation Report

## Task

- Title: Card terapia in agenda non mostra l'orario, serve aprire il dettaglio per capirlo
- Slug: card-terapia-in-agenda-non-mostra-l-orario-serve-aprire-il-dettaglio-per-capirlo
- Commit: uncommitted working-tree changes on branch da creare (staged for commit)
- Date: 2026-08-10

## Implementation Summary

Segnalazione utente, conseguenza diretta del ciclo precedente (fix `earliestOra`): la card della
fascia terapia nell'agenda (`.agt-admin-therapy-row`, CSS `grid-column: 1 / -1`) occupa sempre
l'intera riga della griglia, spingendo la vera riga oraria (`.agt-admin-time` + celle operatore)
alla riga immediatamente sotto, senza alcun collegamento visivo. L'utente doveva aprire il
dettaglio (click → modal) per capire a quale orario la card si riferisse.

Fix: `TherapySlotCard`/`TherapySlotDot` (`frontend/src/components/shared/TherapySlotOverlay.tsx`)
mostrano ora l'orario direttamente sulla card/tooltip, non solo nel dettaglio. Componente
condiviso da `AdminAgenda.tsx` E `OperatorAgenda.tsx` — un'unica correzione risolve entrambe le
schermate.

## Files Changed

- `frontend/src/components/shared/TherapySlotOverlay.tsx`
- `frontend/src/app-additions.css`
- `e2e/agenda-therapy-card-shows-time.mjs` (nuovo — evidenza runtime)

## Acceptance Criteria Result

| AC                                                            | Result | Evidence                             |
| ------------------------------------------------------------- | -----: | ------------------------------------ |
| AC1 - TherapySlotCard mostra l'orario                         |   PASS | `slot.ora` aggiunto all'etichetta    |
| AC2 - TherapySlotDot include l'orario nel tooltip             |   PASS | `title` aggiornato                   |
| AC3 - nessuna modifica al comportamento di click/apertura     |   PASS | Solo markup/CSS, `onClick` invariato |
| AC4 - tsc/build/test invariati                                |   PASS | Vedi Test Results sotto              |
| AC-R1 - card ADMIN mostra l'orario senza aprirla              |   PASS | Runtime: vedi sotto, 3/3             |
| AC-R2 - card OPERATORE mostra l'orario (componente condiviso) |   PASS | Runtime: vedi sotto                  |
| AC-R3 - zero errori console                                   |   PASS | Runtime: vedi sotto                  |

## Test Results

| Test             |                   Result | Evidence                                               |
| ---------------- | -----------------------: | ------------------------------------------------------ |
| Unit             | NA (per scelta motivata) | markup/CSS puro, coperto da Playwright end-to-end      |
| Playwright       |                     PASS | `node e2e/agenda-therapy-card-shows-time.mjs`: **3/3** |
| Security/privacy |                       NA | Nessun dato coinvolto                                  |

Eseguiti direttamente (io, il coordinatore):

- `npx tsc --noEmit` (frontend): pulito.
- `npm run build`: verde (`✓ built in 9.44s`).
- `npm test -- --run`: 148/148 invariato.

## Runtime Evidence

Nessun Postgres/Podman disponibile; evidenza via browser reale con `page.route` stubbing.
**3/3 verifiche superate** su `e2e/agenda-therapy-card-shows-time.mjs`:

1. In agenda ADMIN, la card "Terapia Pomeriggio" mostra ora il testo completo
   `"Terapia Pomeriggio · 14:00 0/1 erogate 1 da erogare"` — l'orario e' visibile senza aprire il
   dettaglio (screenshot `01-admin-card-con-orario.png`).
2. In agenda OPERATORE (stesso componente condiviso), identico comportamento — screenshot
   `02-operatore-card-con-orario.png`.
3. Zero errori JavaScript in console in entrambi gli scenari.

Dettaglio in `screenshots/verifiche.json`.

## Residual Risks

- **R1 (dal contract)**: non affronta il caso residuo gia' documentato nel ciclo precedente (piu'
  orari reali diversi raggruppati sotto un'unica card, ancorata alla piu' precoce) — quello
  richiede un redesign della griglia, fuori ambito.
- **Autocertificazione**: fix di ambito ridotto e ben definito, implementazione e verifica
  eseguite direttamente da me in questo ciclo.

## Final Decision

CLOSED — VERIFIED

Tutti gli AC del contract sono verificati: staticamente per il markup/CSS, a runtime tramite uno
scenario Playwright end-to-end che conferma il testo effettivamente RENDERIZZATO sulla card in
entrambe le schermate (admin e operatore) che condividono il componente — non solo che il sorgente
e' cambiato.
