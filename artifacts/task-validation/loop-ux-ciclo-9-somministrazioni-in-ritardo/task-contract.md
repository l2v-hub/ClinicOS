# Task Contract

## Task
- Title: Loop UX ciclo 9 - Somministrazioni in ritardo (Clinic Control Center, primo incremento)
- Slug: loop-ux-ciclo-9-somministrazioni-in-ritardo
- Type: feature (frontend-only, single source of truth cross-ruolo)
- Date: 2026-08-08

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

## Contesto: nuova direzione di prodotto

Primo loop dell'iniziativa "Clinic Control Center" (sincronizzare Admin e Operatore sullo stesso
stato operativo, principio TASKS <-> THERAPIES <-> ALERTS condiviso fra i ruoli). Analisi
congiunta dei due percorsi richiesti (ADMIN: issue -> operatore/paziente -> azione; OPERATORE:
My Shift -> pazienti/task -> completamento) tramite due agenti Explore in parallelo. Trovato un
gap netto e coerente col principio guida: le somministrazioni/terapie di oggi (il modello di
"task" ricorrente piu' strutturato gia' esistente: `MedicationAdministration`, stato
da_erogare/erogata/non_erogata, orario programmato) **non compaiono in nessuna delle due
dashboard**, ne' Admin ne' Operatore.

Non esiste un concetto di "task" esplicito nel modello dati, ne' una vera assegnazione
paziente-operatore/turno (documentato come gap, non colmato con un'entita' inventata, per
istruzione esplicita "do NOT invent duplicate entities... if something does not exist, document
the gap"). Il dato piu' vicino e coerente resta la somministrazione, letta dall'endpoint
reparto-wide gia' in uso da altre viste (`GET /therapy-slots?date=`).

## Expected Behaviour

Una card KPI "Somministrazioni in ritardo" (X in ritardo su Y ancora da fare, oggi, in tutto il
reparto) compare in ENTRAMBE le dashboard, con lo stesso numero (stessa fonte dati, nessuna
duplicazione di stato), risponde direttamente alla domanda ADMIN "chi/cosa richiede la mia
attenzione ORA?" e OPERATORE "cosa devo fare adesso?", ed e' cliccabile verso l'Agenda del
rispettivo ruolo (dove le somministrazioni sono gia' visibili, interpolate nella griglia oraria).

## Acceptance Criteria

### Verificati staticamente

- AC1 — Nuovo hook `useRiepilogoSomministrazioni` (in
  `frontend/src/components/operator/cartella/`, stesso pattern del gemello gia' esistente
  `useAnomalieReparto`): aggrega `GET /therapy-slots?date=` (endpoint gia' esistente, nessuna
  nuova rotta) in `{totale, daFare, fatte, nonErogate, inRitardo, inCorso}`.
  *Verifica: lettura del codice, gate QA indipendente.*
- AC2 — Card aggiunta alla banda `kpi-alert-grid` gia' esistente in ENTRAMBE `OperatorDashboard.tsx`
  e `AdminDashboard.tsx`, seguendo lo stile gia' presente in ciascun file (non uniformato fra i
  due file, deliberatamente fuori scope). Icona `IcoPill` (gia' usata altrove per "farmaco").
  Soglia colore binaria: rosso se `inRitardo>0`, verde se 0, blu neutro mentre `inCorso` (non un
  falso allarme prima che il dato sia noto). Spec confermata da clinicos-uiux.
  *Verifica: lettura del codice, screenshot.*
- AC3 — Nessuna richiesta di rete duplicata: `useAnomalieReparto` e `useRiepilogoSomministrazioni`
  leggono lo STESSO URL (`/therapy-slots?date=oggi()`) tramite `cachedGetJson`, che deduplica per
  URL — usarli entrambi nella stessa dashboard non raddoppia la chiamata.
  *Verifica: lettura di `cachedFetch.ts` dal gate QA + conferma a runtime (vedi AC-R1).*
- AC4 — **Difetto trovato e corretto dal gate QA indipendente**: il confronto iniziale
  `scheduledTime < soglia` era un confronto fra STRINGHE "HH:mm", corretto solo se entrambe
  zero-paddate. Il backend (`normalizeSchedules`, `backend/src/lib/therapy-dose.ts`) accetta anche
  ore a una cifra ("8:30") senza zero-paddarle — un valore cosi', confrontato lessicograficamente,
  risulterebbe FALSO anche se realmente in ritardo (undercount silenzioso). Non raggiungibile
  dall'unico form dell'UI (che usa `<input type="time">`, sempre normalizzato dal browser), ma un
  contratto dati incidentale, non validato. Corretto con un confronto numerico in
  minuti-da-mezzanotte (`minutiDaMezzanotte`, robusto a ore non paddate, `NaN`-safe: un formato
  illeggibile non conta mai come "in ritardo" — falso negativo piu' sicuro di un falso allarme).
  *Verifica: lettura del codice + **test runtime dedicato** che riproduce esattamente questo caso
  (vedi AC-R2).*
- AC5 — `npx tsc --noEmit` pulito, `npm run build` verde, `npm test` 140/140 invariato,
  `eslint --no-cache` zero errori nuovi (incluse `react-hooks/refs`/`react-hooks/set-state-in-effect`,
  React Compiler).
  *Verifica: eseguiti da clinicos-implementer, ri-verificati indipendentemente da clinicos-qa e da
  me dopo la correzione.*

### Aperti — verificati a runtime nel validation-report

- AC-R1: la card compare su entrambe le dashboard con lo STESSO valore, il colore/soglia sono
  corretti a schermo, il click-through naviga all'Agenda giusta per ruolo, e viene generata una
  sola richiesta `/therapy-slots` per dashboard caricata (non due).
- AC-R2: l'orario non zero-paddato viene contato correttamente come "in ritardo" (prova diretta
  del fix, non solo lettura del codice).

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | logica del hook semplice (aggregazione + un confronto numerico), coperta dal test runtime end-to-end che riproduce il caso limite direttamente sui dati reali del componente |
| Integration | no | nessun modulo backend toccato |
| API | no | nessuna modifica API, stesso endpoint gia' in uso |
| Playwright | yes | verifica cross-dashboard (stesso dato, due viste) e il caso limite del difetto corretto richiedono un browser reale |
| Persistence after refresh | no | nessuna modifica al modello dati |
| Security/privacy | yes | nessuna nuova esposizione: stesso endpoint, nessun dato aggiuntivo verso il client |

## Risks

**R1 — Il conteggio resta reparto-wide, non per-operatore.** Documentato esplicitamente nel
commento del hook: non esiste nel modello dati attuale una vera assegnazione paziente-operatore/
turno (confermato dall'analisi Explore su entrambi i lati). "In ritardo" mostra quindi il dato di
TUTTO il reparto anche nella dashboard del singolo operatore — coerente con lo stesso limite gia'
accettato per `useAnomalieReparto`. *Non risolto in questo ciclo* (richiederebbe un modello di
turno/assegnazione che oggi non esiste — fuori scope per "non inventare entita' duplicate";
eventualmente da proporre come cambiamento di schema in un ciclo futuro, con approvazione esplicita
per lo STOP-before-changing su database schema).

**R2 — Nessuna vera sincronizzazione realtime fra sessioni diverse.** La card si aggiorna al
prossimo caricamento/refresh della dashboard (cache 60s), non istantaneamente quando un altro
operatore in un'altra sessione completa una somministrazione. Documentato, non risolto: introdurre
polling/WebSocket e' una scelta architetturale che tocca potenzialmente l'infrastruttura di
produzione — fuori scope autonomo per questo ciclo, da proporre esplicitamente se richiesto.

**R3 — Fuori ambito, deliberatamente.** Nessuna unificazione del markup delle due dashboard (stili
diversi mantenuti per file, come gia' erano). Nessun fix del gap di accessibilita' pre-esistente
sulle `kpi-alert-card` cliccabili (onClick senza role/tabIndex/onKeyDown) — presente su TUTTE le
card della banda gia' prima di questo ciclo, non introdotto ne' peggiorato qui; segnalato da QA,
da affrontare in un ciclo dedicato all'intera famiglia di componenti.

## Gate Status

CLOSED — VERIFIED (vedi validation-report.md)
