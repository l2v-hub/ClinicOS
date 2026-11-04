# No-expiry operations author evidence

Checkout: `C:/w-rv/profiles-no-expiry-ops-worker-20261104`, starting source `e23523a6b1483b159178576dc111a8169071c43c`. No network/provider call, secret read from the environment, deploy, or production action was performed by this worker.

## RED

Command: `node --test scripts/automation/demo-no-expiry-controller.test.mjs scripts/automation/enable-demo-auth-no-expiry.test.mjs`

Initial implementation result: 23 passed, 1 failed. The `wrong Railway project` negative test failed because `validatePrerequisites` checked environment/service but not the fixed project ID. This was a real safety-guard gap, not a fixture mismatch.

## GREEN

Final focused command passed: 36 passed, 0 failed. The tests cover trusted-main/workflow/actor/attempt/SHA guards; exact selector; fixed demo, explicit-tier and synthetic prerequisites; rejection of unknown/malformed flags, missing dataset, short secret, wrong target/tier, already-enabled flag; exact atomic two-variable upsert with `replace:false` and `skipDeploys:true`; fail-closed actual host-session capability injection and disallowed provenance; native merged-release proof, append-only history, CAS-backed authorization/claim/intent/finish, concurrent single-winner claim, replay/unresolved-history/final-await drift; no-mutation paths for failed prereqs and lost ownership; workflow pins/target/environment/test-before-credentials; secret-map erasure on both public-read failures; and strict receipt allow-list/raw+normalized credential reflection.

Additional checks passed:

- `node --check scripts/automation/demo-no-expiry-controller.mjs`
- `node --check scripts/automation/enable-demo-auth-no-expiry.mjs`
- `git diff --check`

The new tests are offline fixtures only. No claim is made about current provider config, actual authorization capability, or live demo readiness.
