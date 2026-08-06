# Task Contract

## Task
- Title: Loop UX ciclo 2: coerenza tab cartella paziente
- Slug: loop-ux-ciclo-2-coerenza-tab-cartella-paziente
- Type: refactor
- Date: 2026-08-06

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
| Config / Env | no (fix di un bug di risoluzione URL lato frontend, nessuna variabile nuova) |

## Current Behaviour

Due problemi distinti trovati analizzando/verificando i tab della cartella paziente:

1. **Duplicazione stato di caricamento**: 6+ punti in `DiarioPazienteTab.tsx` e
   `TerapiaFarmacologicaTab.tsx` reimplementano lo stesso blocco "in caricamento" ognuno col
   proprio `style={{ color: 'var(--text-muted)', fontSize: 13 }}` inline e un testo leggermente
   diverso ("Caricamento…", "Caricamento...", "Caricamento storico...").
2. **Bug reale trovato verificando dal vivo la tab Terapia Farmacologica**: `useAnomalieReparto.ts`,
   `TerapiaFarmacologicaTab.tsx`, `CampoFarmaco.tsx`, `RicercaFarmaco.tsx`, `farmacoRiferimento.ts`,
   `InvioPSModal.tsx` e `intakeDraftApi.ts` reimplementavano ciascuno la propria versione locale
   della risoluzione di `API_URL` (invece di importarla da `config.ts`, l'unica fonte corretta con
   il fallback a `localhost:3001` in sviluppo). Due di queste copie mancavano del fallback: con
   `VITE_API_URL` non impostata (sviluppo locale senza `.env`), le richieste diventavano relative e
   finivano sul dev server del frontend invece che sul backend, che risponde con l'HTML della SPA
   — la tab Terapia Farmacologica mostrava un banner d'errore "Unexpected token '<'... is not valid
   JSON" invece dei dati. In produzione il bug è mascherato (Vercel imposta `VITE_API_URL`), ma
   resta una landmine e comunque una violazione diretta di "un solo posto per la stessa logica".

## Expected Behaviour

- Un unico componente condiviso `LoadingState` (in `cartella/shared.tsx`, accanto a `EmptyState`
  già esistente) per lo stato di caricamento transitorio, usato da tutti i punti individuati.
- Un'unica fonte per `API_URL` (`config.ts`, reso sicuro sotto `node:test` con lettura difensiva);
  tutti gli altri file la importano invece di duplicarla. Nessun cambiamento di comportamento in
  produzione (dove `VITE_API_URL` è già impostata); in sviluppo locale senza `.env` esplicito, le
  chiamate ora raggiungono correttamente il backend.

## Acceptance Criteria

- AC1: `LoadingState` esiste in `cartella/shared.tsx`; `DiarioPazienteTab.tsx` e
  `TerapiaFarmacologicaTab.tsx` lo usano al posto dei blocchi inline duplicati (stesso testo di
  default "Caricamento…", override esplicito dove il testo è genuinamente diverso, es. "storico").
- AC2: nessuna definizione locale di `API_URL` resta fuori da `config.ts`; tutti i file che la
  usavano ora la importano da lì.
- AC3: `config.ts` resta sicuro da importare sotto `node:test` (lettura difensiva di
  `import.meta.env`) — la suite frontend (`npm test`, node:test-based) continua a passare.
- AC4: verificato dal vivo che la tab Terapia Farmacologica non mostra più l'errore di parsing e
  che Diario/Terapia si comportano visivamente come prima (nessuna regressione).
- AC5: `tsc --noEmit`, `npm run build`, `npm test` puliti su frontend.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | `npm test` (node:test) copre indirettamente l'import di `config.ts` da più moduli — verifica che la lettura difensiva regga. |
| Integration | no | |
| API | no | Nessuna route backend toccata. |
| Playwright | yes | Unico modo per osservare il bug reale (richiesta verso l'origine sbagliata) e confermarne la correzione. |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

Required evidence:

- validation-report.md
- output build (`tsc --noEmit`, `npm run build`, `npm test`)
- screenshot Diario/Terapia Farmacologica prima/dopo
- conteggio richieste di rete (origine backend vs frontend) prima/dopo il fix API_URL

## Risks

- Il fix di `API_URL` non è osservabile in produzione (dove `VITE_API_URL` è già corretta) né in
  CI (che la imposta esplicitamente nei workflow) — la sua unica evidenza pratica è lo sviluppo
  locale senza `.env`, dove è stato riprodotto e verificato in questa sessione.
- `LoadingState`/`EmptyState` non toccano `NarrativeSectionsTab.tsx` (usa già `className="cr-empty"`
  in modo self-consistente, testo diverso per contesto) né `EsamiConsulenzeTab.tsx` (uno stato
  "Caricamento…" inline accanto a un'etichetta di upload, contesto diverso da un blocco a piena
  larghezza) — lasciati fuori scope perché forzarli nello stesso componente avrebbe rotto il layout
  o sostituito qualcosa che è già coerente, non incoerente.

## Gate Status

READY FOR IMPLEMENTATION
