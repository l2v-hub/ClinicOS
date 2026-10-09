# Issue 413 independent QA — refinement87

Final Decision: FAILED VALIDATION

Application `87e6dcaf9614c38aad918a2c89579af2bc5d0a27`; source SHA-256 `15fecd77d96727baa987103add912d1e4356c1d418789579a9599dca9ebd9751`, 1448 inputs identical pre/post. Original six-file scope retained; reviewed additional eight lines in PaperForm.tsx. Earlier failed evidence untouched. Only QA subtree writes; no application, commit, release, backend or GitHub mutation.

| Area | Test | Esito | Evidenza |
|---|---|---|---|
| Contract/scope | Original four AC and revised diff | PASS scope; failure below | ../../task-contract.md; this report |
| Build | frontend/backend noEmit, frontend tsc build/Vite | PASS | commands/*.log |
| Focused | independent SSR/draft/version suites | 38/38 PASS | commands/focused.log |
| Full regression | pinned #412 proof553dbd83 comparison | 1206 total,1194 PASS,12 identical baseline failures,0 NEW; not globally green | commands/command-results.json |
| AC1..4 normal browser | focused question/name,sticky toolbar desktop/mobile,0..5 responses,active/inactive resume,local reload,save400/read-only preview | 9/9 PASS | browser/test-results/browser-results.json; browser/*-trace.zip; browser/screenshots/*; browser/video/* |
| Adversarial | tablet820x1180 midpoint focus/toolbar; empty required date closed metadata then Salva bozza | 2/2 PASS | adversarial/test-results/adversarial-results.json; adversarial/*-trace.zip; adversarial/screenshots/*; adversarial/video/* |
| Adversarial preview | complete answers, empty required date, closed metadata then Salva e verifica anteprima | FAIL hidden invalid field | preview-invalid/test-results/failure.json; preview-invalid/failure-trace.zip; preview-invalid/screenshots/failure.png; preview-invalid/video/* |
| Security | no changed auth/transport/definition/engine/deps,scoped scanner | PASS touched scope; no release eligibility | commands/security-scan.log; pre/source-receipt.json; guarded browser results |

## Remaining correctness finding

`frontend/src/components/operator/assessments/PaperForm.tsx:207`: the new native onInvalidCapture correctly exposes metadata on submit, but the preview action is type=button and invokes onPreview directly. Native constraint validation does not run. Complete five answers, open metadata, clear date, collapse, click Salva e verifica anteprima. Store refuses save safely with generic date error beneath the paper; date remains hidden and unfocused. Existing safeguards prevent server/finalization writes, but compacted metadata lacks actionable error reveal for this second persistent action. Add the same native validation/reveal boundary before preview without weakening store or clinical validity.

Synthetic actual SPA only; zero real-patient/production requests or writes. Ordinary simulated save attempts are in-memory responses; no backend persistence claim. All browser contexts closed, server7475 unchanged, lane released. Parent advised immediately.

Codex must now re-run the QA Gate.
