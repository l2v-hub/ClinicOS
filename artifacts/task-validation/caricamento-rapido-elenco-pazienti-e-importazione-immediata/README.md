# Patient loading validation

All data in the local preview is synthetic. The preview overrides fetch; it does not call the real backend. It is excluded from deployment by the tracked .vercelignore.

From the repository root, focused tests:

    node --import tsx --import ./scripts/stub-css-loader.mjs --test frontend/src/lib/__tests__/patientPage.test.ts frontend/src/components/operator/__tests__/patientLoading.test.ts frontend/src/lib/__tests__/cachedFetch.test.ts frontend/src/lib/__tests__/patientRosterSort.test.ts

For the candidate preview, build with the supplied Vite config and an explicit --outDir ending in candidate-preview. The config's original baseline output default is retained for reproducibility. Start node artifacts/task-validation/caricamento-rapido-elenco-pazienti-e-importazione-immediata/server.mjs and open http://127.0.0.1:4179/candidate-preview/. Baseline comparison requires a separate checkout at the commit in task-contract.md, the same preview source, and output copied to baseline-preview. Do not reset a dirty worktree. Generated builds and caches are intentionally uncommitted.

The page displays metric observations in #qa-metrics. Choose the named scenarios, open the list, and inspect pending/result states. Search Alfa then Beta promptly to test a slow response that deliberately ignores abort. Pagination has 52 synthetic patients across two pages. Set an error scenario, then switch to Rete lenta and use the application's retry control to test recovery.

Source hashes, independent production bundle comparison, browser assertions, screenshots and logs accompany validation-report.md. qa-artifacts.mjs can regenerate source/bundle records from baseline-production and candidate-production directories; preserve the original evidence before rerunning.
