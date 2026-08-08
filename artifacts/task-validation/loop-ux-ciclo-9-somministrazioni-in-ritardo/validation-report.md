# Task Validation Report

## Task
- Title: Loop UX ciclo 9 - Somministrazioni in ritardo (Clinic Control Center, primo incremento)
- Slug: loop-ux-ciclo-9-somministrazioni-in-ritardo
- Commit: uncommitted working-tree changes on branch loop-ux-ciclo-9-somministrazioni-in-ritardo (staged for commit)
- Date: 2026-08-08

## Implementation Summary

Primo loop della nuova iniziativa "Clinic Control Center". Analisi congiunta (due agenti Explore
in parallelo, uno per lato) dei percorsi ADMIN (issue -> operatore/paziente -> azione) e OPERATORE
(My Shift -> pazienti/task -> completamento), come richiesto esplicitamente prima di implementare.
Gap piu' netto trovato: le somministrazioni di oggi non compaiono in nessuna delle due dashboard,
pur essendo il "task" ricorrente piu' strutturato del modello dati attuale.

Aggiunta una card KPI "Somministrazioni in ritardo" a entrambe le dashboard, alimentata da un
nuovo hook che aggrega l'endpoint gia' esistente `GET /therapy-slots?date=` (nessuna nuova rotta,
nessuna modifica a schema/API/regole cliniche/permessi/produzione, come da vincoli espliciti
dell'iniziativa). Lavoro svolto tramite lo stesso team coordinato dei cicli precedenti: clinicos-uiux
(spec visivo), clinicos-implementer (codice), clinicos-qa (gate indipendente).

## Files Changed

- `frontend/src/components/operator/cartella/useRiepilogoSomministrazioni.ts` (nuovo)
- `frontend/src/components/operator/OperatorDashboard.tsx`
- `frontend/src/components/admin/AdminDashboard.tsx`

## Round 1 - Gate QA: REJECT (difetto reale, non stilistico)

clinicos-qa ha bloccato l'implementazione per un difetto concreto nel confronto "in ritardo":
`a.scheduledTime < soglia` confrontava due STRINGHE "HH:mm". Il backend
(`normalizeSchedules`, `backend/src/lib/therapy-dose.ts`) valida con `/^\d{1,2}:\d{2}$/`, che
accetta ore a una cifra ("8:30") senza zero-paddarle. Un orario cosi', confrontato
lessicograficamente, risultava FALSO ('8' > '0' come primo carattere) anche se realmente in
ritardo — la somministrazione spariva silenziosamente dal conteggio, esattamente il numero che
questa card promette di azzeccare.

QA ha verificato che il difetto non e' raggiungibile dall'UNICO punto di scrittura nell'UI attuale
(`TherapyFormFields.tsx` usa `<input type="time">`, sempre normalizzato dal browser a "HH:MM"), ma
lo ha correttamente classificato BLOCKING lo stesso: e' un contratto dati incidentale (comportamento
del widget browser), non validato — vale per import futuri, script, o righe legacy non passate da
quel form. QA ha inoltre verificato che NON serve deduplicare le somministrazioni per fascia (a
differenza di `useAnomalieReparto`, che risponde a una domanda diversa) leggendo direttamente come
il backend costruisce le righe (`therapy.ts`, un record per fascia = una dose reale, non un
duplicato), e ha confermato leggendo `cachedFetch.ts` (non solo fidandosi del commento) che
`cachedGetJson` deduplica per URL esatto, quindi i due hook sullo stesso URL condividono una sola
richiesta di rete.

Due segnalazioni non bloccanti: uno `style={{ cursor: 'pointer' }}` ridondante (la classe
`.kpi-alert-card` gia' lo imposta via CSS), e un gap di accessibilita' PRE-ESISTENTE (onClick senza
role/tabIndex/onKeyDown) su TUTTE le `kpi-alert-card` cliccabili gia' presenti prima di questo
ciclo — non una regressione introdotta qui, correttamente non risolto in questo ciclo (fuori scope,
andrebbe fatto per l'intera famiglia di componenti in un ciclo dedicato).

## Round 2 - Correzione e ri-verifica

Sostituito il confronto a stringa con un confronto numerico in minuti-da-mezzanotte
(`minutiDaMezzanotte`, regex `^(\d{1,2}):(\d{2})$` quindi robusta a ore singole, `NaN`-safe: un
formato illeggibile non conta mai come "in ritardo"). Rimosso lo style ridondante. Non toccato il
gap di accessibilita' (deliberatamente, come da istruzione).

Ri-verificato indipendentemente (non solo il report dell'implementer):
- Lettura riga per riga del file finale — la funzione `minutiDaMezzanotte`/`minutiCorrenti`
  sostituisce correttamente `oraCorrente`, nessun residuo della vecchia funzione.
- `npx eslint --no-cache` sui 3 file coinvolti -> 0 errori.
- Diff isolato: solo i 3 file del task, nessuna riga esistente toccata oltre l'aggiunta in coda.

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 - nuovo hook, stesso pattern di `useAnomalieReparto` | PASS | Lettura del codice, confermato da QA |
| AC2 - card su entrambe le dashboard, spec uiux | PASS | Screenshot `03-dashboard-admin.png`; markup verificato riga per riga |
| AC3 - nessuna richiesta duplicata | PASS | Runtime: vedi AC-R1 sotto, 1 sola richiesta osservata |
| AC4 - orario non paddato contato correttamente (fix) | PASS | Runtime: vedi AC-R2 sotto, riproduce esattamente il caso del difetto |
| AC5 - tsc/build/test/eslint puliti | PASS | Round 2, ri-verificato indipendentemente |
| AC-R1 - stesso valore su entrambe le dashboard, colore, click-through, dedup rete | PASS | `e2e/loop-ux-ciclo-9-somministrazioni-in-ritardo.mjs`, 10/10 |
| AC-R2 - orario non paddato ("1:00") contato come in ritardo | PASS | Stesso script: valore atteso "2/3" include esplicitamente il caso "1:00" |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | NA (per scelta motivata) | vedi Test Plan nel contract |
| Integration | NA | nessun modulo backend toccato |
| API | NA | stesso endpoint gia' in uso, nessuna modifica |
| Playwright | PASS | `node e2e/loop-ux-ciclo-9-somministrazioni-in-ritardo.mjs`: **10/10** |
| Persistence | NA | nessuna modifica al modello dati |
| Security/privacy | PASS (statico) | nessun dato aggiuntivo esposto, stesso endpoint reparto-wide gia' usato altrove |

## Runtime Evidence

Frontend dev server su `localhost:5173`, nessun backend/Postgres/Podman (stesso vincolo ambientale
dei cicli precedenti). `e2e/loop-ux-ciclo-9-somministrazioni-in-ritardo.mjs` mocka
`/therapy-slots` con 5 somministrazioni costruite per esercitare ogni stato (`administered`,
`not_administered`, `pending` in ritardo zero-paddato, `pending` in ritardo NON paddato — il caso
esatto del difetto corretto, `pending` futuro non in ritardo). Atteso: totale=5, daFare=3, fatte=1,
nonErogate=1, **inRitardo=2** (include il caso non paddato).

**10/10 verifiche superate**:
1. La card compare ed e' rossa su ENTRAMBE le dashboard (sessioni/pagine separate, login
   Operatore e Amministratore indipendenti).
2. Lo stesso identico valore "2/3" appare su entrambe — prova diretta che le due viste leggono la
   stessa fonte di verita', non stato duplicato/disallineabile.
3. Il click-through naviga all'Agenda corretta per ciascun ruolo.
4. **Una sola** richiesta `/therapy-slots` osservata per il caricamento della dashboard Operatore
   (che chiama sia `useAnomalieReparto` che `useRiepilogoSomministrazioni`) — conferma diretta,
   non solo teorica, del dedup di `cachedGetJson`.
5. Il valore "2/3" include esplicitamente il caso "1:00" non paddato — prova diretta che il fix
   del Round 2 funziona sui dati reali del componente, non solo per lettura del codice.

Screenshot in `screenshots/`: `01-dashboard-operatore.png`, `02-agenda-dopo-click-operatore.png`,
`03-dashboard-admin.png` (card "2/3 Somministrazioni in ritardo" in rosso, quinta card della banda
"Situazione Clinica", va a riga propria come previsto da clinicos-uiux), `04-agenda-dopo-click-admin.png`.
Dettaglio in `screenshots/verifiche.json`.

## Residual Risks

- **Dato reparto-wide, non per-operatore** (R1 nel contract): nessuna vera assegnazione
  paziente-operatore/turno esiste nel modello dati attuale — documentato, non colmato con
  un'entita' inventata, come da istruzione esplicita dell'iniziativa.
- **Nessuna sincronizzazione realtime fra sessioni diverse** (R2 nel contract): la card riflette lo
  stato al momento del caricamento/refresh (cache 60s), non istantaneamente. Introdurre
  polling/WebSocket tocca potenzialmente l'infrastruttura di produzione — fuori scope autonomo,
  segnalato per una decisione esplicita se il prossimo loop dovesse prioritizzarlo.
- **Gap di accessibilita' pre-esistente non risolto** (R3): onClick senza role/tabIndex/onKeyDown
  su tutte le `kpi-alert-card` cliccabili, inclusa la nuova (eredita fedelmente il pattern delle
  sorelle esistenti). Da affrontare in un ciclo dedicato all'intera famiglia di componenti.
- **Autocertificazione parziale**: implementer e QA sono sub-agenti della stessa sessione; la
  verifica Playwright e la rilettura del diff finale in questo report sono state fatte da me (il
  coordinatore) indipendentemente da entrambi.

## Final Decision

CLOSED — VERIFIED

Ogni AC del contract e' verificato: quelli statici tramite lettura del codice e i gate
tsc/build/test/eslint (ri-verificati indipendentemente dopo la correzione del Round 2), quelli a
runtime (AC-R1, AC-R2) tramite un browser reale contro entrambe le dashboard, con prova diretta —
non solo lettura del codice — che il difetto trovato dal gate QA e' davvero risolto sui dati reali
del componente. Il gate QA di Round 1 ha bloccato un difetto concreto (undercount silenzioso del
numero che la card promette di azzeccare) prima che raggiungesse questo report.
