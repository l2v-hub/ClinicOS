# Task Validation Report

## Task

- Title: Interfaccia al 90 per cento sui tablet
- Slug: interfaccia-al-90-per-cento-sui-tablet
- Commit: (vedi PR)
- Date: 2026-09-29

## Implementation Summary

- **`lib/tabletScale.ts`** (nuovo):
  - `isTabletScreen` riconosce come tablet uno schermo touch con lato corto ≥ 700 px e lato lungo ≤ 1400 px.
  - `applyTabletScale` imposta sul meta viewport `width=device-width, initial-scale=0.9`, solo sui tablet.
- **`main.tsx`**: chiama `applyTabletScale()` prima di disegnare. È un modulo e non uno script inline, perché la CSP permette solo script dello stesso sito.
- **Effetto**:
  - Sul tablet il browser impagina come se lo schermo fosse circa il 10% più largo e mostra tutto al 90%.
  - Nessuna regola CSS cambia e le altezze a tutto schermo restano corrette.
  - Computer e telefoni non cambiano.
- **Scartato: `zoom: 0.9` in CSS.** Con lo zoom anche le altezze vh/svh/dvh si riducevano: la sidebar si fermava a 738 px su 820 e sotto restava una striscia vuota.
- **Test**: `tabletScale.test.ts`, 3 test.

## Files Changed

- frontend/src/lib/tabletScale.ts (nuovo), frontend/src/main.tsx
- frontend/src/lib/\_\_tests\_\_/tabletScale.test.ts (nuovo)

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                     |
| --- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 |   PASS | iPad Pro 11" emulato (mobile, touch). In orizzontale: meta a 0.9, larghezza CSS 1326 (1194 / 0.9 = 1327), scala 0.90, un controllo da 48 px occupa 43 px. In verticale: larghezza CSS 926 (834 / 0.9 = 927). |
| AC2 |   PASS | Telefono (iPhone 13) e computer a 1180 e 1440 senza touch: meta invariato a 1.0, scala 1.                                                                                                                    |
| AC3 |   PASS | Su Turno, Pazienti e Terapia, sia in orizzontale sia in verticale, la sidebar arriva fino in fondo (926/927 e 1326/1326) e non c'è scorrimento orizzontale.                                                  |
| AC4 |   PASS | build.txt exit 0; unit-full.txt con i soli fallimenti della baseline; tabletScale 3/3.                                                                                                                       |

## Test Results

| Test                                    | Result | Evidence                          |
| --------------------------------------- | -----: | --------------------------------- |
| Unit                                    |   PASS | tabletScale 3/3; suite (baseline) |
| Playwright                              |   PASS | evidence.mjs 10/10                |
| Integration, API, Persistence, Security |     NA | nessuna API toccata               |

## Runtime Evidence

- screenshots/ipad11-orizzontale-{turno,pazienti,terapia}.png, ipad11-verticale-\*, telefono-\*, computer-1180-\*, computer-1440-\*
- logs/playwright-evidence.txt, unit-full.txt, build.txt

## Independent QA

- clinicos-qa: READY FOR QA, senza bloccanti.
  - Soglie verificate su dispositivi reali: dentro iPad mini/Air/11/12,9/13 e tablet Android da 712 a 1032; fuori telefoni, Nexus 7 e Tab S9 Ultra.
  - Rotazione: ok. CSP: ok. Pinch non bloccato a livello di meta.
  - Sonde su tutte le pagine operatore, cartella (8 schede), scheda d'ingresso e Assistente, in verticale e orizzontale: 0 errori, nessuno scorrimento, pannelli fissi a posto. Telefono e computer invariati.
  - Suite 899/908 (baseline).

## Residual Risks

- Il testo da 12 px diventa circa 10,8 px sullo schermo (identificativi, collocazione, dettagli degli avvisi); i badge più piccoli circa 9,5 px. Da valutare con l'utente sul dispositivo.
- Sui tablet in verticale il layout passa alla fascia superiore dei breakpoint CSS (per esempio iPad 11 da 834 a 926 px). Non è solo una riduzione di scala; nessuna rottura trovata.
- I log in logs/ restano locali (ignorati da git): gli esiti sono riportati in questo report.

- L'emulazione di Chromium non è Safari su un iPad reale: la conferma finale spetta all'utente, sul suo tablet.
- I controlli da 48 px diventano circa 43 px sullo schermo, poco sotto i 44 pt raccomandati per il tocco: va valutato con l'utente.
- I tablet con lato lungo oltre i 1400 px restano a scala 1.

## Final Decision

CLOSED — VERIFIED
