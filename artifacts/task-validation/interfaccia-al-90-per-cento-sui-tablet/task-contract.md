# Task Contract

## Task

- Title: Interfaccia al 90 per cento sui tablet
- Slug: interfaccia-al-90-per-cento-sui-tablet
- Type: feature
- Date: 2026-09-29

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

## Current Behaviour

Richiesta dell'utente (2026-09-29): sul tablet da 11 pollici l'interfaccia risulta molto grande. L'utente ha chiesto di ridurla di poco e vedere come viene. Per la misura ha scelto circa -10%, cioè il 90%.

L'app oggi usa `<meta name="viewport" content="width=device-width, initial-scale=1.0">` e il design system ha controlli da 48px. Su un iPad 11" in orizzontale la pagina è larga 1180-1194px CSS alla scala 1.

Una prova con `zoom: 0.9` in CSS è scartata. Le altezze in vh/svh/dvh (circa 70 regole) si riducono insieme alla pagina e lasciano una striscia vuota in basso (sidebar alta 738 su 820px). Inoltre Safari tratta lo zoom in modo diverso da Chrome.

## Expected Behaviour

Solo sugli schermi touch di taglia tablet (lato corto almeno 700px, lato lungo al massimo 1400px), il viewport della pagina parte a scala 0.9 (`width=device-width, initial-scale=0.9`). Il browser impagina come se lo schermo fosse circa il 10% più largo e mostra tutto al 90%:

- controlli, testi e spazi risultano più piccoli di circa il 10%, in proporzione;
- le altezze a tutto schermo restano corrette;
- nessuna regola CSS cambia.

Restano esclusi:

- i computer, che ignorano il meta viewport;
- i telefoni, con lato corto sotto i 700px, che restano a scala 1.

L'utente può comunque ingrandire con le dita. La logica sta in un modulo importato per primo in `main.tsx`, perché la CSP (`script-src 'self'`) non ammette script inline.

## Acceptance Criteria

- AC1: Sul tablet emulato (iPad 11" in orizzontale e in verticale, touch, mobile) il meta viewport ha `initial-scale=0.9`. La larghezza CSS della pagina è quella del dispositivo divisa per 0.9, con una tolleranza di un pixel, e un controllo da 48px CSS occupa circa 43px sullo schermo.
- AC2: Telefono emulato (390×844) e computer (1180 e 1440 senza touch): nessun cambiamento, il meta resta `initial-scale=1.0`.
- AC3: Sul tablet la sidebar e le pagine occupano tutta l'altezza (nessuna striscia vuota). Nessuno scorrimento orizzontale su Turno, Pazienti, Terapia, cartella e scheda d'ingresso.
- AC4: npm run build passa. La suite completa non ha fallimenti nuovi rispetto alla baseline. Il test unitario della regola "è un tablet?" passa.

## Test Plan

| Test type                 | Required | Reason                                                                                                                                                     |
| ------------------------- | -------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                      |      yes | regola pura sulla taglia dello schermo (tablet/telefono/computer) e applicazione del meta                                                                  |
| Integration               |       no |                                                                                                                                                            |
| API                       |       no |                                                                                                                                                            |
| Playwright                |      yes | emulazione iPad 11" (isMobile, touch) in orizzontale e verticale, telefono e computer: meta, larghezza CSS, altezze, overflow; screenshot per il confronto |
| Persistence after refresh |       no |                                                                                                                                                            |
| Agnos action registry     |       no |                                                                                                                                                            |
| Voice simulation          |       no |                                                                                                                                                            |
| OCR/import test           |       no |                                                                                                                                                            |
| Security/privacy scan     |       no |                                                                                                                                                            |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshot tablet prima/dopo (Turno, Pazienti, Terapia) e telefono/computer invariati
- log dell'evidence Playwright

## Risks

- **Verifica.** L'emulazione di Chromium non è Safari su iPad. La conferma finale è dell'utente sul suo tablet: il comportamento di `initial-scale` con `width=device-width` è standard su iOS e Android, ma va verificato sul dispositivo reale.
- **Tocco.** I controlli da 48px diventano circa 43px sullo schermo, sopra il minimo di 44pt indicato da Apple? Quasi: si tratta di un valore di tocco appena sotto il minimo, da verificare con l'utente sul dispositivo.
- **Tablet oltre i 1400px** di lato lungo restano a scala 1. Il 12,9" (1024×1366) rientra nella regola e va al 90%.

## Gate Status

READY FOR IMPLEMENTATION
