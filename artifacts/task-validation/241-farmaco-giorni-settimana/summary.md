# #241 — Prescrizione farmaco per giorni specifici della settimana (READY FOR CODEX QA)

## ⚠️ Richiede UNA migration Prisma (additiva, nullable, backward-compatible)
Nuova colonna `PatientTherapy.giorniSettimana String?` (lista ISO 1=Lun…7=Dom; NULL/vuoto = tutti i
giorni). Migration: `prisma/migrations/20260708120000_therapy_giorni_settimana/migration.sql`
(`ALTER TABLE "PatientTherapy" ADD COLUMN "giorniSettimana" TEXT;`). Nessun dato modificato, nessun
comportamento pre-esistente cambiato (NULL = ogni giorno). La migration viene applicata da Railway
(`prisma migrate deploy`) al merge — **gate Codex**.

## Implementazione
Backend:
- `therapy-create.ts`: `TherapyCreateInput.giorniSettimana` + persistenza + helper
  `normalizeGiorniSettimana()` (dedup/sort, empty/all-7 → null).
- `routes/patient-therapies.ts`: `giorniSettimana` in `scalarAllowed` (PUT lo persiste).
- `routes/therapy.ts`: filtro diario `/therapy-slots` — un farmaco con `giorniSettimana` NON compare
  nei giorni fuori lista (conversione JS getDay 0=Dom → ISO 7). **Comportamento portante.**
Frontend:
- `TherapyFormFields.tsx`: campo `giorniSettimana:number[]` + selettore 7 toggle (Lun…Dom), solo per
  terapia periodica; hint "Tutti i giorni" se vuoto.
- `TerapiaFarmacologicaTab.tsx`: hydrate (`therapyToForm`) + payload (`formToPayload`) + **display** in
  `ScheduleSummary` (pill giorni) nelle tabelle terapie.
- `types.ts`: `PatientTherapyAPI.giorniSettimana`. `App.css`: `.weekday-toggle`, `.sched-pill--days`.

## Acceptance Criteria
- Inserimento farmaco per uno/più giorni specifici: PASS — selettore 7 giorni.
- Struttura verificabile dei giorni (non solo testo libero): PASS — colonna dedicata + API.
- Riepilogo/diario coerenti: PASS — pill giorni nel riepilogo; diario giornaliero filtra per giorno.

## Test / Build
- `backend/src/therapies/__tests__/giorni-settimana.test.ts` **2/2 PASS** (normalize + filtro giorni);
  output `logs/test-output.txt`. Registrato nello script test backend.
- Backend `tsc -p tsconfig.json`: OK (0 errori, client Prisma rigenerato con la colonna).
- Frontend `tsc -b && vite build`: OK.

## Nota QA
La verifica runtime end-to-end (creazione terapia Lun/Mar/Gio/Dom → assente in diario mercoledì) e la
migration richiedono il DB in esecuzione: verificabili da Codex sul deploy (preview/Railway).
