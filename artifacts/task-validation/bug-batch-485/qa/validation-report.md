# Independent QA — issue485, final cycle4 frozen candidate

Final Decision: READY FOR CODEX QA

Independent reviewer: `qa_gate_issue485_cycle4`; neither implementation author nor coordinator. Candidate worktree `/workspace/clinicos-issue485-fullscreen`, branch `codex/bug-batch-485`, immutable HEAD/base `6d2cc7919a86e3896426a7281f28f3406d8418e4`. Fourth and final reserved implementation, contract version3. No application, GitHub or controller writes, commit, push, review, merge, closure or deployment by this session. This is local independent QA; release and online verification remain pending.

## Mandatory phases

| Phase | Result | Evidence |
|---|---|---|
|0 Contract|PASS — issue485 and all8 comments read; AC1–AC7 and v3 scope amendment govern this run|[issue](github-issue485.json), [contract](task-contract.md)|
|1 Diff review|PASS — exactly IntakePage.css, ImportSession.css and design-system.css; no unrelated source changes; PatientList.css matches parent exactly|[complete diff](candidate.diff), [initial freeze](freeze-before.json)|
|2 Build/tests|PASS — fresh1395/1395 frontend tests,0fail/skip; fresh app/node TypeScript `--noEmit --incremental false`; fresh production Vite build with explicit owned local API and `/qa-clinicos/`|[suite](frontend-tests.log), [app types](runtime-run/logs/tsconfig.app.json.log), [node types](runtime-run/logs/tsconfig.node.json.log), [production build](runtime-run/logs/production-build.log)|
|3 Real browser/persistence|PASS —212/212 checks;16 layouts,26 actual field interactions,17 source audits,3 SQL persistence paths,2 actual320px resume clicks; zero console/page/relevantHTTP errors|[HTML report and full gallery](playwright-report/index.html), [raw checks](runtime-run/test-results/fullstack.json), [metrics](final-metrics.json), [geometry](runtime-run/test-results/geometry.json)|
|4 Security|PASS — scoped CSS review; synthetic fixtures only; every packet file and every decompressed ZIP member scanned; full PNG/video decoding, trace CRC and redaction checks pass|[security/media audit](security-media-audit.json), [trace redaction](runtime-run/test-results/evidence-redaction.json)|
|5 Verdict/integrity|PASS — all13011 frozen files unchanged before/after;236 prior external proof files unchanged; owned runtime cleaned and lock released|[final freeze](freeze-after.json), [cleanup](cleanup-receipt.json), [manifest](artifact-manifest.json), [seal](seal.json)|

## Acceptance and observations

AC1 PASS. Manual entry measures exactly0/0/1903/1032,0/0/820/1180 and0/0/390/844. Its sections use actual body clientWidth minus24px padding each side: desktop1576=1624−48, tablet757=805−48, phone327=375−48. Each measured native scrollbar is15px; no border-box substitution. Real clicks, keyboard values and focused-field hit tests pass. [Desktop result](runtime-run/screenshots/manual-1903.png), [tablet](runtime-run/screenshots/manual-820.png), [phone](runtime-run/screenshots/manual-390.png).

AC2/AC3/AC6 PASS. Standard review and imported editing use all requested desktop/tablet/phone bounds. Short mutable review and imported editing pass390×600 and320×568, with deliberate source→field→source scrolling. Saved-review fields remain intentionally disabled; mutable review was exercised before first save, imported fields after reload remained editable. No controls were force-enabled. Three additional readonly saved-review layouts were checked at390×844,390×600,320×568. Every geometry reports html/body within viewport, including background ingress.

All17 actual PDF audits verify unchanged minimums80px visible height,100px width and100 dark pixels in the permitted real125% reading flow. Canvas top is aligned within its own stage and the visible top of the outer workspace. All source controls participate in real layout. Native minus focus, Tab to plus, Tab to Adatta leave actual postfocus bounds inside the viewport; all25/50/75 painted hit points pass. Actual minus reduces paper width; actual plus produces125% scale; native internal pan works; actual Adatta restores fit; actual authenticated-source blob downloads yield the uploaded PDF filename/signature. Toolbar/download rectangles do not overlap. Actual finite sidebar animations are awaited via their `finished` promises; no animation disabling or fixed scene delay is used. [Runner/provenance](harness-provenance.json), [runner](run-issue485.mjs).

Default fit at320 retains its density limitation, without erasing diagnostics:

|Context|Default fit height / dark pixels|Actual125% reading height / dark pixels|
|---|---|---|
|Mutable review before/after fields|177.875 /80|177.875 /352|
|Readonly resumed review|145.875 /80|145.875 /352|
|Imported editing before/after fields|227.1875 /75|227.1875 /321|

These raw fit values do not pass the100-ink threshold. The legitimate zoom/pan flow does, and Adatta restores fit afterward. [320 review reading](runtime-run/screenshots/mutable-320x568-before-zoom-reading.png), [320 editing reading](runtime-run/screenshots/short-editing-320x568-return-zoom-reading.png), [readonly reading](runtime-run/screenshots/readonly-320x568-zoom-reading.png). Earlier3.5/32/67px stage defects would still fail the unchanged80px height criterion.

AC4 PASS. Three genuine save→reload→reopen/resume paths use real local API/database/storage/parser/auth and direct PostgreSQL readback. Final persisted values are manual `Prova390 / Sintetico485`, import `Short320 / Sintetica485`, post-import `WorkspaceShort320 / Sintetica485`. Short390 values were typed and asserted, then overwritten at320 before final save; no claim that those390 values were the final saved record. [Final manual persisted screenshot](runtime-run/screenshots/manual-draft-reloaded-1903.png) shows both complete saved identity values and matches the SQL readback. [Manual SQL](runtime-run/test-results/manual-persistence.json), [import SQL](runtime-run/test-results/import-persistence.json), [post-import SQL](runtime-run/test-results/post-import-persistence.json).

The PNGs [import-draft-reloaded-320](runtime-run/screenshots/import-draft-reloaded-320.png) and [post-import-draft-reloaded-320](runtime-run/screenshots/post-import-draft-reloaded-320.png) capture immediate re-entry before deliberate field reveal; they include partially framed inputs, and the former displays the autosave status. They are re-entry evidence, not stable final field screenshots. Persistence is established by actual value assertions after reload/resume plus SQL; later26 field interactions prove editable-field reachability using actual click/focus bounds. The HTML report labels those images accordingly. No unchanged rerun was performed solely to reframe them. The actual layout result is captured separately in the manual, source, editing and resume PNGs and video/trace.

AC7 PASS. Both actual320px long-name resume buttons wrap the full identifier inside242×60px bounds atx39/right281, minimum44px; html/body both320px. Full text rectangles are inside the control and all25/50/75 self-hit points pass before actual clicks. [First resume](runtime-run/screenshots/long-draft-resume-92.png), [second resume](runtime-run/screenshots/long-draft-resume-174.png), corresponding JSONs under test-results. This tests the real patient-list entrypoint, including its background width.

AC5 PASS. Full diff reviewed against6d2. Intake/import bytes match the supplied cycle3 hashes; their fullscreen and intrinsic source/data layouts remain surgical CSS changes. The nine canonical design-system lines are scoped to direct patient-list/card action buttons inside existing `@media screen`: max-width100%, natural wrapping, autoheight, token-based44px minimum and8px block padding. PatientList.css is parent-exact; existing canonical ownership tests now pass independently. No test/scanner/threshold bypass, new TSX/class, `!important`, body overflow mask, auth/config/dependency/backend/Prisma change.

## Inherited versus fresh

Backend49 is INHERITED, NOT RERUN. All11 backend paths in the historical parent runtime receipt match current bytes, and all69 parent independent-QA proof hashes match their recorded manifest. [Identity receipt](historical-validation-identity.json). Parent clinical22 is historical, NOT RERUN and not claimed as fresh certification: the current CSS differs from that runtime receipt. This session instead independently executes the targeted212 real browser checks. The historical parent release/clinical hold remains unchanged.

Fresh checks in this session are1395 frontend tests, two TypeScript project checks, production build,212 browser checks and evidence/security/integrity validation. Author3's195 checks and author4's frontend report are not used as independent approval.

## Security and evidence boundaries

Only external OCR/extraction is a synthetic provider fixture. Pinned actual font bytes are mirrored after hash/license verification. Upload, storage, PDF parser, API, auth, database, application DOM and native controls are real; no app UI/browser/API response stubs. Production preview retains its CSP with only the owned loopback backend origin added. No live patient, paid provider or production database/API used.

CSS introduces no new endpoint/input parser/AuthZ/SQL/XSS/log/dependency/config path. Existing role selection and source authentication run normally. All names/PDF text are declared synthetic, including UI placeholder examples. Trace redaction removed117 ephemeral simulator bearer tokens; the all-member scan finds no unredacted credentials. Synthetic local fixture sentinel and password-free isolated loopback database address are explicit test configuration, not production secrets.

All48 standalone PNGs and all embedded trace images are fully decoded:1453 images total. Both WebM files fully decode, including canonical [issue485.webm](runtime-run/video/issue485.webm). Every [trace.zip](runtime-run/trace/trace.zip) member passes CRC and credential scanning. Required HTML/raw JSON/logs/PNG/trace/video artifacts exist; no missing media is marked PASS. [Complete publication artifact list](artifact-manifest.json) binds actual bytes; no author media is substituted.

## Preservation and cleanup

Freeze SHA256 `b344a0019c78c850179ce258ed35e4a1c2b366c9093ba5eef6c894a466f6661c` verified before/after all13011 files, zero mismatches. All236 external prior-QA proof files also remain byte-identical. Every write is under this new owned QA root; application and previous proof paths were read only.

One combined runtime held `/tmp/clinicos-browser-qa.lock` for the entire lifecycle. Owned Docker PostgreSQL55485, API3485, preview5485/5486, fixture8785 are gone; owned upload/build temp removed, lock available. Preexisting `clinicos-postgres`9000f70d4ee9 remains running. No5432/userVite5304/5311 stop, generic kill or preexisting container modification.

READY FOR CODEX QA applies only to this frozen local candidate and evidence. Parent integration, actual external reviews, protected checks, deployment identity, online verification and issue closure remain with the trusted root/controller. No fifth implementation attempt is implied.

**Codex must now re-run the QA Gate.**
