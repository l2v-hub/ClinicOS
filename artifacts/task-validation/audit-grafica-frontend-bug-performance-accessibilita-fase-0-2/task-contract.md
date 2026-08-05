# Task Contract

## Task
- Title: Audit grafica frontend: bug, performance, accessibilita (Fase 0-2)
- Slug: audit-grafica-frontend-bug-performance-accessibilita-fase-0-2
- Type: bugfix
- Date: 2026-08-02

## Scope Note (2026-08-05)

Al momento di chiudere questo task e' emerso che l'implementazione copriva solo la Fase 0
(AC1-AC3, bug oggettivi). Fase 1 (performance, AC4-AC8) e Fase 2 (accessibilita', AC9-AC14)
non erano mai state scritte (nessuna modifica a `vite.config.ts`, `index.html`,
`TeamsLikeSidebar.tsx`; nessun `React.lazy`/`import()` dinamico in App.tsx/PatientDetail.tsx).
Questo contract viene chiuso con scope ridotto a Fase 0 soltanto: vedi
`validation-report.md` per il dettaglio verificato. Fase 1 e Fase 2 restano backlog
separato, da riaprire come task-contract dedicato quando ripresi.

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
| Config / Env | yes (vite.config.ts: vendor chunk, nessuna var d'ambiente) |

## Current Behaviour

Audit statico (swarm RuFlo, sola lettura, 3 agenti paralleli: performance, ui/ux,
consistency) su commit main@a12510dc ha rilevato, con evidenza a file/riga:

Fase 0 — bug oggettivi:
- `App.css:6119` — `@import './clinicos-restyle.css'` in fondo al file (posizione non
  valida per spec CSS), risultato: mix parziale e imprevedibile dei due set di token.
- `var(--muted)` non definita, usata in RicercaFarmaco.css, CampoFarmaco.css,
  VisoreDocumentoFarmaco.css, AvvisoAnomalieFarmaci.css → testo nero pieno invece che
  grigio.
- `var(--hover-bg)` non definita in app-additions.css:6539 → nessun feedback hover
  sulle righe della tabella uscite.
- `var(--blue-bg)` senza fallback in DimissioneTab.tsx:1706 → chip con sfondo
  trasparente.
- `<>` senza `key` dentro `.map()` in AdminAgenda.tsx:322 → warning React.
- `className="alert alert--error"` in RoomsManagement.tsx:293-313 — classi inesistenti,
  aspetto ricostruito con proprietà inline.

Fase 1 — peso/velocità (misurato sul bundle):
- `lib/codiceFiscale.ts:5` importato eager per l'intera app, usato solo dal wizard
  nuovo paziente.
- `App.tsx:418, 722-752` — fetch `/cartella` per ogni paziente al login (N+1), un
  `setCartelle` per risposta.
- Font Google via `@import` in App.css:6 senza `preconnect` in index.html.
- `App.tsx:33-47`, `PatientDetail.tsx:29-38` — 15 pagine e 10 tab clinici importati
  staticamente, nessun code-splitting per schermata.
- `lib/entraAuth.ts:11` — MSAL (234 KB) eager per due soli componenti documentali.
- `vite.config.ts` — nessun chunk vendor separato.

Fase 2 — accessibilità/tablet (meccanico, nessuna decisione estetica):
- `TeamsLikeSidebar.tsx:77-101` — sidebar L1 è `<div onClick>`, non navigabile da
  tastiera.
- `App.css:3371-3375` — `.btn-sm` 34px `!important`, sotto soglia 44px per uso con
  guanti.
- `app-additions.css:6742-6744` — intestazioni tabella, contrasto 2,8:1 (soglia AA
  4,5:1).
- Nessuna media query `pointer:coarse`/`hover:none` nel progetto.
- 85/438 bottoni con `aria-label`; 15 file con bottoni solo-icona senza alcuna label
  (PatientDetail.tsx il peggiore: 9 bottoni, 0 label).
- Nessun modale con focus trap / restore focus / scroll lock (7 convenzioni di
  modale diverse).

## Expected Behaviour

- Tutti i punti di Fase 0 corretti: token CSS esistenti e coerenti, nessun warning
  React da key mancante, classi CSS reali al posto di ricostruzioni inline.
- Fase 1: bundle del percorso critico ridotto (target ~170-190 KB gzip vs 416 KB
  misurati), tramite lazy-load di codiceFiscale e MSAL, code-splitting per
  pagina/tab, fix N+1 su `/cartella`, preconnect font, vendor chunk separato.
- Fase 2: sidebar L1 navigabile da tastiera con semantica corretta, bottoni >=44px
  dove interattivi, contrasto intestazioni tabella >=4,5:1, affordance visibili anche
  senza cursore (pointer:coarse), aria-label sui bottoni solo-icona, focus trap +
  restore + scroll lock sui modali.
- Nessuna delle correzioni di Fase 3 (coerenza visiva: doppio header sezione,
  colori, tab pattern) o Fase 4 (fusioni/duplicazioni) incluse in questo contract —
  restano backlog separato per esplicita cautela dell'audit stesso.
- Build frontend e backend verdi, `tsc --noEmit` senza errori, nessuna regressione
  visiva sulle rotte principali.

## Acceptance Criteria

- AC1: `@import` di clinicos-restyle.css spostato in cima ad App.css; build CSS
  risultante ha token coerenti (nessun mix parziale tra i due set).
- AC2: `--muted`, `--hover-bg`, fallback per `--blue-bg` definiti/corretti; le 4+
  aree interessate (Farmaci, tabella uscite, chip dimissione) mostrano il colore
  atteso a schermo.
- AC3: key React univoca in AdminAgenda.tsx:322 (nessun warning console in dev);
  RoomsManagement.tsx usa classi CSS reali invece di stile inline ricostruito.
- AC4-AC8 (Fase 1, performance): **DEFERRED** — backlog separato, non incluso in
  questa chiusura (vedi Scope Note).
- AC9-AC14 (Fase 2, accessibilita'): **DEFERRED** — backlog separato, non incluso in
  questa chiusura (vedi Scope Note).
- AC15: `cd frontend && npx tsc --noEmit` e `npm run build` verdi; `cd backend &&
  npm run build` verde (nessuna modifica backend prevista, solo verifica di non
  regressione se toccati file condivisi). Verificato solo per l'ambito Fase 0
  effettivamente implementato.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Nessuna logica di dominio backend toccata |
| Integration | no | |
| API | no | Nessuna route toccata |
| Playwright | yes | Verifica visiva/interattiva di Fase 2 (tastiera, focus trap, contrasto) e non-regressione su rotte principali dopo code-splitting |
| Persistence after refresh | no | Nessun dato persistito modificato |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

Required evidence:

- validation-report.md
- output build (`tsc --noEmit`, `vite build`) con dimensioni bundle prima/dopo
- screenshots delle rotte principali post-modifica (dashboard, cartella paziente,
  tabella farmaci, sidebar)
- Playwright trace per navigazione da tastiera sulla sidebar e per un modale
  (focus trap)
- nessun log applicativo coinvolto (nessuna modifica backend/AI)

## Risks

- Code-splitting (React.lazy) può introdurre flash-of-loading o rompere route
  dirette se non gestito con Suspense/fallback coerenti — mitigazione: verificare
  ogni rotta manualmente dopo lo split.
- Fix del fetch N+1 su `/cartella` tocca un percorso dati usato ovunque nell'app —
  mitigazione: nessuna modifica allo shape della risposta, solo al pattern di
  chiamata/aggregazione lato frontend.
- Alzare `.btn-sm` a 44px può rompere layout compatti esistenti (tabelle strette) —
  mitigazione: verifica visiva su tutte le schermate che lo usano prima di
  committare.
- Spostare l'`@import` di clinicos-restyle.css in cima cambia quali token vincono
  ovunque nell'app — mitigazione: screenshot comparativo delle rotte principali.

## Gate Status

READY FOR IMPLEMENTATION
