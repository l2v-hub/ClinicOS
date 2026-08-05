# Task Contract

## Task
- Title: Ottimizzazioni quick-win da audit codebase (perf/reliability/privacy)
- Slug: ottimizzazioni-quick-win-da-audit-codebase-perf-reliability-privacy
- Type: refactor
- Date: 2026-07-31

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes |
| Database/Persistence | yes |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | yes |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Da audit multi-dominio precedente (report `clinicos-optimization-report.md`, 42 finding verificati), i seguenti 14 problemi concreti sono confermati nel codice:

1. `backend/src/ai/upload/job-service.ts` `runtimeFetch()` non ha timeout/AbortSignal → un poll bloccato può stallare indefinitamente i job di import.
2. `frontend/src/lib/cachedFetch.ts` la cache e' globale per URL e non viene svuotata al logout → rischio che un operatore B riceva dati cache scaricati sotto l'identita' dell'operatore A entro il TTL.
3. `PatientTherapy` non ha indice utile per il filtro `stato` usato da `GET /therapy-slots` (solo indice composito `[tipo, stato]`, inutilizzabile per un predicato sul solo `stato`).
4. `Appointment` non ha un indice con leading column `scheduledAt`, mentre almeno due query filtrano solo su quel campo.
5. `GET /admin/beds/available` (admin-rooms.ts) carica lo storico assegnazioni completo invece di filtrare quelle attive con `activeAssignmentFilter()` gia' esistente nello stesso file.
6. `GET/PUT /patients/:id/cartella` (patients.ts) eseguono due round-trip sequenziali (Patient intero + Cartella) invece di una query con `select` mirato.
7. `PUT /operators/:operatorId` (operators.ts) ricalcola gli appuntamenti odierni di TUTTI gli operatori via `groupBy` per poi usarne uno solo.
8. `GET /patients/:patientId/diary` (patient-diary.ts) non ha alcuna paginazione, a differenza di patients/note/consegne.
9. `GET /patients/:patientId/medication-administrations` (patient-therapies.ts) accetta `limit` senza tetto massimo.
10. ~10 controlli di esistenza/unicita' in patients.ts/admin-rooms.ts/patient-therapies.ts caricano l'intera riga quando serve solo l'id.
11. `operatorHeaders()` e' duplicata identica in 6 componenti frontend + una variante in cachedFetch.ts invece di un helper condiviso.
12. `NewPatientModal.tsx` (+`DischargeLetterImport.tsx` che lo alimenta, + dipendenza `tesseract.js`) e' codice morto, non raggiungibile dall'app (il flusso reale usa `IntakeWorkspace`).
13. `clinicos-ai-runtime/clinicos_ai/api/app.py` deserializza l'intero body (incluso payload base64 allegati) PRIMA di `_auth()` e del controllo `max_upload_bytes`.
14. `clinicos-ai-runtime/clinicos_ai/models/providers/_common.py` duplica 4 volte la classificazione errore rate-limit/provider-error; `providers/mistral.py` non normalizza `JSONDecodeError` come errore retryable, quindi un job OCR Mistral con risposta malformata perde il retry automatico.

## Expected Behaviour

1. `runtimeFetch()` applica lo stesso pattern di timeout gia' usato in `runtime-client.ts` (`AbortSignal.timeout`), configurabile, cosi' un runtime irraggiungibile fallisce in modo controllato invece di stallare.
2. Il logout invalida/svuota la cache di `cachedGetJson` cosi' nessuna risposta cache sopravvive al cambio operatore.
3. `PatientTherapy` ha un indice che copre il filtro su solo `stato` (es. `@@index([stato])`).
4. `Appointment` ha un indice che copre il filtro su solo `scheduledAt`.
5. `GET /admin/beds/available` riusa `activeAssignmentFilter()` per non scaricare storico non necessario.
6. `GET/PUT /patients/:id/cartella` eseguono una singola query con `select` mirato per il check di esistenza + lettura cartella.
7. `PUT /operators/:operatorId` calcola gli appuntamenti odierni con un `count` scoped al solo operatore.
8. `GET /patients/:patientId/diary` supporta paginazione opt-in con lo stesso pattern (`Math.min(limit, 500)`) gia' usato in patients/note/consegne, senza cambiare il comportamento di default (nessun parametro = comportamento identico a oggi).
9. `GET /patients/:patientId/medication-administrations` applica un tetto massimo al `limit`.
10. I controlli di esistenza/unicita' citati usano `select: { id: true }` (o equivalente minimale), stesso comportamento applicativo, payload piu' piccolo.
11. Un solo helper condiviso `operatorHeaders()` in `frontend/src/lib`, importato dai 6+ call site.
12. `NewPatientModal.tsx` e `DischargeLetterImport.tsx` rimossi (o ricollegati se si scopre un uso reale non individuato dal grep); `tesseract.js` rimosso da `package.json` se non piu' referenziato da nessun altro punto.
13. In `app.py`, l'auth (`_auth()`) e il controllo dimensione avvengono PRIMA che il body completo venga deserializzato/allocato (es. leggendo raw body/headers prima del parsing Pydantic, o validando Content-Length prima).
14. Un helper condiviso per la classificazione errori e' riusato da `_common.py`, `google.py`, `azure.py`; `mistral.py` normalizza `json.JSONDecodeError` (e altre eccezioni non-timeout) come errore classificato/retryable coerente col resto dei provider.

## Acceptance Criteria

- AC1: `runtimeFetch` in job-service.ts applica un timeout/AbortSignal; build TS backend verde.
- AC2: la cache `cachedGetJson` viene invalidata/svuotata su logout; verificato con test mirato o lettura del path di chiamata.
- AC3: `prisma/schema.prisma` ha un indice utile per `PatientTherapy.stato`; migration SQL creata coerente con la convenzione del repo; `prisma validate`/`generate` verdi.
- AC4: `prisma/schema.prisma` ha un indice utile per `Appointment.scheduledAt`; stessa migration/validazione di AC3.
- AC5: `GET /admin/beds/available` non carica piu' storico assegnazioni non filtrato; comportamento di risposta invariato per i casi testati.
- AC6: `GET/PUT /patients/:id/cartella` fanno una sola query DB per il check+lettura; risposta invariata.
- AC7: `PUT /operators/:operatorId` non esegue piu' un `groupBy` su tutta la clinica; risposta invariata.
- AC8: `GET /patients/:patientId/diary` accetta parametri di paginazione opt-in senza parametri = comportamento identico a oggi (stesso ordine, stessi dati se non paginato).
- AC9: `GET .../medication-administrations` applica `Math.min(limit, 500)` (o soglia equivalente) invece di un limit non vincolato.
- AC10: i lookup di esistenza/unicita' elencati usano `select` minimale; stesso comportamento (404/409) sui casi testati.
- AC11: nessuna definizione duplicata di `operatorHeaders()` nel frontend; tutti i call site importano l'helper condiviso; tsc frontend verde.
- AC12: `NewPatientModal.tsx`/`DischargeLetterImport.tsx` rimossi e build frontend verde senza import rotti; `tesseract.js` rimosso da package.json solo se conferma di zero altri usi.
- AC13: in app.py l'auth/size-check precede la deserializzazione Pydantic completa del body; test Python esistenti verdi.
- AC14: helper di classificazione errori condiviso riusato in _common.py/google.py/azure.py; mistral.py classifica JSONDecodeError come retryable; test Python esistenti verdi.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | backend `npm test` (run-node-tests.mjs) e frontend `__tests__` esistenti su lib/cachedFetch e componenti toccati |
| Integration | no | nessun nuovo flusso end-to-end introdotto, solo query/refactor su endpoint esistenti |
| API | yes | verifica manuale/scriptata di `/therapy-slots`, `/admin/beds/available`, `/patients/:id/cartella`, `/operators/:id`, `/patients/:id/diary`, `/patients/:id/medication-administrations` con build reale (nessuna mutazione su dati reali; DB locale se disponibile) |
| Playwright | no | nessuna modifica visiva/di layout/flusso UI osservabile dall'utente: cache-invalidation, dedup helper e rimozione codice morto sono invisibili a schermo |
| Persistence after refresh | yes | AC6/AC7/AC8 cambiano la forma della query, non il dato persistito: va confermato che i valori restituiti dopo refresh combaciano con quelli pre-modifica |
| Agnos action registry | no | nessun tool/azione AI toccato in questo batch |
| Voice simulation | no | nessuna area voce toccata |
| OCR/import test | yes | AC13/AC14 toccano app.py (boundary API import) e mistral.py (provider OCR): test Python esistenti + verifica logica della classificazione errore |
| Security/privacy scan | yes | AC2 e' un fix di privacy (cross-operator cache leak); AC13 sposta un controllo di sicurezza (auth) prima nel path di esecuzione |

## Evidence Plan

Required evidence:

- validation-report.md con tabella AC (PASS/FAIL) e limiti residui
- output `npm run build` e `npm test` backend
- output `npx tsc --noEmit` e build frontend
- output test Python (`pytest` se presente) per app.py/_common.py/mistral.py
- `npx prisma validate` / `prisma generate` per le modifiche schema
- log sanitizzati (nessun dato clinico, nessun secret) delle verifiche API locali, se eseguite
- nota esplicita se la migration NON e' stata applicata contro un DB reale (ambiente senza Docker/DB disponibile) — in tal caso stato "IMPLEMENTED — NOT VERIFIED" per la sola parte di applicazione migration, non per lo schema/build

## Risks

- Cambiare la shape delle query Prisma (select mirato, count invece di groupBy) puo' introdurre regressioni silenziose se un campo scartato era in realta' usato altrove nello stesso handler: mitigazione = leggere per intero ogni funzione toccata prima di modificarla, non solo la porzione con il problema.
- L'ambiente di sviluppo corrente non ha Docker/Postgres raggiungibile da questa sessione: la migration verra' scritta e validata sintatticamente ma non applicata a un DB vivo in questa sessione; va applicata dall'utente (`docker compose up -d` + `npm run prisma:migrate` o equivalente) prima del deploy.
- Rimozione di `NewPatientModal.tsx`/`DischargeLetterImport.tsx`/`tesseract.js`: rischio di rimuovere codice in realta' raggiungibile da un percorso non individuato dal grep (es. import dinamico). Mitigazione = doppia verifica (grep + lettura di tutti i punti di ingresso di navigazione) prima della rimozione; se incerto, isolare senza cancellare (deprecare) invece di eliminare.
- Il file `prisma/schema.prisma` ha gia' modifiche non committate in working tree (indici aggiunti da lavoro precedente, non oggetto di questo task): le nuove modifiche vanno aggiunte senza toccare/riformattare le righe gia' modificate da quel lavoro in corso.

## Gate Status

READY FOR IMPLEMENTATION
