# Task Contract

## Task
- Title: 428 operator role
- Slug: 428-operator-role
- Type: bugfix
- Date: 2026-10-10

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Original issue428 and comments read in full as untrusted evidence. Three-key presentation mapping in OperatorManagement hides legacy/custom role tokens, while AdminDashboard prints the raw token. Both backend operator DTO projections replace a missing professional role with medico, hiding provenance. The editor has no retained option for legacy/missing values and saves the whole role field during unrelated edits. Operator.ruolo is a professional profile field, not the active authorization assignment (authz simulator/request-context); no permission inference is justified.

## Expected Behaviour

Root sole app writer C:/w-428 from accepted7680, readonly architecture review complete. Shared pure presentation helper renders known normalized/legacy values, explicit unknown/missing fallback and qualification consistently across workload dashboard, table and mobile cards. Explain the professional function is distinct from access permissions. Missing/unknown verification opens the existing editor without writes; preserve exact selected token and omit role from unrelated edit payloads. Existing normalized options stay unchanged. Backend DTOs keep the existing string shape but represent null as empty string, never synthesize medico; storage/auth/write validation/route guards/schema remain unchanged. This narrow backend correction is necessary for original missing-data AC and covered by user's explicit authorization for pertinent backend fixes/deploys; no new endpoint or permission expansion. Extract existing DTO/read helpers and workload heading to small modules only as needed to keep touched source under500. Do not touch oversized App.tsx/types.ts, dependencies, global styling, policy or Prisma schema.

## Acceptance Criteria

- AC1: Same professional-role/qualification presentation for identical DTOs in dashboard, table and mobile; explanatory text distinguishes it from permissions. Existing navigation offers management verification.
- AC2: No empty role text for null/undefined/blank/unknown/legacy values; no backend null-to-medico invention; explicit missing/unknown verification action and retained editor option.
- AC3: Explicit consistent names for medico/infermiere/coordinatore and legacy oss/fisioterapista/operatore/altro/admin/manager; normalized lookup does not change raw stored token, including case/whitespace; unknown remains visibly uncertain and React-escaped.
- AC4: Viewing/opening/cancelling produces no writes. Unrelated edit omits ruolo, preserving DB null/legacy token and authorization; explicit user role selection may send chosen value. Actual synthetic API/DB before-after and browser mock transport distinguish persistence claims. No automatic authorization/role assignment changes.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | TDD pure label matrix, editor options/update projection, both DTO privacy projections and read-helper equivalence |
| Integration | yes | FE/BE types/build/full named-baseline delta; existing operator form/directory/security regressions |
| API | yes | Actual local operators routes/admin-denial/cache/private-directory contract with synthetic isolated PostgreSQL |
| Playwright | yes | Actual SPA dashboard/table/mobile equality, missing/legacy/unknown labels, verification/editor keyboard, no-write cancel, intercepted unrelated-save/explicit-selection/reload |
| Persistence after refresh | yes | Synthetic API isolated DB unchanged role/User.role after unrelated edit; browser mock reload labelled as transport-only, not real DB |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | Native scoped candidate/baseline, no secrets/PHI/XSS, RBAC unchanged, canonical evidence credential/ZIP scans |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

Scope: new frontend lib/operatorRolePresentation.ts + tests, admin/OperatorManagement.tsx, OperatorFormPanel.tsx, operatorFormModel.ts, AdminDashboard.tsx, new OperatorWorkloadHeading.tsx; backend/routes/operators.ts, new operators/operator-view.ts and focused unit/API-DB tests. All touched/new application code under500 lines after narrowly moving existing projection/heading. Frontend read interface is historically narrower than server free text; no broad types.ts rewrite in this task, helper accepts unknown at runtime. No null DTO contract introduced (empty string remains existing string shape). No production test mutations. Local PostgreSQL must be newly created synthetic cluster using reviewed po05 fixture, isolated port and exact owned shutdown; do not use inherited DATABASE_URL or existing data. Dedicated NEW QA after clean source freeze in separately assigned checkout, immutable failed bundles, root byte-identical replay. Production proof only after exact Vercel/backend release, CI delta, actual screenshots and pinned public HTTP/hash checks. Advisory Ruflo unavailable/previous OOM, no fabricated durable lease or authority. Preserve dirty primary/native launchers and blocked405/408/410/416.

## Gate Status

READY FOR IMPLEMENTATION

## Observed baseline limitation

The first actual-app denial test failed its extra no-store assertion: app.ts mounts the existing capability gate before operatorsRouter. That unchanged outer gate refuses before the router's private/no-store middleware. Keep the full failed db01 bundle; bind app.ts/route-gate.ts/auth.ts byte-equivalent to accepted7680 in the denial regression and assert unchanged status/non-mutation. Successful operator DTO responses must remain private/no-store. This unrelated pre-existing outer-gate cache gap is disclosed, not repaired or certified by #428; no auth middleware reorder or permission expansion.

## Narrow test adaptation

The first full regression produced one new static-test failure: dashboard icon count assumed both headers lived in AdminDashboard.tsx. Scope additionally includes admin/__tests__/admin-dashboard-consistency.test.ts to follow the extracted OperatorWorkloadHeading: require exactly one heading integration and exactly one semantic icon in each original/extracted surface, with the same hidden/palette/initials assertions. Preserve the failed commands01 bundle. No UI requirement or acceptance assertion is removed.

## Candidate test safety refinement before QA

Old local candidate5b371f78 was never released. QA paused before any execution. Add mandatory dedicated synthetic-cluster opt-in, loopback/test env and real PostgreSQL data_directory ownership check before new fixture writes. Shared concurrent full backend CI must skip this isolated snapshot suite; dedicated root/QA harness runs all4 tests on separate fresh clusters. Bind baseline source via import-relative URLs so backend workspace cwd is supported. No production source/UI changed by this refinement. Preserve old candidate as an immutable historical commit and create fresh candidate/QA checkout rather than reset.
