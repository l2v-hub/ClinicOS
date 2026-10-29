# Issue506 release and actual online acceptance

Final Decision: FAILED VALIDATION

The protected PR508 merge and deployment succeeded, but the issue is NOT resolved. No issue closure is authorized by this report.

## Exact identities

- Genuine Claude4 approved PR head `8075cdb61bb329ea56943a0199edc64f67146981`, report digest `49e465cd888c2d93726fc6b9278ecd69e7a9028770dfa1398fcb2372d3ec5555`, [actual review](https://github.com/l2v-hub/ClinicOS/pull/508#pullrequestreview-5705720879).
- Independently repeated local QA report digest `f17573267f5eafb24d20b0f73c4438c784d68da1935672d68203416fac972cf3`.
- Native protected merge `59f0a9ea60bd56d1823305da9b18fa0bca8db213`; unchanged native final-proof identity `e715e61a63838730f758d59d70a9df9e4085fa550f6ccbe8649c180df6b4c517`.
- Actual Vercel READY deployment `dpl_3KXmbe8VZ8UodnGdC92Mo6MRU5Kd` serves the same merge through `clinicos-eosin.vercel.app`; verified provider alias ID. Existing same-SHA automatic deployment was awaited, not duplicated.

## Results and limits

Local TypeScript app/node, production build,1560frontend tests (0failed/0skipped), source/dist secrets scan (0findings), and actual React E2E1440/1024/768/390 passed on the reviewed SHA. Twenty result PNGs, four fully decompressed traces and four fully decoded videos are included under `evidence/`. Intentionally injected error cases retain their exact narrow assertions. Initial sparse-checkout missing-module failures, their logs and the unchanged-lockfile dependency rerun are preserved; no assertion was weakened.

The local fixture mounts **NewPatientFlow**, not the patient list's actual **AIImportStatus** direct button. Therefore this PASS certifies only that tested entry point and was insufficient for the complete issue acceptance criteria. The original report and every review/counter remain preserved; this online result supersedes any inference of full completion.

## Actual authenticated online counterexample

Normal server-defined demo Medico1 login, zero patients, direct `Importa lettera di dimissione` button. No document upload, OCR, provider invocation, patient confirmation or real clinical write.

- Viewport1440x1000, main x96/y64/width1344/height936, topbar bottom64.
- `.patient-workspace` absent; one true modal; topbar and sidebar hit tests both false.
- Actual serving asset `/assets/index-BOMPi0cW.js`; fetched NewPatientFlow bundle contains the new presentation plumbing, so this is not a claim based only on provider commit metadata.
- Screenshot: `issue506-online-after-still-modal.png`; finite DOM geometry: `issue506-online-failure.json`.

Independently confirmed cause at the merge source: `PatientList.tsx:347` renders `AIImportStatus`; `AIImportStatus.tsx:51` and `:52` omit presentation from both DialogLoading and DischargeImportModal. ImportSession defaults to dialog at `DischargeImportModal.tsx:55`. By contrast the method/resume entry at `PatientList.tsx:294` passes initialPath to NewPatientFlow and gets page presentation.

Required follow-up: explicitly propagate presentation through the actual patient-list AIImportStatus entry and its loading state, preserving default true-dialog callers. Test the actual entry in PatientList/App with synthetic backend, all four widths, loading and handoff phases, and actual resume button. The retained516candidate does not include this missing path.

## Closure protection

The canonical batch now has `ONLINE_ACCEPTANCE_FAILED` release hold, blocked status and immutable online failure receipt. Issue506 remains open. Four genuine Claude rounds remain4/4; no fifth review or budget reset is fabricated. A further genuine review needs a separately authorized budget extension. Original user checkout and dirty local scripts were not edited.
