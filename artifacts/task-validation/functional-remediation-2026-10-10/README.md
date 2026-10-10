# Evidenze sintetiche della verifica funzionale

Consultare [il rapporto](../../../docs/qa-functional-remediation-2026-10-10.md) per perimetro, risultati e limiti.

- `validation.json`: conteggi, stato produzione e hash dei sorgenti modificati e delle prove.
- `api-results.json`: 487 controlli, tutti passati; dati esclusivamente sintetici.
- `browser-results.json`: 92 viste e telemetria; nessun errore inatteso raccolto.
- `therapy-browser-results.json`: inventario completo di 105 prescrizioni e dosi separate.
- `assessment-lifecycle-results.json`: sette moduli, snapshot/scoring/PDF/immutabilità.
- `session-isolation-results.json`: risposta tardiva oltre logout, cache vuota e OSS negato.
- `narrative-browser-results.json`: errore su revisione vuota, editor e revisione precedente conservati.
- `original-issues-browser-results.json`: etichette, tastiera, calendario, coda e controlli clinici.
- `*-tests.txt`, `*-build.txt`, `therapy-import-api.txt`, `import-browser.txt`: risultati completi dei runner.
- `lint-comparison.json`: confronto con la base; il lint globale ha debito preesistente.
- `synthetic-db-inventory.json`: prova **locale**, in sola lettura; non riguarda la produzione.
- `generated-pdf-proof/`: PDF sintetici rigenerati durante le suite, senza riscrivere le evidenze storiche.

I test mirati non si sommano alle suite complete. Le tracce browser contenenti traffico e sessioni sono mantenute fuori dal repository. Nessuna credenziale, paziente reale o operazione di eliminazione produttiva è inclusa.
