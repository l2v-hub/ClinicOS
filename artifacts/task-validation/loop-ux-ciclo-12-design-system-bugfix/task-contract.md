# Task Contract

## Task

- Title: Loop UX ciclo 12 - Design system globale, primo giro di correzioni CSS oggettive
- Slug: loop-ux-ciclo-12-design-system-bugfix
- Type: fix (design system, frontend-only)
- Date: 2026-08-08

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Contesto

Primo ciclo della nuova iniziativa "design system globale" (vedi
`frontend/src/design-system/README.md`). Fase 1 (Experience Map + Identify Friction) eseguita con
due agenti Ruflo reali (ricerca via Task tool, risultati riportati in Ruflo con
agent_update/task_complete/memory_store) sul flusso rappresentativo Operatore: Dashboard →
Pazienti → Cartella paziente → ritorno. Trovati 10 problemi di esperienza utente e 10 incoerenze
visive.

Questo ciclo corregge SOLO i 4 difetti OGGETTIVI (bug reali, non preferenze estetiche discutibili)
trovati dall'analisi — il resto e' backlog deliberatamente differito (vedi README, sezione
"Backlog aperto").

## Expected Behaviour

- `.empty-state-card` ha una sola definizione CSS (quella con icona/flex/bordo tratteggiato), non
  piu' due definizioni contraddittorie dove una vince per ordine di `@import` senza che nessuno lo
  intendesse.
- I bottoni Modifica/Elimina in Esami & Consulenze sono visibilmente stilizzati (classi CSS reali,
  non fantasma).
- I badge blu/verde/ambra usano i token colore condivisi, non esadecimali hardcoded scollegati dal
  resto del design system.
- Il banner di errore impostazioni (Lista pazienti, Diario) usa variabili CSS che esistono
  davvero.

## Acceptance Criteria

### Verificati staticamente

- AC1 — `.empty-state-card` definita una sola volta in tutto `frontend/src` (in
  `app-additions.css`), rimossa la duplicata contraddittoria in `App.css`.
  _Verifica: gate QA indipendente, grep repo-wide + verifica del ragionamento sull'ordine di
  cascata CSS (`@import` inserisce le regole PRIMA, quindi le regole scritte dopo nello stesso
  file vincono a parita' di specificita')._
- AC2 — `.btn-icon`/`.btn-icon--danger` (classi mai definite in nessun CSS) sostituite con il
  pattern canonico `icon-btn icon-btn--sm icon-btn--edit/danger` in `EsamiConsulenzeTab.tsx`,
  verificato con grep repo-wide che non ne restino altre occorrenze in codice sorgente.
  _Verifica: gate QA indipendente._
- AC3 — `badge--blue/green/amber` usano `var(--blue)`/`var(--emerald)`/`var(--amber)` invece di
  esadecimali hardcoded; confermato che `--emerald` e' un token gia' riusato altrove nel repo per
  lo stesso significato (non inventato per l'occasione).
  _Verifica: gate QA indipendente._
- AC4 — `var(--red-50, #fef2f2)`/`var(--red-700, #b91c1c)` (variabili mai definite, fallback
  sempre attivo) sostituite con `var(--red-bg)`/`var(--red)` in `PatientList.tsx` E
  `DiarioPazienteTab.tsx` (seconda occorrenza trovata durante l'implementazione, non nella lista
  originale del task).
  _Verifica: gate QA indipendente, grep repo-wide._
- AC5 — `npx tsc --noEmit` pulito, `npm run build` verde, `npm test` frontend 140/140 invariato,
  `eslint --no-cache` zero errori nuovi (4 preesistenti confermati identici tramite confronto con
  `git show HEAD:<path>`, non `git stash`).
  _Verifica: eseguiti da clinicos-implementer, ri-verificati indipendentemente da clinicos-qa._

### Aperti — verificati a runtime nel validation-report

- AC-R1: i colori badge risultano davvero quelli dei token (non solo nel CSS sorgente, nel colore
  RENDERIZZATO calcolato dal browser).
- AC-R2: i bottoni icona in Esami & Consulenze hanno davvero uno stile visibile applicato (non
  transparent/senza bordo).
- AC-R3: la empty-state-card mostra davvero `display:flex` e bordo tratteggiato una volta
  renderizzata (non solo nel CSS sorgente).

## Test Plan

| Test type                 | Required | Reason                                                                                                                                                                                                                              |
| ------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                      |       no | fix CSS/markup puri, nessuna logica di dominio                                                                                                                                                                                      |
| Integration               |       no | nessun modulo backend toccato                                                                                                                                                                                                       |
| API                       |       no | nessuna modifica                                                                                                                                                                                                                    |
| Playwright                |      yes | il ciclo cambia l'aspetto RENDERIZZATO (non solo il sorgente CSS) di 3 pattern diversi — richiede un browser reale, "i test passano" non e' sufficiente per dichiarare il ciclo completo (richiesto esplicitamente dall'iniziativa) |
| Persistence after refresh |       no | nessuna modifica al modello dati                                                                                                                                                                                                    |
| Security/privacy          |       no | nessun dato coinvolto                                                                                                                                                                                                               |

## Risks

**R1 — Il colore di `badge--green`/`--amber`/`--blue` cambia visivamente** (es. verde da `#0e8a63`
a `#16a37b`). Cambiamento intenzionale e minimo (stessa famiglia percettiva), non un difetto:
allinea questi 3 badge allo stesso token gia' usato da `badge--red` e da decine di altri componenti
nel repo.

**R2 — La `.empty-state-card` cambia aspetto renderizzato** (da bordo solido a tratteggiato, da
blocco centrato a flex-column con icona) in 5 componenti (`OperatorSchedule.tsx`,
`ConsegnePage.tsx`, `MultiPatientParametri.tsx`, `PatientList.tsx`, `NotesPage.tsx`). Non e' un
nuovo design: e' la versione GIA' SCRITTA con l'intento di essere quella vera (supporta uno slot
icona dedicato), semplicemente mai renderizzata a causa del bug di cascata CSS. Nessun rischio di
regressione comportamentale, solo visivo, e nella direzione gia' intesa da chi l'aveva scritta.

**R3 — Fuori ambito, deliberatamente.** Backlog completo del design system (5 sistemi di badge da
consolidare, 4 implementazioni di tab bar, unificazione PageHeader/PatientCompactHeader, perdita di
stato in PatientList, form residui al cambio paziente, bottone indietro che mente sulla
destinazione) — vedi `design-system/README.md`, non in questo ciclo.

## Gate Status

CLOSED — VERIFIED (vedi validation-report.md)
