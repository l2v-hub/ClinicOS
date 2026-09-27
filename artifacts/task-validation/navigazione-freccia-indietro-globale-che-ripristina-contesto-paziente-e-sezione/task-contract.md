# Task Contract

## Task

- Title: Navigazione: freccia indietro globale che ripristina contesto, paziente e sezione
- Slug: navigazione-freccia-indietro-globale-che-ripristina-contesto-paziente-e-sezione
- Type: feature
- Date: 2026-09-27

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
| Privacy / Security   |      yes |
| Config / Env         |       no |

Privacy/Security: la cronologia del browser (`history.state`) conterrà l'etichetta della
destinazione precedente, che può includere il nome del paziente. Resta nella sessione del browser
(non va in URL, log o server). L'hash URL continua a contenere solo l'id opaco del paziente,
come oggi.

## Current Behaviour

- Esiste una cronologia (`pushState`/`popstate`), ma:
  1. tornando indietro a una cartella non si ripristina **quale** paziente: passando da A a B,
     "indietro" resta su B;
  2. i cambi di sezione della cartella (gruppi e tab) non entrano nella cronologia, quindi
     "indietro" non riporta alla sezione in cui si era;
  3. non esiste una freccia indietro sempre visibile: c'è solo il pulsante nella testata della
     cartella.

## Expected Behaviour

- Una freccia "‹ <destinazione>" nella barra superiore, su ogni pagina, riporta alla vista
  precedente e dice dove porta (es. "‹ Pazienti", "‹ Rossi, Giuseppe · Diagnosi").
- Tornando indietro si ripristinano la pagina, il paziente e la sezione della cartella.
- Il pulsante "indietro" del browser e Alt+← fanno la stessa cosa.

## Acceptance Criteria

- AC1: funzioni pure (`lib/navHistory.ts`) costruiscono l'etichetta della destinazione (pagina,
  oppure paziente + sezione) e lo stato da salvare. Unit test.
- AC2: nel browser, dalla dashboard → Pazienti → paziente A (sezione Contatti) → paziente B, la
  freccia mostra la destinazione corretta. Tornando indietro si passa da B ad A (sezione
  Contatti), poi alla lista Pazienti, poi alla dashboard.
- AC3: nel browser, cambiare sezione nella cartella crea un passo indietro verso la sezione
  precedente dello stesso paziente.
- AC4: senza cronologia (prima pagina), la freccia non compare, oppure porta alla pagina padre
  come oggi `goBack`.
- AC5: `npm run build` passa; nessun nuovo test fallito rispetto alla baseline (compresi i test
  di contratto sulla navigazione).

## Test Plan

| Test type                 | Required | Reason                                                        |
| ------------------------- | -------: | ------------------------------------------------------------- |
| Unit                      |      yes | etichette e stato della cronologia                            |
| Integration               |       no |                                                               |
| API                       |       no |                                                               |
| Playwright                |      yes | percorso reale avanti/indietro con pazienti diversi e sezioni |
| Persistence after refresh |       no | la navigazione resta di sessione                              |
| Agnos action registry     |       no |                                                               |
| Voice simulation          |       no |                                                               |
| OCR/import test           |       no |                                                               |
| Security/privacy scan     |      yes | verificare che nomi o dati clinici non finiscano nell'URL     |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (unit, unit-full, build)
- logs/playwright-evidence.txt (sequenza avanti/indietro, URL senza nomi)
- screenshots della freccia con la destinazione

## Risks

- I test di contratto sulla navigazione (stale-while-revalidate, lazy tabs) vincolano App.tsx:
  vanno eseguiti tutti.
- Ogni cambio di sezione aggiunge una voce alla cronologia: è voluto ("ogni volta che premo da
  qualche parte").

## Gate Status

READY FOR IMPLEMENTATION
