# Independent patient UX QA gate

Verdict: **READY FOR CODEX QA**, restricted to the frontend candidate.

Candidate: `f4a31fe02d96158bdcc6a7cdcd83c12629d79b73`.
Baseline: `a3ab80f796ec390c09435fddf2c77c2cfb0b7443`.
Checkout: `C:/Workspace/ClinicOSHouse/.worktrees/ux-patient-live-qa`.
This dedicated reviewer did not write candidate application code, commit, push or deploy.

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS: AC1 safe API incompatibility; AC2 compact real patient shell and expansion; AC3 accurate read history | [task-contract.md](task-contract.md) |
| 1 Diff review | PASS: focused frontend boundary and acknowledgement wording; test/evidence support; no backend, Prisma, auth, env or package changes | Candidate range and [source-identity.json](source-identity.json) |
| 2 Build/tests | PASS: TypeScript project build and Vite production build, 661 modules; 65/65 focused tests, zero failures | [build.txt](test-results/build.txt), [focused.txt](test-results/focused.txt) |
| 3 Browser evidence | PASS: real App current and legacy response paths; actual patient layouts; reader history; successful/failed confirmation and reload; author restriction; dialog focus/Escape | [runtime.json](test-results/runtime.json), [HTTP receipt](test-results/http.json), [trace](trace/ux-turno.zip), [video](video/ux-turno.webm), [HTML evidence index](playwright-report/index.html) |
| 4 Security | PASS for this frontend diff; checklist below | Full source diff, synthetic runtime/fixtures and screenshots |

## Source binding

Initial HEAD and application status were recorded before validation. After validation,
771 frontend/build/test inputs were hashed with Git normalization against their exact
candidate blobs. There are zero mismatches. Aggregate source hashes before/after:
`09536f45905d68004d9269311b0b972164ba164a3606bc28329611dcf38ed86a`.
The full inventory and method are in source-identity.json. Two unrelated modified PS
scripts were present at entry and remain untouched; this is not a whole-repository-clean claim.

## Browser findings

- Actual PatientDetail at 768, 1074 and 1395 pixels: all six vitals tiles are 102px high,
  allergy-to-content separation is 24px, and the document has no horizontal overflow.
- Visually inspected the actual-patient-1074 and actual-diary-1074 screenshots. The
  compact values remain readable. The banner has a distinct permanent-attention label
  and visible separation. The diary shows Letta e compresa, reader, role, date/time and
  original urgent priority; no COMPLETATA badge is rendered.
- Current aggregate preserves the exact count (12 despite a two-item preview); failed
  acknowledgement preserves 12 and content, successful acknowledgement changes it to 11;
  historical reader trace survives reload in the synthetic server state.
- Legacy overview yields retryable unavailable content and unknown critical count,
  without the module crash. Legacy personal reads remain explicitly personal, and
  missing shared evidence never becomes Letta e compresa or a fabricated acknowledgement.
- Actual chart expansion and Escape work. Compact fixture checks also verify modal
  focus restoration and scrolling at small viewports.
- Zero unexpected browser console errors or HTTP failures. The exact deliberate 503
  responses are /consegne/critical/ack and /consegne/overview. Recorded net::ERR_ABORTED
  requests are navigation/supersession cancellations, not completed HTTP error responses;
  their URLs are retained in http.json.
- An initial additional QA-only HTTP assertion incorrectly omitted the handover ACK
  failure injection and navigation cancellations. It was corrected in the QA-only
  harness and the complete browser run was repeated successfully. Application code
  was not changed. Its screenshot is retained as instrumentation-first-attempt.png.

## Security checklist

| Check | Result |
|---|---|
| Secrets | PASS: no credentials or connection strings added; the simulator token is explicitly synthetic |
| PHI | PASS: code fixtures and committed evidence use Paziente Test / synthetic allergen / test colleagues |
| Logging | PASS: no new product logging; QA output contains synthetic test outcomes and request paths |
| Input validation | PASS: aggregate, preview rows, urgency and successful reader/timestamp responses are validated before claiming shared state |
| AuthZ | PASS for diff: no authentication changes; author cannot acknowledge their own urgency in browser assertions |
| Injection/XSS | PASS: text remains React-escaped; no raw SQL or dangerous HTML added |
| Dependencies | PASS: manifests and lockfiles unchanged; no new package |
| Config | PASS: env/auth/CORS/deploy rewrites unchanged; QA-only HTML is outside production frontend build input |

## Limits and handoff

This gate certifies frontend behavior against synthetic current and legacy responses,
not Railway readiness or a production database migration. The deployed legacy backend
still cannot persist shared handover acknowledgements. Backend/database publication
requires its separate authorization and fresh backend validation. The root must verify
the actual deployment and browser before claiming the online outcome.

No GitHub issue number was assigned to this task; no external issue comment was sent.
The root owns final QA/publication decisions. The preview server is stopped at handoff.
