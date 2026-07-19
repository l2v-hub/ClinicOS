# Issue #128 — Camera assegnata non risulta occupata

## Causa radice

L'app ha due rappresentazioni della camera del paziente:

1. **Cartella (JSON)** — `cartella.cameraNumero` / `lettoNumero`: dato solo visuale nella scheda paziente.
2. **Assegnazioni letto (relazionale)** — `PatientRoomAssignment` + `Bed` + `Room`: unica fonte usata da
   `GET /admin/rooms`, `GET /admin/rooms/occupancy`, `GET /admin/beds/available` e dalla vista Posti Letto.

L'assegnazione camera dalla scheda paziente (modal "Camera e Assegnazione" → `saveCameraFromModal`,
form Profilo → `saveProfiloHandler`, e Nuovo Paziente in `App.addPaziente`) scriveva **solo** la cartella JSON
(`PUT /patients/:id/cartella`) e non creava mai la `PatientRoomAssignment`. Risultato: il letto restava
`LIBERO` in Posti Letto/occupancy, la camera continuava a essere proposta come libera per altri pazienti,
e le viste erano incoerenti tra loro (la scheda paziente mostrava la camera, la vista camere no).

Inoltre le select camera in PatientDetail elencavano tutte le camere `attive` senza alcun filtro di occupazione.

## Fix (solo frontend, API backend esistenti — nessuna modifica a backend/schema)

`frontend/src/App.tsx`

- `loadCamere()` estratto come `useCallback` riutilizzabile (prima era inline nel `useEffect` di bootstrap),
  ora mappa anche `pazienteId` sul letto occupato.
- Nuova `syncCameraAssignment(pazienteId, cameraNumero?, lettoNumero?)`:
  - camera rimossa → chiude l'assegnazione attiva (`PUT .../room-assignments/:id` con `endDate` odierna);
  - camera scelta → risolve il letto (match label/indice, altrimenti primo letto libero), crea
    `POST /patients/:id/room-assignments` (il backend chiude da solo l'assegnazione precedente del paziente);
  - letto occupato / camera piena / errore API → toast in italiano e `{ ok: false }` (la cartella NON viene salvata,
    evitando nuova incoerenza);
  - a successo ricarica `camere` così tutte le viste in sessione sono coerenti.
- `addPaziente`: se il nuovo paziente ha una camera, crea anche l'assegnazione reale; se fallisce non scrive
  la camera in cartella.
- Prop `onAssignCamera={syncCameraAssignment}` passata a `PatientDetail`.

`frontend/src/components/operator/PatientDetail.tsx`

- `saveCameraFromModal` e `saveProfiloHandler` ora chiamano prima `onAssignCamera`; solo a successo salvano
  la cartella, usando la label reale del letto assegnato.
- `camereAssegnabili`: le select camera propongono solo camere con almeno un letto libero
  (o già occupato dal paziente corrente) — AC2.

## Test

- `e2e/issue-128-verify.mjs` (Playwright, app reale su :5174 + backend :3001): copre AC1-AC4 incluso
  refresh completo e vista admin Posti Letto. **Pre-fix: 3/9 PASS** (evidenze in `iteration-1/`),
  **post-fix: 9/9 PASS** (evidenze in `final/`).
- Gate: `npx tsc --noEmit` OK, `npm run build` OK. Backend non toccato.

## Evidenze

| File                                  | Cosa mostra                                                                            |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `final/before.png`                    | PRIMA: paziente con camera 102 salvata ma Posti Letto = 0 occupati, letto 102/A LIBERO |
| `final/after.png`                     | DOPO: Posti Letto mostra 1 occupato, letto 102/A OCCUPATO con paziente "Camera128"     |
| `final/after-refresh.png`             | DOPO refresh completo: scheda paziente coerente (Camera 102 / Letto A / ricoverato)    |
| `final/ac2-select-altro-paziente.png` | Select camera di un altro paziente: la 102 non è più proposta                          |
