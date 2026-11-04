# Revision 7 author validation

Final Decision: IMPLEMENTED — NOT VERIFIED

The superseded 2029 controller now includes no-expiry stages from every subject in its prior-operation digest and nonce inventory. It permits only explicitly blocked-before-write records, validates and uniquely identifies their nonces, and refuses unresolved or staged records before authorizing. Existing no-expiry and finite history is not changed.

## Source and evidence

- Baseline: E2 `4436239a003a44972eb3d80bdcf33c6c292bfab3`. Genuine Max4 was changes-requested, with one medium finding; original report SHA-256 `ebfa55b69e7940d880ad8552f5b432fddebf9b0e7445dc19adf7f4f0efd406bf`.
- Tested controller Git blob: `018036052e106843de3cd4cd3d5de4d60108065d`.
- Tested 2029 test-file Git blob: `4ab39e929289d10e150a8b1566e97373ad51ed64`.
- Independent E2 reproduction: 5 expected failures and 2 passing controls, zero skipped. Its original private RED log SHA-256 is `d6023552c1648285d82cd61bf6881205c2b45954654bfac06f68f48e5b584e46`; the original generated fixture SHA-256 is `6b293399221d71ca3f0173130895e8793dd794638c78fed50a8c92b7009b9ac1`. The packet retains readable copies; originals remain untouched in the independent QA directory.
- The same seven-case fixture, with only absolute imports redirected to this author checkout, passed 7/7 after the fix. Private generated test SHA-256 `a4a118c044458d8d027053c5c9bfb4d7de09b6a526ccd83c8a4bd81ba56dd674`; its private GREEN log SHA-256 `9c60012f5f7e2baa6c32e5e6f7cde46bee04eeb322ed8d58eb71e7e2ccdcebdd`.
- Author behavioral RED: 101 tests, 85 passed, 16 failed, zero skipped; private original log SHA-256 `38a1bc87fee5cfb4baba72b610c19caed63e6a785ca0bf2092101e0ecf1c40d0`. A further nonce-specific RED is retained separately, private original SHA-256 `cf59d147fbc8d8f9827234f0df9ff86399d219247167446f8206a94c0722018d`.
- Final combined author GREEN: 255/255 passed, zero failed or skipped; private original log SHA-256 `6dad560063db6f69b5f1bd72ce8bf13017baac73d2a69cca192b612d5e5aa690`. Command: `node --test scripts/automation/enable-demo-auth-2029.test.mjs scripts/automation/renew-demo-auth-expiry.test.mjs scripts/automation/demo-no-expiry-controller.test.mjs scripts/automation/enable-demo-auth-no-expiry.test.mjs scripts/automation/demo-no-expiry.integration.test.mjs scripts/automation/demo-no-expiry.metadata.integration.test.mjs`.
- `node --check` passed for both changed scripts; `git diff --check` passed before staging. Packet log copies normalize line endings and trailing whitespace; the private originals and their hashes above remain authoritative.

Tests exercise no-expiry state and nonce conflicts across subjects, consumption and write denial, allowed absent/blocked controls, mutation and asynchronous history drift, and existing 2029, finite and no-expiry behavior. In-memory authorization verifiers, stores and provider fixtures are synthetic; no real capability, provider mutation, database, user data, state reset, deploy or online acceptance was involved.

Independent QA, exact integrated-head CI, real Max5, final Codex QA, protected merge, separate staging/deploy authorization and public five-profile verification remain pending. The original hold and historical attempts must remain intact.
