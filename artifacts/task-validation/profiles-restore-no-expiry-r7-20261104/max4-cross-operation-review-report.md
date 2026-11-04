# Max4 cross-operation diagnostic — offline RED

Actual E2 source `4436239a003a44972eb3d80bdcf33c6c292bfab3`. The tested `scripts/automation/demo-2029-controller.mjs` working-file Git blob `3c5944718d2d3d3a58b10da29513c3349a4d16ba` matches E2; SHA256 `48f31145dcd75da71af30dba0e4da55233d41d26b9264627564be97e083f6f19`. Max4 proof records one medium finding, changes requested, no approval; canonical report SHA256 `ebfa55b69e7940d880ad8552f5b432fddebf9b0e7445dc19adf7f4f0efd406bf`.

The private diagnostic dynamically copies only the existing fixture setup and imports the actual E2 controller; it calls `authorize` using simulated host verifier, simulated merged proof, and an in-memory CAS store. No real capability, GitHub/Railway request, provider write, deployment or production data was involved. The test's expected policy is rejection before store mutation for each unsafe no-expiry state.

| No-expiry state | Expected | Actual |
|---|---|---|
| claimed | reject, 0 writes | accepted, 1 synthetic store write |
| write-intent | reject, 0 writes | accepted, 1 synthetic store write |
| uncertain | reject, 0 writes | accepted, 1 synthetic store write |
| staged | reject, 0 writes | accepted, 1 synthetic store write |
| missing execution | reject, 0 writes | accepted, 1 synthetic store write |
| absent | accept control | accepted, 1 synthetic store write |
| blocked-before-write | accept control | accepted, 1 synthetic store write |

Actual result: **5 RED, 2 control GREEN, 0 skipped**. The result shows a real controller authorization and in-memory store-guard defect; it does not demonstrate a provider mutation. The old controller's `priorOperations` visits finite, 2029 and permanent stages but omits `demoAuthNoExpiryStages`; `locate` also excludes those records from its cross-operation nonce collection. This permits conflicting authorization and prevents that omitted history from entering the prior-operation digest.

Minimal repair proposal, contingent on explicit new implementation authority: either retire/disable the superseded 2029 actuator, or include all no-expiry records in its cross-operation identity/nonce and prior-operation digest, conservatively reject all states except explicit `blocked-before-write`, preserve existing records and finite assertions, and add direct tests of all five states, safe controls, cross-subject history/digest drift and races. Do not silently interpret an acknowledged or uncertain stage as reconciled. Validate independently and obtain a genuinely authorized fresh review; this report supplies neither authority nor approval.

Private diagnostic generator `repro-2029-noexpiry.mjs` SHA256 `e0ca098aa6fe1e5832ff576cd07f44cd35bdf2e5158590d0a0de7eeb7f4c77cd`; generated actual tests `repro-2029-generated-v2.test.mjs` SHA256 `6b293399221d71ca3f0173130895e8793dd794638c78fed50a8c92b7009b9ac1`; full red log `repro-2029-red-v2.log` SHA256 `d6023552c1648285d82cd61bf6881205c2b45954654bfac06f68f48e5b584e46`. The earlier first RED is retained separately.


## Whole authenticated Max4 provider proof (not approval)

```json
{
  "sha": "4436239a003a44972eb3d80bdcf33c6c292bfab3",
  "round": 4,
  "verdict": "changes-requested",
  "findingCount": 1,
  "highestSeverity": "medium",
  "findings": [
    {
      "severity": "medium",
      "file": "scripts/automation/demo-2029-controller.mjs",
      "line": 80,
      "problem": "The finite-2029 controller's prior-operation scan omits no-expiry stages, allowing conflicting finite staging while a no-expiry operation is unresolved.",
      "requestedChange": "Mutually exclude no-expiry stages from the 2029 actuator or disable the superseded 2029 actuator; add regression coverage for claimed, write-intent, uncertain, staged, and missing execution states."
    }
  ],
  "providerExecuted": true,
  "authMode": "subscription",
  "authModeEvidence": "Trusted-main workflow sets subscription mode and successful provider execution is confirmed by the immutable receipt; no credential value is retained.",
  "model": "claude-opus-5-5",
  "capacity": {
    "contextWindow": 1000000,
    "maxOutputTokens": 128000,
    "inputBytes": 722827,
    "schemaBytes": 1658,
    "nativeOverheadTokens": 65536,
    "requiredTokensUpperBound": 918021
  },
  "canonicalReportSha256": "ebfa55b69e7940d880ad8552f5b432fddebf9b0e7445dc19adf7f4f0efd406bf",
  "compactReportSha256": "83ebe1c0f93d0535510906f0f14e42067d853efd049de4002c77556e1f3f11da",
  "requestId": "c4ec3d67-7166-495f-b0e1-7637abbf341a",
  "runId": 41800415210,
  "runAttempt": 1,
  "runSourceSha": "6e3d880921653465ca0527b40f9fc09f6486ada2",
  "jobId": 126474516695,
  "nativeReviewId": 5765650868,
  "nativeReviewState": "COMMENTED",
  "nativeReviewBodySha256": "abc34348e7df6f575f2b4170cccad903028e590f5044a907f93cd348ecfcb1b2",
  "reportCommentId": 6626514216,
  "reportCommentBodySha256": "5490784de30ea810d32392014c69acda49375facc80a07b9039a95841cfd087b",
  "artifactId": 13307868024,
  "artifactDigest": "sha256:492fdfc7b15c5ca33e370debf28774651dada11dd6abdf39ef6ff681d28a1176",
  "artifactReceiptSha256": "a83a4884f775ff80daff19efc61ec78b5f4ef6b2b7094db359fb7e9405cb83f5",
  "approvalGranted": false,
  "releaseAuthorized": false
}

```
