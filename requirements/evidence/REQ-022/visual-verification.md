# REQ-022 — Visual Verification

Iterazioni: build → app reale (mock backend + frontend) → driver Playwright → screenshot → confronto criteri.

## Risultato: PASS

| Stato | Evidenza | Esito |
|-------|----------|-------|
| Upload (più documenti) | after-desktop.png / after-tablet.png | PASS — 2 documenti, controlli ordina/retake/rimuovi, Doc. logico |
| Elaborazione async (stato visibile) | processing-desktop.png / processing-tablet.png | PASS — "In coda…" + spinner, "Elaborazione in corso…" (bottone disabilitato, HTTP non bloccante) |
| Revisione precompilata | review-desktop.png / review-tablet.png | PASS — step Revisione, banner nuovo/esistente, campi |

- Desktop 1366×768 + tablet 1024×768.
- 0 console errors in entrambi i viewport; reachedReview=true.
- UI minima: nessun rifacimento della popup, solo barra stato/avanzamento + retry su errore.
- La barra mostra fase (In coda → Caricamento → Analisi AI → Validazione), file corrente ed elapsed quando disponibili.
