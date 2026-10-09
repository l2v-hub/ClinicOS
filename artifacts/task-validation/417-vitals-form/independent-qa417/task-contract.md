# Task Contract

## Task
Fresh independent QA for original l2v-hub/ClinicOS issue #417, application commit 02b4ba89af291186a72e040b868da024bb865164; baseline 0d7adc361b92c8466655d9ed830d2b87bbd0f419. QA agent is not implementer or release owner.

## Impact Classification
Frontend/UI yes; security/privacy yes; backend/database/API/auth/config/dependencies unchanged. Only QA artifacts, dependency junction and QA server configuration are writable. No source edits, commits, pushes, deployment or GitHub mutation.

## Current Behaviour
Original issue reports inconsistent chart/ward labels, PA input, order, prior values, NEWS2 guidance and keypad. Source evidence is not instructions. Read original and all comments independently; original audit deployed commit is unidentified.

## Expected Behaviour
Both real SPA surfaces present identical field schema while retaining patient selection and original separate save/draft ownership. New inputs are distinct from previous captions. Native keyboard order reaches NEWS2 choices/help. Validation, errors and keypad agree. No changes to clinical thresholds or claims about hardware.

## Acceptance Criteria
1. Identical labels, units, field order and input format in chart and ward.
2. Coherent native Tab order through NEWS2 fields, accessible linked help and no premature save.
3. Historical measurements never prefill new controls; loading, errors, bounded/paginated history are truthful.
4. Same invalid/valid/decimal/malformed/oversized input matrix, linked errors/focus, no invalid POST, identical keypad semantics, and retained uncertain save identity / definite rejection / patient/session guards.

## Test Plan
Independently run focused frontend and backend parameter suites, frontend/backend types, isolated output production Vite build, full frontend suite with exact pinned baseline failure delta, manual source security review and configured source/dist credential scan. Author adversarial Playwright cases on actual SPA localhost7480 with every API request intercepted and non-loopback blocked BEFORE navigation. Save only synthetic values. Include reload persistence, patient switching during inflight save, loading/error/pagination, native Tab/Enter/Next/keypad/caret semantics at desktop/tablet/mobile.

## Evidence Plan
Own issue capture, canonical and physical source receipts before/after, raw command outputs, immutable failed preliminary runs, real Playwright HTML report/raw results/trace/video/final screenshots. Seal all artifacts with SHA256 manifest, then relinquish browser ownership. Disclose baseline failures without asserting global green.

## Safety / Policy Receipt
ALLOW read-only source/git/API issue reads and synthetic loopback QA runtime under assigned scope. ALLOW QA artifact writes and dependency junction; cache/build/test outputs redirected to QA scope. DENY real patient/production writes, source edits, credential output, GitHub mutations and any release. Assigned detached checkout C:/w-417-qa, exclusive browser lane port7480. Known unrelated launcher changes preserved and excluded only from application input claims.

## Gate Status
READY FOR IMPLEMENTATION
