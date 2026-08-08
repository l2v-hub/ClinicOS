# Task Contract

## Task

- Title: Loop UX ciclo 13 - Sicurezza clinica: reset stato form/modale al cambio paziente
- Slug: loop-ux-ciclo-13-patient-switch-safety
- Type: fix (data-safety, frontend-only)
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

Trovato durante l'analisi del ciclo 12 (design system globale), backlog "Reset di stato al cambio
paziente non copre i form aperti" (`frontend/src/design-system/README.md`). `PatientDetail.tsx` e'
renderizzato senza `key={paziente.id}` in `App.tsx` — cambiare paziente mentre la cartella e' gia'
aperta (via ricerca globale, Agnos o `goToPazienteByNome`) NON smonta il componente, riusa la stessa
istanza. Un `useEffect` esistente gia' resettava la navigazione (`tab`/`activeGroup`/`diarioFilter`),
ma non i 22 stati di form/modale per-sezione (Profilo, Rischi, Note, Visite, Consegne, i 6
`cardModal`, i 2 quick-add, Camera, Invio in PS).

Rischio concreto: un form/modale rimasto aperto dopo il cambio paziente resta agganciato al
paziente sbagliato. Due casi in particolare leggono `paziente`/`cartella` come prop LIVE (non uno
snapshot) — se non chiusi, si retargetterebbero silenziosamente sul nuovo paziente.

## Expected Behaviour

- Tutti i 22 stati di form/modale per-sezione si resettano quando `paziente.id` cambia, esattamente
  come gia' avveniva per la navigazione (`tab`/`activeGroup`/`diarioFilter`).
- Un form inline lasciato aperto/in bozza per il paziente A (es. "+ Aggiungi Nota") non e' piu'
  visibile ne' precompilato quando si passa al paziente B.
- Nessun dato del form/modale del paziente precedente compare nella cartella del nuovo paziente.

## Acceptance Criteria

### Verificati staticamente

- AC1 — i 22 `setXxx(...)` di reset sono presenti nello stesso `useEffect` gia' esistente
  (`[paziente.id]`), fisicamente spostato dopo le rispettive dichiarazioni `useState` per evitare
  errori eslint di "usato prima della dichiarazione" (nessun impatto a runtime: gli effect girano
  dopo il render completo). Verifica: `git diff` — 42 righe rimosse in una posizione, 42 righe
  identiche riaggiunte dopo, nessuna modifica di logica.
- AC2 — `npx tsc --noEmit` pulito.
- AC3 — `npm run build` verde.
- AC4 — `npm test` frontend 140/140 invariato.
- AC5 — `eslint --no-cache` sullo stesso file: stesso numero di errori pre-esistenti (8, tutti
  `react-hooks/refs` su un `switchTab`/ref non collegato a questo fix), confermato confrontando
  con `git show HEAD:<path>` (non `git stash`).

### Aperti — verificati a runtime nel validation-report

- AC-R1: un form inline aperto con testo digitato per il paziente A (Note Cliniche) si chiude
  davvero (non solo nel codice) dopo lo switch al paziente B via ricerca globale, e il testo della
  bozza non appare da nessuna parte nella cartella di B.
- AC-R2: un form inline in modifica (Profilo) per il paziente B si chiude davvero dopo lo switch
  al paziente A.
- AC-R3: nessun errore JavaScript in console durante l'intero scenario.

## Test Plan

| Test type                 | Required | Reason                                                                                                      |
| ------------------------- | -------: | ----------------------------------------------------------------------------------------------------------- |
| Unit                      |       no | fix di stato React puro, nessuna logica isolabile in unit test                                              |
| Integration               |       no | nessun modulo backend toccato                                                                               |
| API                       |       no | nessuna modifica                                                                                            |
| Playwright                |      yes | il fix cambia comportamento RUNTIME (persistenza di stato tra render), non verificabile da tsc/build/eslint |
| Persistence after refresh |       no | nessuno stato persistito lato server                                                                        |
| Security/privacy          |       no | nessun dato coinvolto oltre a testo di bozza locale                                                         |

## Risks

**R1 — Scoperta collaterale durante il testing.** Il modale full-overlay "Invio in PS"
(`.modal-overlay`, z-index 1000) blocca fisicamente ogni click sullo sfondo, incluso il bottone di
ricerca globale — ma la scorciatoia globale `Ctrl+K` (listener su `window`, `App.tsx:486-496`) resta
attiva e apre comunque `.search-overlay` (z-index 300), che pero' finisce VISIVAMENTE SOTTO il
modale gia' aperto e diventa incliccabile. Risultato: con un modale full-overlay aperto, lo switch
paziente e' gia' irraggiungibile via UI (nessun rischio di retarget silenzioso in quel caso
specifico), ma la scorciatoia tastiera apre comunque un secondo overlay invisibile/rotto dietro il
primo — comportamento confuso, non pericoloso per i dati. Non corretto in questo ciclo (fuori
ambito: e' un bug di z-index/gestione focus dei modali, non di reset di stato); da riportare nel
backlog del design system.

**R2 — Fuori ambito, deliberatamente.** Bottone "indietro" che mente sulla destinazione, perdita di
stato in `PatientList`, unificazione `PatientCompactHeader`/`PageHeader` — vedi
`design-system/README.md`, non in questo ciclo.

## Gate Status

APERTO — vedi validation-report.md
