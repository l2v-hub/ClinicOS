# Task Validation Report

## Task

- Title: Performance navigazione tra contesti (Lista Pazienti e altri)
- Slug: performance-navigazione-tra-contesti-lista-pazienti-e-altri
- Commit: branch `perf/navigation-instant` (base `origin/codex/subtle-dashboard-notifications`
  @367c560d); primo commit 461cdb89, secondo commit = giri 5–7 (vedi `git log`)
- Date: 2026-09-25

## Implementation Summary

Diagnosi (misurata su build di produzione `vite preview` + API stub a 200 ms di latenza con
preflight CORS, come Railway): ogni cambio contesto svuotava lo stato della pagina, rifaceva la
catena di richieste e mostrava "Caricamento…"; il primo accesso a ogni sezione/tab scaricava il
chunk lazy con "Caricamento modulo…" (e pagava la soglia di ~300 ms con cui React trattiene il
contenuto dopo un fallback di Suspense). Nessun long task JS: il problema era rete + stati di
caricamento, non rendering.

Interventi (solo frontend; nessuna modifica a backend, schema, API, `VITE_API_URL`):

1. **Chunk precaricati** — `App.tsx`: i lazy import sono raccolti in `routeLoaders`;
   `preloadRouteModules()` li scarica a browser inattivo già dalla schermata di login (prima le
   pagine di atterraggio, poi il resto) e precarica i tab della cartella
   (`PatientDetailLazyTabs.preloadPatientDetailTabs`, esclusi i due che trascinano lo stack PDF).
   Il visore PDF del foglio illustrativo (`VisoreDocumentoFarmaco`) diventa lazy nel tab Terapia e
   in Anagrafica farmaci: ~1,7 MB non entrano più nel chunk di quelle pagine.
2. **Navigazione in transition** — `pushNav`/`popstate` commitano `navKey` dentro
   `startTransition`; lo stesso vale per il cambio tab/gruppo nella scheda paziente
   (`switchTab`/`switchGroup`): la vista corrente resta visibile finché la nuova è pronta, niente
   fallback e niente soglia di 300 ms.
3. **Stale-while-revalidate** — nuova `lib/sessionCache.ts` (memoria di sessione, svuotata al
   logout) + chiavi condivise in `lib/patientTabSnapshots.ts`:
   - lista pazienti (`usePatientListPage`): la pagina già mostrata si ridisegna subito e si
     rivalida (badge inclusi); prima pagina precaricata dopo il login
     (`prefetchPatientListSnapshot`);
   - agenda, feed consegne, note, terapie del giorno, consegne del paziente, directory operatori
     (`App.tsx`): con la stessa chiave di query non si svuota più lo stato né si mostra il
     placeholder; directory operatori precaricata dopo il login;
   - dashboard: `useAnomalieReparto` e `useRiepilogoSomministrazioni` partono dall'ultima
     risposta in cache (`peekCachedGet`) e si aggiornano sotto;
   - tab cartella: Terapia, Diario, Sezioni cliniche, catalogo Moduli e Parametri multipaziente
     leggono/scrivono lo snapshot di sessione; `lib/patientDetailPrefetch.ts` legge in anticipo i
     quattro tab all'apertura della scheda e le letture in volo sono condivise con i tab che
     montano nel frattempo (`trackSessionCache`/`pendingSessionCache`: nessuna doppia richiesta);
   - Parametri multipaziente: prima pagina precaricata dopo il login
     (`lib/patientParametersPrefetch.ts`);
   - cartella clinica precaricata al passaggio del mouse/focus sulla riga della lista
     (`onPrefetch` → `prefetchCartella`, silenzioso).
4. Il feed terapie NON viene precaricato: il contratto `therapyNavigationGuard.test.ts` impone la
   lettura solo sulla pagina Terapia (rispettato, test verde).
5. Stub di misura reso realistico (diario, sezioni cliniche, versioni moduli) per non misurare
   stati d'errore al posto dei dati.

## Files Changed

- `frontend/src/App.tsx`
- `frontend/src/lib/sessionCache.ts` (nuovo), `frontend/src/lib/patientTabSnapshots.ts` (nuovo),
  `frontend/src/lib/patientDetailPrefetch.ts` (nuovo), `frontend/src/lib/patientParametersPrefetch.ts`
  (nuovo), `frontend/src/lib/cachedFetch.ts`
- `frontend/src/lib/assessments/assessmentCatalogState.ts`
- `frontend/src/components/operator/usePatientListPage.ts`, `PatientList.tsx`, `PatientRoster.tsx`,
  `PatientDetail.tsx`, `PatientDetailLazyTabs.tsx`, `MultiPatientParametri.tsx`,
  `AnagraficaFarmaciPage.tsx`, `assessments/AssessmentCatalog.tsx`
- `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx`, `DiarioPazienteTab.tsx`,
  `NarrativeSectionsTab.tsx`, `useAnomalieReparto.ts`, `useRiepilogoSomministrazioni.ts`
- Test nuovi: `frontend/src/lib/__tests__/sessionCache.test.ts`,
  `frontend/src/lib/__tests__/navigationStaleWhileRevalidate.test.ts`
- Evidenze: `artifacts/task-validation/<slug>/perf/*`, `screenshots/*`, `logs/*`

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | `perf/comparison.md` (da `final-preview.json` = giro 7): visite successive — mediana **66 ms**, massimo **79 ms**, 0/19 oltre 300 ms (baseline: 471 ms / 1326 ms / 15/19).                                                                                                                                                                                                                                                                                                    |
| AC2 |   PASS | `final-preview.json`: 0 chunk JS scaricati durante le 34 navigazioni (baseline 41); `screenshots/evidence-ac3.json`: 0 occorrenze di "Caricamento modulo…" dopo il login su tutti i contesti + scheda + tab. Navigazioni oltre 300 ms: **2/34** (baseline 27/34): prima apertura della pagina Terapia (per contratto) e primo click sul tab Terapia entro ~1 s dall'apertura della scheda (attende la lettura anticipata già in volo).                                        |
| AC3 |   PASS | `perf/evidence-ac3.mjs` → `screenshots/evidence-ac3.json`: ritorno su Pazienti disegnato da cache in **71 ms** senza "Caricamento…", nome precedente visibile, nome rinominato dallo stub visibile dopo **341 ms** (`ac3-1/2/3-*.png`).                                                                                                                                                                                                                                       |
| AC4 |   PASS | `tsc --noEmit` e `npm run build` verdi (`logs/frontend-build.log`); test node frontend 784 pass / 9 fail, **insieme di fallimenti identico** al branch di partenza pulito (`logs/frontend-failing-tests-baseline.txt` vs `-after.txt`, verificato con worktree pulito): nessuna regressione; logout → `clearSessionCache()` coperto da `sessionCache.test.ts` + `navigationStaleWhileRevalidate.test.ts`; 0 errori console nuovi (solo 404 dello stub su rotte non simulate). |

## Test Results

| Test             | Result | Evidence                                                                                                                                                                                        |
| ---------------- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | `sessionCache.test.ts` (4), `navigationStaleWhileRevalidate.test.ts` (6): 10/10 verdi; suite completa in `logs/frontend-node-tests.log` (784 pass, 9 fail pre-esistenti identici alla baseline) |
| Integration      |     NA |                                                                                                                                                                                                 |
| API              |     NA | nessuna modifica API                                                                                                                                                                            |
| Playwright       |   PASS | `perf/measure.mjs` (34 navigazioni, prima/dopo) e `perf/evidence-ac3.mjs` (RESULT: PASS), Chromium headless su `vite preview` + stub                                                            |
| Persistence      |     NA | nessun dato modificato                                                                                                                                                                          |
| Agnos AI         |     NA |                                                                                                                                                                                                 |
| Voice            |     NA |                                                                                                                                                                                                 |
| OCR              |     NA |                                                                                                                                                                                                 |
| Security/privacy |   PASS | cache solo in memoria, per sessione, svuotata al logout (test); nessun segreto; nessun dato reale (stub sintetico)                                                                              |

## Runtime Evidence

Tabella prima/dopo (`perf/comparison.md`, build di produzione, stub 200 ms + preflight):

| Metrica (tempo "contenuto visibile")      |         prima |       dopo |
| ----------------------------------------- | ------------: | ---------: |
| tutte le navigazioni — mediana            |        532 ms |      69 ms |
| tutte le navigazioni — media              |        627 ms |      87 ms |
| tutte le navigazioni — massimo            |       1653 ms |     461 ms |
| tutte le navigazioni — oltre 300 ms       |         27/34 |       2/34 |
| prime visite — mediana                    |        779 ms |      69 ms |
| visite successive — mediana / massimo     | 471 / 1326 ms | 66 / 79 ms |
| chunk JS scaricati durante le navigazioni |            41 |          0 |

Cicli: `cycle1-preview.json` (SWR + transition + preload), `cycle2` (prefetch lista, hover
cartella, cache tab), `cycle3/3b` (prefetch tab, directory), `cycle5` (letture anticipate
condivise), `cycle6` (cambio tab in transition, stub realistico), `cycle7` = `final-preview.json`
(prefetch Parametri).

Con preflight CORS in cache lato backend (`Access-Control-Max-Age`, simulato con
`PREFLIGHT_MAX_AGE=600` nello stub, misurato al giro 4): `final-preview-preflight-cached.json` —
massimo 763 → 591 ms, media "dati completi" 545 → 434 ms. Raccomandazione backend, non
implementata (vincolo "non modificare il backend").

Screenshot: `screenshots/ac3-1-lista-prima-visita.png`, `ac3-2-lista-da-cache-subito.png`,
`ac3-3-lista-rivalidata.png`, `ac2-scheda-paziente.png`.

## Logs

- `logs/frontend-build.log` — `tsc -b && vite build` (exit 0)
- `logs/frontend-node-tests.log` — suite node frontend completa
- `logs/frontend-failing-tests-baseline.txt` / `-after.txt` — confronto fallimenti pre-esistenti
- Solo dati sintetici dello stub; nessun log di produzione.

## Residual Risks

- Misure su stub locale (dati sintetici, latenza fissa 200 ms, HTTP/1.1): la produzione (Railway,
  HTTP/2, dati reali) va verificata dopo il deploy con sessione autenticata.
- Restano ≥ 1 giro di rete: prima apertura della pagina Terapia (per contratto non precaricabile) e
  primo click sul tab Terapia entro ~1 s dall'apertura della scheda (la lettura anticipata è già
  in volo e viene riusata, non duplicata).
- Il fallback "Caricamento modulo…" può ancora comparire una sola volta al login → dashboard (non è
  un cambio contesto; il boundary Suspense è nuovo e React mostra comunque il fallback).
- Dati mostrati da cache per un istante prima della rivalidazione (contratto stale-while-revalidate);
  le mutazioni invalidano le cache dei domini toccati (terapie) o rifanno la lettura.
- Il branch di partenza è `origin/codex/subtle-dashboard-notifications` (codice in produzione);
  `main` è fermo al 10/08 e non contiene questo lavoro.

## Final Decision

CLOSED — VERIFIED
