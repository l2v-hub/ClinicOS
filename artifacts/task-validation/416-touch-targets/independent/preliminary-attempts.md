# Disclosed preliminary attempts

No evidence was discarded or overwritten.

1. `browser-first/`: roster and chart checks passed; catalog sequence failed at the test's post-reload assumption that simulator authentication survives. Actual page showed synthetic profile chooser. Corrected by explicit login after reload, with the same synthetic actor/context storage. This is a harness assertion correction, not an application fix. `test-results/preliminary-failure.json`, `screenshots/preliminary-failure.png`, `preliminary-failure-trace.zip`, raw video and `script-at-run.mjs` preserve the attempt. Initial direct command: `node node_modules/tsx/dist/cli.mjs artifacts/task-validation/416-touch-targets/independent/independent-browser.mjs artifacts/task-validation/416-touch-targets/independent/browser-first`; TSX_TSCONFIG_PATH=C:/w-416-qa/frontend/tsconfig.app.json; exit1. The subsequently corrected sidebar case uses `Posti Letto`, matching source.

2. `form-inventory/`: supplemental test used nonexistent catalog accessible name `Nuova compilazione PAINAD`; timeout before any form measurement. Source uses `Compila PAINAD`. Corrected selector only; no app code changed. Exact failing script, command, exit/log, preliminary JSON and raw video retained. Passing supplemental run is `form-inventory-second/`.

3. A contract-validator command passed a short nested slug `416-touch-targets/independent`; the helper slugified it and reported missing directory. Retried with the absolute existing artifact directory and got `CONTRACT VALIDO`. No contract/application changes were required.

No genuine candidate software failure was found. These do not substitute for real-device/operator/glove testing.
