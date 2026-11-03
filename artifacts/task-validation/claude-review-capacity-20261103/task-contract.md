# Technical follow-up: complete qualified Claude review packets

Explicitly authorized by the owner on 3 November 2026 as a separate technical
PR with its own tests and genuine Claude Max review. Related blocker: #524 / PR
#525. This is not another implementation or review attempt for the demo.

Current trusted main is d2a08b4850dd954bb790e35f2ed350d5eeacd1c4. Its cloud
source reader caps the whole packet at 700 KiB, even though the existing native
worker already qualifies a unique resolved Opus 1M profile and checks the actual
input/schema/native-margin/output sum before claim. A source-bound reconstruction
of the earlier demo candidate 4991ef9256c56028759a2e4f20f28f890af585d6 needs
695,048 bytes for changed source and historical reports alone, before complete
evidence/context/CI. No current/final demo fit or Max approval is claimed.

## Acceptance criteria

1. Replace the arbitrary smaller transport cap with a FINITE ceiling derived
   from the unchanged 1,000,000-token qualified maximum minus the unchanged
   65,536-token native safety margin. This is only a transport bound, never
   permission to spend that whole amount on a prompt.
2. Before any review claim, keep the exact serialized UTF-8 prompt, actual schema
   bytes, native margin and actual observed model output allowance within the
   qualified/clamped context. Retain the conservative one-byte-per-token upper
   bound, resolved-model pinning and rejection of missing/invalid qualification.
3. Keep immutable whole before/after source retrieval, blob/file limits, bounded
   evidence selection, strict SHA/ownership/CAS guards, no-tools review, no API
   fallback, publication uncertainty and round accounting unchanged.
4. Test a full source-plus-selected-context packet beyond the old 700 KiB cap
   without omissions; prove its actual dynamic fit. Test exact boundary and one
   byte over, Unicode/JSON escaping, invalid bounds, derived-cap overflow and a
   below-static packet that still exceeds the observed dynamic allowance. Such
   failures must not claim a round or invoke the review model.
5. Regress both normal native and explicit recovery consumers without executing
   any recovery. Existing authentication, source and publication tests remain.
   Update only the obsolete old-cap fixture, retaining its rejection assertion.
6. Independent source-bound QA, exact-head CI and a genuine exact-SHA Claude Max
   review under the CURRENT trusted worker are required for the technical PR.
   Leave it ready for final verification: no automatic merge and no deployment.

## Safety and ownership

One writer in C:/w-rv/review-capacity20261103; preserve the primary dirty project
and every existing local checkout/evidence file. The demo's four historical
implementations, sole fifth author cycle, two real reviews and existing holds
remain unchanged. This PR cannot authorize the demo release or another attempt,
nor alter Railway/GitHub permissions, production, credentials, data or SQL.

The new finite bound does not guarantee that PR525's eventual complete packet
fits a fresh observed profile. Its real full-input preflight remains mandatory.
