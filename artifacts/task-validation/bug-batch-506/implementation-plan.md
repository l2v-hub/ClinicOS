1. Preserve modal path; add explicitly selected page surface using current main/topbar geometry.
2. Propagate presentation through NewPatientFlow loading/error, document/review and resumed intake phases.
3. Keep workspace panel scrolling and original save/close behavior; preserve nested modal semantics.
4. Unit/SSR regression tests for default modal vs page semantics. Browser actual React flow with localhost-only synthetic fixtures: desktop/tablet/mobile bounds, sidebar/topbar click/focus, resumed draft and field editing/save/reload, nested confirmation, close/escape.
5. Independent reserved QA session reruns build/tests/browser and records identity-bound screenshot/trace/video/security outcomes. Freeze source and publish each issue's proof.
6. Only after actual gates create PR and valid exact-head Claude request, without spending or resetting old subjects' budgets. No issue closure before protected merge and verified publication.
