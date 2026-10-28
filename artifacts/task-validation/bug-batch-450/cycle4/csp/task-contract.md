# Task Contract

## Task
Bounded CSP amendment within ongoing bug-batch450 author4 (no new attempt). Exact source path frontend/vercel.json, plus original accepted scripts/e2e/issue-450-ingresso.mjs and existing pdfPreviewResources.test.ts if needed.

## Impact Classification
Frontend config yes; privacy/security yes script policy narrowing; backend/API/schema/provider no; OCR/PDF decoder yes; deployment no execution here.

## Current Behaviour
Actual current frontend/vercel.json script-src 'self' rejects WebAssembly.compile in Chromium. Receipt ../csp-wasm-diagnostic.json proves exact CompileError using synthetic loopback document. This alone proves a deployment policy incompatibility; it does not prove the reported hosted failure cause or a failed real PDF render. Full actual built /qa-clinicos/ PDF/JPX reproduction with policy inherited by worker responses is still required before source edit.

## Expected Behaviour
ONLY if actual built PDF decoder under original CSP is denied, allow narrowly scoped 'wasm-unsafe-eval' next to 'self' in script-src. Preserve every other directive, asset rewrite, origins, auth, caching, worker source policy and JS eval prohibition. No unsafe-eval. No arbitrary provider access.

## Acceptance Criteria
- AC1: Actual built nonroot text+scanned JPX PDF under original exact production script/worker policy records decoder WebAssembly denial, retained as a negative reproduction.
- AC2: Minimal candidate adds ONLY wasm-unsafe-eval and actual OpenJPEG wasm200 application/wasm plus nonblank thumbnails/selected page pass; no unexpected console/asset errors.
- AC3: Main-page and worker JavaScript eval remain denied while WebAssembly compiles. Original restricted controls remain recorded.
- AC4: No deployed-site claim without authenticated hosted evidence; local browser synthetic fixture and precise CSP origin adjustment clearly identified.

## Test Plan
Actual Playwright built-preview positive/negative policy comparison, network response MIME/paths, canvas pixels, JS eval negative and wasm positive; full frontend tests/types/build and isolatedfullstack; independent QA rootowned.

## Evidence Plan
All new logs/trace/screenshots under cycle4 only; no credentials/realpatients. Original headers read from trackedconfig and exact local backend origin addition separately recorded. Do not weaken production policy to fix harness networking.

## Gate Status
READY FOR IMPLEMENTATION — conditional on actual PDF decoder negative reproduction and root-approved exact source path. Root already authorized narrow wasm token after concrete proof; no config edit yet.
