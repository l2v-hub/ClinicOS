# Evidenze sintetiche — retry funzionale del 12 ottobre 2026

Codice basato su `main` a `224a7e68`, con correzioni #441, #442, #460, #463 e #464. Il [rapporto](../../../docs/qa-functional-retry-2026-10-12.md) distingue prove correnti, skip, limiti e produzione.

- `unit-summary.json`: conteggi delle due fasi backend e della suite frontend completa; i log integrali restano fuori dal repository.
- `api-results.json`, `browser-results.json`, `therapy-browser-results.json`: operazioni HTTP, navigazione per ruolo e inventario di 106 prescrizioni.
- `scheduled-retry-results.json` e screenshot: risposta persa dopo un salvataggio reale, reload e replay con un solo record immutato.
- `assessment-results.json`, `session-isolation-results.json`, `import-api.txt`: sette moduli/PDF, cache isolata fra ruoli e import corrente.
- `night-before-fix.json` e `night-regression-tests.txt`: difetto riprodotto e prove di mezzanotte/ora legale.
- `single-dose-before-fix.json`, `single-dose-db-tests.txt`, `assistant-race-before-fix.txt`, `assistant-race-tests.txt`: prove mirate precedenti, raccolte prima dell'integrazione del nuovo `main`; le suite correnti verificano nuovamente quei casi.
- `archive-tests.txt`, `role-tests.txt`: harness PostgreSQL separati, senza skip o rimozione di guardie.
- `lint-comparison.json`, `ci-config-tests.txt`, `secret-scan.txt`: confronto del debito preesistente e verifiche tecniche.
- `validation.json`: hash dei sorgenti modificati e delle evidenze, conteggi e ambiente locale. Non contiene credenziali produttive né dati reali.

La cronologia del 10 ottobre resta nella sua cartella originale. Nessuna prova qui attesta una pulizia della produzione o l'utilizzo di provider esterni reali.
