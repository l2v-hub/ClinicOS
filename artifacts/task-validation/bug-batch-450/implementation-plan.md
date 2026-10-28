# Frozen implementation plan

Branch: codex/bug-batch-450
Baseline: a516d42e31f6674c39c1d130c9706cd80a7ab4c6

{
  "title": "Unified patient intake: manual corrections, document preview and safe resumable incomplete import",
  "feature": "patient-intake/document-review-and-draft-lifecycle",
  "rationale": "Aggregate450 with472/473/475/476 because they share IntakeWorkspace, StepAnagrafica and intakeProgress and the document-to-patient lifecycle. Keep perissue acceptance and evidence; adopt PR469 rather than create duplicate work.",
  "analysis": "Baseline origin/main a516d42e31f6674c39c1d130c9706cd80a7ab4c6. Source PR469 head29b2f5c9b72b4d909b954d5360ec08095825f29e. Owner comment6154947896 supersedes the two-screen/five-field redesign. Reuse scoped source only; correct existing tablet three-column regression, source-only assertions and incomplete runtime error/persistence verification. Historical backend denied-access-ack failure must be reproduced/classified without weakening assertions. Actual bodies and all comments read for472/473/475/476. Importreview currently nests constrained fullheight surfaces; validate actual geometry and sourcevisibility. Missing source, corrupt PDF and asset/CSP failures remain separate hypotheses pending reproduction.476 permits name/surname/validCF draft continuation but invalid provided fields, clinical review and duplicate safeguards remain enforced.473 medication rows are prescriptions for review, never evidence of actual administration.",
  "execution": {
    "difficulty": "high",
    "mode": "direct",
    "reason": "Senior integration owns shared intake state, safety validation and PDF runtime lifecycle together; bounded domain subtasks may be handed off only after controller approves exact nonoverlap scopes. No provider-load assumptions."
  },
  "issues": [
    450,
    472,
    473,
    475,
    476
  ],
  "scope": [
    "frontend/src/components/operator/NewPatientStart.tsx",
    "frontend/src/components/operator/NewPatientStart.css",
    "frontend/src/components/shared/intake/IntakeWorkspace.tsx",
    "frontend/src/components/shared/intake/StepAnagrafica.tsx",
    "frontend/src/components/shared/intake/intakeProgress.ts",
    "frontend/src/components/shared/InlineEditableField.tsx",
    "frontend/src/components/shared/intake/__tests__/intakeMinimal450.test.ts",
    "scripts/e2e/issue-450-ingresso.mjs",
    "frontend/src/components/shared/DischargeImportModal.tsx",
    "frontend/src/components/shared/import/ImportReviewWorkspace.tsx",
    "frontend/src/components/shared/import/ImportSession.css",
    "frontend/src/components/shared/intake/IntakePage.css",
    "frontend/src/components/shared/intake/intakeDraftApi.ts",
    "frontend/src/components/operator/PatientList.tsx",
    "frontend/src/lib/patientListView.ts",
    "backend/src/intake/draft-service.ts",
    "backend/src/routes/intake-drafts.ts",
    "backend/src/patients/progressive-identity.ts",
    "frontend/src/components/shared/intake/__tests__/intakeDraftSession.test.ts",
    "backend/src/intake/__tests__/confirm-draft-guards.test.ts",
    "frontend/src/components/shared/ImportReviewFull.tsx",
    "frontend/src/lib/codiceFiscale.ts",
    "backend/src/lib/codice-fiscale.ts",
    "backend/src/intake/parse-discharge-therapy.ts",
    "backend/src/ai/sections/patient-narrative.ts",
    "backend/src/ai/upload/confirm-service.ts",
    "backend/src/intake/__tests__/seed-draft-from-import.test.ts",
    "backend/src/intake/__tests__/parse-discharge-therapy.test.ts",
    "frontend/src/components/shared/import/ImportPageView.tsx",
    "frontend/src/components/shared/import/importSourceCache.ts",
    "frontend/src/components/shared/PdfCanvasPreview.tsx",
    "frontend/src/components/shared/PdfCanvasPreview.css",
    "frontend/src/lib/pdfPreviewResources.ts",
    "frontend/config/pdfPreviewAssets.ts",
    "backend/src/routes/import-pages.ts",
    "frontend/src/components/shared/import/__tests__/importReview.test.ts",
    "frontend/src/lib/intakeDemographics.ts",
    "frontend/src/components/shared/intake/StepVerifica.tsx",
    "frontend/src/lib/__tests__/intakeDemographics.test.ts",
    "frontend/src/components/operator/NewPatientFlow.tsx",
    "frontend/src/components/shared/intake/intakeDraftSession.ts",
    "frontend/src/components/shared/sections/ImportSectionsReview.tsx",
    "frontend/src/components/shared/intake/IntakeIndex.tsx",
    "frontend/src/components/shared/intake/__tests__/intakeProgress.test.ts"
  ],
  "fileMap": [
    {
      "issue": 450,
      "files": [
        "frontend/src/components/operator/NewPatientStart.tsx",
        "frontend/src/components/operator/NewPatientStart.css",
        "frontend/src/components/shared/intake/IntakeWorkspace.tsx",
        "frontend/src/components/shared/intake/StepAnagrafica.tsx",
        "frontend/src/components/shared/intake/intakeProgress.ts",
        "frontend/src/components/shared/InlineEditableField.tsx",
        "frontend/src/components/shared/intake/__tests__/intakeMinimal450.test.ts",
        "scripts/e2e/issue-450-ingresso.mjs",
        "frontend/src/components/shared/intake/__tests__/intakeProgress.test.ts"
      ]
    },
    {
      "issue": 472,
      "files": [
        "frontend/src/components/shared/DischargeImportModal.tsx",
        "frontend/src/components/shared/import/ImportReviewWorkspace.tsx",
        "frontend/src/components/shared/import/ImportSession.css",
        "frontend/src/components/shared/intake/IntakeWorkspace.tsx",
        "frontend/src/components/shared/intake/IntakePage.css",
        "frontend/src/components/shared/intake/intakeDraftApi.ts",
        "frontend/src/components/operator/PatientList.tsx",
        "frontend/src/lib/patientListView.ts",
        "backend/src/intake/draft-service.ts",
        "backend/src/routes/intake-drafts.ts",
        "backend/src/patients/progressive-identity.ts",
        "frontend/src/components/shared/intake/__tests__/intakeDraftSession.test.ts",
        "backend/src/intake/__tests__/confirm-draft-guards.test.ts",
        "scripts/e2e/issue-450-ingresso.mjs",
        "frontend/src/components/operator/NewPatientFlow.tsx",
        "frontend/src/components/shared/intake/intakeDraftSession.ts"
      ]
    },
    {
      "issue": 473,
      "files": [
        "frontend/src/components/shared/DischargeImportModal.tsx",
        "frontend/src/components/shared/import/ImportReviewWorkspace.tsx",
        "frontend/src/components/shared/import/ImportSession.css",
        "frontend/src/components/shared/intake/IntakeWorkspace.tsx",
        "frontend/src/components/shared/intake/IntakePage.css",
        "frontend/src/components/shared/ImportReviewFull.tsx",
        "frontend/src/components/shared/intake/StepAnagrafica.tsx",
        "frontend/src/lib/codiceFiscale.ts",
        "backend/src/lib/codice-fiscale.ts",
        "backend/src/intake/parse-discharge-therapy.ts",
        "backend/src/intake/draft-service.ts",
        "backend/src/ai/sections/patient-narrative.ts",
        "backend/src/ai/upload/confirm-service.ts",
        "backend/src/intake/__tests__/seed-draft-from-import.test.ts",
        "backend/src/intake/__tests__/parse-discharge-therapy.test.ts",
        "scripts/e2e/issue-450-ingresso.mjs",
        "frontend/src/components/shared/sections/ImportSectionsReview.tsx"
      ]
    },
    {
      "issue": 475,
      "files": [
        "frontend/src/components/shared/import/ImportPageView.tsx",
        "frontend/src/components/shared/import/importSourceCache.ts",
        "frontend/src/components/shared/PdfCanvasPreview.tsx",
        "frontend/src/components/shared/PdfCanvasPreview.css",
        "frontend/src/lib/pdfPreviewResources.ts",
        "frontend/config/pdfPreviewAssets.ts",
        "backend/src/routes/import-pages.ts",
        "frontend/src/components/shared/import/__tests__/importReview.test.ts",
        "scripts/e2e/issue-450-ingresso.mjs"
      ]
    },
    {
      "issue": 476,
      "files": [
        "frontend/src/lib/intakeDemographics.ts",
        "frontend/src/components/shared/intake/IntakeWorkspace.tsx",
        "frontend/src/components/shared/intake/StepVerifica.tsx",
        "frontend/src/components/shared/intake/StepAnagrafica.tsx",
        "frontend/src/components/shared/intake/intakeProgress.ts",
        "backend/src/patients/progressive-identity.ts",
        "backend/src/ai/upload/confirm-service.ts",
        "frontend/src/lib/__tests__/intakeDemographics.test.ts",
        "backend/src/intake/__tests__/confirm-draft-guards.test.ts",
        "scripts/e2e/issue-450-ingresso.mjs",
        "frontend/src/components/shared/sections/ImportSectionsReview.tsx",
        "frontend/src/components/shared/intake/IntakeIndex.tsx",
        "frontend/src/components/shared/intake/__tests__/intakeProgress.test.ts"
      ]
    }
  ],
  "separationReason": "Manual and import intake are consolidated to avoid IntakeWorkspace overlap. PatientList and patientListView overlap future452 list presentation: land this batch first, then rebase452 and rerun both draft/status and identity/list regressions; do not modify unrelated row presentation. Therapygroup owns therapy administration/AIFA, which are outside this intake scope.",
  "acceptance": [
    {
      "issue": 450,
      "criteria": [
        "Exactly one combined letter/transfer document route plus manual entry, preserving document availability and role gates.",
        "Automatic admission date/time and empty or whitespace-only sections never appear complete; genuine entered admission data completes its section.",
        "Keep the complete one-page manual intake; remove redundant demographics summary and obvious helper paragraphs while preserving field errors and computed tax-code notice.",
        "Create a synthetic manual patient on an isolated fresh local database, assert browser-visible identity and values, reload and verify persistence through the real API and database.",
        "At desktop 1180x820, tablet 820x1180 and phone 390x844, exactly two usable accessible choices have no horizontal overflow; document route and manual route remain keyboard accessible.",
        "Browser run fails on every unexpected console/page error and relevant failed HTTP response, records screenshot, trace and video, and tears down all local services."
      ]
    },
    {
      "issue": 472,
      "criteria": [
        "Import review occupies available viewport without nested modal obstruction; original document remains available while editing every demographic and therapy field at desktop/tablet/phone.",
        "Save/leave/resume preserves edits through reload with visible incomplete draft status in patient list/dashboard and no duplicate patient on repeated continuation.",
        "Required and strongly recommended fields are distinct; preserve incomplete values accurately instead of inventing birth dates or demographics."
      ]
    },
    {
      "issue": 473,
      "criteria": [
        "Validated unambiguous CF may derive a reviewable missing sex with provenance; invalid code or explicit contradictory sex is never silently overridden.",
        "Unheaded synthetic medication lists produce reviewable prescription rows retaining quantities, schedules and source provenance; ambiguity remains visible, unsafe rows cannot be activated, and no administration event is invented.",
        "Original source remains visible while right-side field/therapy editing scrolls; browser synthetic PDF import persists reviewed values through reload."
      ]
    },
    {
      "issue": 475,
      "criteria": [
        "Authenticated synthetic multipage PDF includes readable text page and scanned-image page; preview thumbnails and selected original page render actual nonblank canvas content.",
        "Missing/unreadable source yields actionable error/retry and cannot expose another session source; actual failing fetch/render root cause determines the minimal fix."
      ]
    },
    {
      "issue": 476,
      "criteria": [
        "Name/surname/validCF alone can continue as incomplete draft; backend and UI agree, remaining recommended data is visible and persisted after reload.",
        "Invalid CF, supplied future birth date, unsafe/unreviewed therapy and duplicate conflict remain explicit actionable blockers rather than unexplained disabled create button."
      ]
    }
  ],
  "tasks": [
    {
      "title": "Reuse owner-approved PR469 source corrections with responsive layout repair",
      "files": [
        "frontend/src/components/operator/NewPatientStart.tsx",
        "frontend/src/components/operator/NewPatientStart.css",
        "frontend/src/components/shared/intake/IntakeWorkspace.tsx",
        "frontend/src/components/shared/intake/StepAnagrafica.tsx",
        "frontend/src/components/shared/intake/intakeProgress.ts",
        "frontend/src/components/shared/InlineEditableField.tsx"
      ],
      "steps": [
        "Apply only eight scoped source/test harness files after controller freezes plan; exclude historical artifact reports.",
        "Use two document/manual columns on desktop and one column below1024px; preserve availability and role behavior.",
        "Retain complete one-page form and genuine completion semantics; remove duplicated obvious assistance only."
      ]
    },
    {
      "title": "Replace textual guards with behavior coverage and isolated full-stack evidence",
      "files": [
        "frontend/src/components/shared/intake/__tests__/intakeMinimal450.test.ts",
        "scripts/e2e/issue-450-ingresso.mjs"
      ],
      "steps": [
        "Exercise progress with automatic-only, whitespace, genuine data and other empty sections; render components to assert choice counts and disabled/document behavior.",
        "Make the single E2E entrypoint start fresh PostgreSQL16 using owned nonprivileged Docker container clinicos-qa-batch450 bound only127.0.0.1:55450 (no host mounts); nativePG16 fallback, real local Python AI runtime with mock providers on8795, backend3450 and frontend5450; migrate and seed only synthetic fixtures, never load production env.",
        "Run the real manual creation flow; assert two responsive choices, accessible navigation, genuine state, created identity/values via UI and API, persistence after reload, zero browser and relevant HTTP errors; capture PNG/trace/WebM then teardown in finally.",
        "Run targeted proactive denied-access ack regression separately and record exact current result; never change unrelated backend assertions.",
        "Simplify scoped source and repeat meaningful tests plus build."
      ]
    },
    {
      "title": "Reproduce document source and viewport failures, then repair shared original display",
      "files": [
        "frontend/src/components/shared/DischargeImportModal.tsx",
        "frontend/src/components/shared/import/ImportReviewWorkspace.tsx",
        "frontend/src/components/shared/import/ImportSession.css",
        "frontend/src/components/shared/intake/IntakeWorkspace.tsx",
        "frontend/src/components/shared/intake/IntakePage.css",
        "frontend/src/components/shared/import/ImportPageView.tsx",
        "frontend/src/components/shared/import/importSourceCache.ts",
        "frontend/src/components/shared/PdfCanvasPreview.tsx",
        "frontend/src/components/shared/PdfCanvasPreview.css",
        "frontend/src/lib/pdfPreviewResources.ts",
        "frontend/config/pdfPreviewAssets.ts",
        "backend/src/routes/import-pages.ts",
        "frontend/src/components/shared/import/__tests__/importReview.test.ts",
        "scripts/e2e/issue-450-ingresso.mjs",
        "frontend/src/components/shared/ImportReviewFull.tsx"
      ],
      "steps": [
        "Generate fully synthetic text plus scanned-image PDF and run real authenticated upload/source requests. Record failing browser behavior before choosing preview resource/cache fix.",
        "Use available viewport and stable independent review scroll; keep original readable during edits without nested dialog loss, keyboard trap or hidden-source behavior on phone.",
        "Retain authorization, immutable-source identity, object-URL cleanup and actionable missing/corrupt-source recovery."
      ]
    },
    {
      "title": "Align safe progressive identity and persistent draft continuation",
      "files": [
        "frontend/src/components/shared/DischargeImportModal.tsx",
        "frontend/src/components/shared/import/ImportReviewWorkspace.tsx",
        "frontend/src/components/shared/import/ImportSession.css",
        "frontend/src/components/shared/intake/IntakeWorkspace.tsx",
        "frontend/src/components/shared/intake/IntakePage.css",
        "frontend/src/components/shared/intake/intakeDraftApi.ts",
        "frontend/src/components/operator/PatientList.tsx",
        "frontend/src/lib/patientListView.ts",
        "backend/src/intake/draft-service.ts",
        "backend/src/routes/intake-drafts.ts",
        "backend/src/patients/progressive-identity.ts",
        "frontend/src/components/shared/intake/__tests__/intakeDraftSession.test.ts",
        "backend/src/intake/__tests__/confirm-draft-guards.test.ts",
        "scripts/e2e/issue-450-ingresso.mjs",
        "frontend/src/lib/intakeDemographics.ts",
        "frontend/src/components/shared/intake/StepVerifica.tsx",
        "frontend/src/components/shared/intake/StepAnagrafica.tsx",
        "frontend/src/components/shared/intake/intakeProgress.ts",
        "backend/src/ai/upload/confirm-service.ts",
        "frontend/src/lib/__tests__/intakeDemographics.test.ts",
        "frontend/src/components/operator/NewPatientFlow.tsx",
        "frontend/src/components/shared/intake/intakeDraftSession.ts",
        "frontend/src/components/shared/sections/ImportSectionsReview.tsx",
        "frontend/src/components/shared/intake/IntakeIndex.tsx",
        "frontend/src/components/shared/intake/__tests__/intakeProgress.test.ts"
      ],
      "steps": [
        "Permit name/surname/validCF incomplete continuation with readable required/recommended and exact invalid-field blockers.",
        "Use existing draft/confirm contract and persist incomplete status; save/leave/resume and patient list/dashboard visibility without duplicate creation.",
        "Preserve invalid supplied date/CF/phone validation, duplicate checks, role gates and unsafe-therapy review barriers; no invented identity values or schema changes."
      ]
    },
    {
      "title": "Recognize reviewable source-derived identity and unheaded prescriptions",
      "files": [
        "frontend/src/components/shared/DischargeImportModal.tsx",
        "frontend/src/components/shared/import/ImportReviewWorkspace.tsx",
        "frontend/src/components/shared/import/ImportSession.css",
        "frontend/src/components/shared/intake/IntakeWorkspace.tsx",
        "frontend/src/components/shared/intake/IntakePage.css",
        "frontend/src/components/shared/ImportReviewFull.tsx",
        "frontend/src/components/shared/intake/StepAnagrafica.tsx",
        "frontend/src/lib/codiceFiscale.ts",
        "backend/src/lib/codice-fiscale.ts",
        "backend/src/intake/parse-discharge-therapy.ts",
        "backend/src/intake/draft-service.ts",
        "backend/src/ai/sections/patient-narrative.ts",
        "backend/src/ai/upload/confirm-service.ts",
        "backend/src/intake/__tests__/seed-draft-from-import.test.ts",
        "backend/src/intake/__tests__/parse-discharge-therapy.test.ts",
        "scripts/e2e/issue-450-ingresso.mjs"
      ],
      "steps": [
        "Add validated unambiguous CF sex inference only if missing, preserve source provenance and operator correction and never overwrite contradictory explicit sex.",
        "Exercise heading-free medication quantities/times and ambiguity; minimally correct parsing if behavioral fixtures reproduce loss.",
        "Preserve prescription-versus-administration distinction and unresolved-dose review; assert real PDF ingestion and persisted reviewed output."
      ]
    },
    {
      "title": "Verify the aggregated flow and publish separate issue evidence",
      "files": [
        "scripts/e2e/issue-450-ingresso.mjs",
        "frontend/src/components/shared/intake/__tests__/intakeMinimal450.test.ts",
        "frontend/src/components/shared/intake/__tests__/intakeDraftSession.test.ts",
        "backend/src/intake/__tests__/confirm-draft-guards.test.ts",
        "backend/src/intake/__tests__/seed-draft-from-import.test.ts",
        "backend/src/intake/__tests__/parse-discharge-therapy.test.ts",
        "frontend/src/components/shared/import/__tests__/importReview.test.ts",
        "frontend/src/lib/__tests__/intakeDemographics.test.ts"
      ],
      "steps": [
        "Single harness owns isolated fresh DockerPG55450 with owned container and no host mounts, backend3450, frontend5450 and real local Python AI runtime with mock providers on8795; migrations/synthetic fixtures, meaningful backend/frontend regressions and real browser import/manual flows then teardown.",
        "Serialize Chromium with flock; fail on unexpected console/page/relevantHTTPerrors, assert result values and reload persistence. Include negative invalidCF/futureDate/unsafeTherapy/duplicate/source-isolation cases.",
        "Write perissue PNG, traceZIP, WebM and sanitized reports under batch450/evidence, then simplify and rerun required checks."
      ]
    }
  ],
  "verification": [
    {
      "command": "npm",
      "args": [
        "--prefix",
        "frontend",
        "run",
        "build"
      ]
    },
    {
      "command": "node",
      "args": [
        "--import",
        "tsx",
        "--import",
        "./scripts/stub-css-loader.mjs",
        "--test",
        "frontend/src/components/shared/intake/__tests__/intakeMinimal450.test.ts",
        "frontend/src/components/shared/intake/__tests__/intakeDraftSession.test.ts",
        "frontend/src/lib/__tests__/intakeDemographics.test.ts",
        "frontend/src/components/shared/import/__tests__/importReview.test.ts"
      ]
    },
    {
      "command": "node",
      "args": [
        "scripts/e2e/issue-450-ingresso.mjs",
        "artifacts/task-validation/bug-batch-450"
      ]
    }
  ],
  "evidence": [
    {
      "issue": 450,
      "screenshot": "artifacts/task-validation/bug-batch-450/evidence/issue450.png",
      "trace": "artifacts/task-validation/bug-batch-450/evidence/issue450.zip",
      "video": "artifacts/task-validation/bug-batch-450/evidence/issue450.webm"
    },
    {
      "issue": 472,
      "screenshot": "artifacts/task-validation/bug-batch-450/evidence/issue472.png",
      "trace": "artifacts/task-validation/bug-batch-450/evidence/issue472.zip",
      "video": "artifacts/task-validation/bug-batch-450/evidence/issue472.webm"
    },
    {
      "issue": 473,
      "screenshot": "artifacts/task-validation/bug-batch-450/evidence/issue473.png",
      "trace": "artifacts/task-validation/bug-batch-450/evidence/issue473.zip",
      "video": "artifacts/task-validation/bug-batch-450/evidence/issue473.webm"
    },
    {
      "issue": 475,
      "screenshot": "artifacts/task-validation/bug-batch-450/evidence/issue475.png",
      "trace": "artifacts/task-validation/bug-batch-450/evidence/issue475.zip",
      "video": "artifacts/task-validation/bug-batch-450/evidence/issue475.webm"
    },
    {
      "issue": 476,
      "screenshot": "artifacts/task-validation/bug-batch-450/evidence/issue476.png",
      "trace": "artifacts/task-validation/bug-batch-450/evidence/issue476.zip",
      "video": "artifacts/task-validation/bug-batch-450/evidence/issue476.webm"
    }
  ]
}
