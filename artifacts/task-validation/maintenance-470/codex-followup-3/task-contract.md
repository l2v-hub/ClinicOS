# Task Contract

## Impact Classification
Read-only metadata classification for the actually observed three-volume demo. No SQL cleanup, deletion, attach/detach, SSH, deployment, paid resource or workflow change. Manual issue owner retained.

## Current Behaviour
Actual read-only run39179286156 on61d9793a9ae12252f1eb53e7082a855e8b0f8b4c stopped with UNCLASSIFIED_DEMO_VOLUMES: two attached service volumes and one unattached. Existing cleanup binding deliberately requires exactly one volume. SQL previously cleaned and independently inventoried; never repeat DELETE. Safe receipt does not identify actual DB volume or prove all storage empty. Actual prior Claude and Codex reviews on61d9793 remain immutable and do not approve new source.

## Expected Behaviour
Separately classify privately matched configured DB service/volume using existing credential identity and unchanged mount verifier. Other attached/unattached volumes stay explicitly unknown. Optional bounded snapshot UUID observations must be separately capability-guarded and stable; metadata never proves PHI absence or deletion. Existing mutating/helper guard remains unchanged and existing bindingVerified stays false after its failure.

## Acceptance Criteria
- Only wrapper and its test plus NEW packet. Imported demo-storage-backups.mjs SHA f663075284f14b479fd4c5d2bb2dbf952c0b360fe3dc5582a3490a57dd0e5189 and demo-patient-inventory.mjs SHA ea94b7ff88a2570eb57c7e86c2b5ff64544a99d67f6be42d2451d2ad8d833bb1 immutable; workflow and old jobs byte-identical. Never filter extra volumes to make original helper pass, forge binding or soften deletion guard.
- New read-only classification reached ONLY after actual expected helper failure with exact validated context/state. Private backend DATABASE_URL and unique matching service config identify configured DB; names alone insufficient. Require unique READY DB-attached volume and actual unchanged verifyDatabaseMount/PGDATA. Foreign/ambiguous/missing/unready/unsafe mount fails closed. All observed volumes retained, unknowns explicit, no raw names/paths/config/passwords or hashes of private config output.
- Snapshot lists if implemented must use a distinct observed-ID read capability, exact native query/variables only, verified full inventory/no pagination omission, UUID-only unique sorted bounded results; no legacy binding setter bypass. DB-only variant may explicitly leave other snapshots unobserved to stay minimal. Two fresh private config/environment/binding/list passes plus branch guards required before any stable classification claim; changes including snapshot identity not just count fail closed. Global request/byte/deadline bounds still apply.
- Keep top-level blocked/non-clean, bindingVerified/sourceStorageVerified and all cleanup/deletion/redeploy flags false when unknown extra volumes remain. New classification receipt is observation only, never issue closure or authorized mutation. Unsupported/denied snapshots must stay unobserved/incomplete; no fallback account or action.
- Actual three-volume synthetic regression and adversarial wrong credential/service/environment/mount/state, forged capability/arbitrary UUID/modified query/SSH/mutation/extraargs/partial/duplicate IDs, drift, secret reflection and finite safe errors. All original115 tests preserved. Existing helper mutation-denial tests still reject extra volumes.
- Freeze original source/public/private QA1-6/actual receipt/reviews by hash/inode before edits, privatize source hardlinks. Root sole actual Git/GH/state/provider writer. Author readonly actual Git, synthetic local fixtures only. Use trusted credential-stripped verification runner, no real provider/network/Max/PC/DB/browser actions.

## Scope
- scripts/maintenance/demo-storage-inspect.mjs
- scripts/maintenance/demo-storage-inspect.test.mjs

## Test Plan
Read private bounded analysis /workspace/.clinicos-cloud/470-volume-classification-analysis-20261019/ and actual receipt without dumping raw logs. Fresh wrapper tests and meaningful boundary regressions, preserve every failure/exit status. Author STOP then independent exact committed full and cone-sparse tests. Actual Claude and fresh final Codex before any one root-controlled read-only dispatch. Never rerun SQL cleanup.

## Evidence Plan
Private /workspace/.clinicos-cloud/470-classification-author7-20261019; NEW safe MD/JSON public artifacts/task-validation/maintenance-470/codex-followup-3. No ignored raw logs force-added. Exact hashes and all old proof preservation, disclose limits and unknown contents. Old maintenance branch must never replace main; publish only reviewed bounded diagnostic changes on its existing branch.

## Gate Status
READY FOR IMPLEMENTATION after authenticated user-session six-to-seven allowance and canonical nonce readback. Prior six attempts and actual failed read conserved; ongoing user continue-until-resolution grant applies. This source change cannot itself close470 or prove storage empty.
