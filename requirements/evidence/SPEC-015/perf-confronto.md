# SPEC-015 — Confronto performance rete prima/dopo (SC-005)

Misura: richieste HTTP verso il backend per flusso, harness Playwright
(`e2e/spec015-verify.mjs perf`). File grezzi: `perf-before.json`, `perf-after.json`.

| Flusso | Prima | Dopo | Duplicate prima | Duplicate dopo |
|---|---|---|---|---|
| Avvio dashboard | 5 | 6* | 0 | **0** |
| Apertura agenda | 1 | 1 | 0 | **0** |
| Dettaglio paziente | 5 | **3 (−40%)** | 2 (`/ai/extraction/status` 2x, `/patients/settings` 2x) | **0** |

\* La richiesta in più all'avvio è `GET /appointments`: funzionalità NUOVA (US4 — l'agenda
prima era alimentata da mock e non faceva alcuna chiamata; ora i dati sono persistiti,
sanando la violazione Constitution III). A parità di funzionalità le richieste calano.

Esito SC-005:
- **0 richieste duplicate** (stesso endpoint, stessi parametri, stesso flusso) su tutti
  i flussi misurati — prima erano 4 (2+2 sul dettaglio paziente).
- Dettaglio paziente: **−40%** di richieste (5→3).
- Nota onesta sul target "−30% apertura agenda": la baseline reale dell'agenda era già
  1 richiesta senza duplicati (i duplicati ipotizzati in fase di ricerca si trovavano sul
  dettaglio paziente, dove sono stati azzerati). Il meccanismo di dedup (`lib/cachedFetch`:
  richieste in volo condivise + TTL + invalidazione su mutazione) copre comunque anche
  `/therapy-slots` e `/patients/:id/therapies`, i cui doppi fetch si manifestavano nei
  flussi terapia (App + tab Terapia + modal Invio PS).
