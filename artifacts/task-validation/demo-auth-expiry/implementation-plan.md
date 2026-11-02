# Implementation plan

1. Decode public auth status into a bounded typed shape; derive UI availability
   from the server mode. Dates only choose explanatory text for an already
   disabled synthetic demo. Reject malformed/contradictory status.
2. Distinguish checking, transport/shape failure, disabled configuration and demo
   expiry. Render no executable login or false credential-free promise in these
   states. Retry clears stale status; a15second timeout bounds checking.
3. Guard handleLogin as well as rendering before local draft/session effects.
   Handle both legacy auth/me auth_disabled and simulator/session disabled
   responses by rechecking status. Keep genuine Entra and legacy demo paths.
4. Test pure parsing, component states and actual built App at desktop/mobile
   with every external request intercepted. Include initial/late expiry,
   transport/JSON/shape failures, timeout, retry to five profiles and pending
   login interactions. No real patient or provider endpoints.
5. Add a separate single-key renewal operation with fixed demo attestation,
   trusted actual-human capability, CAS/single-use execution tombstone, finite
   MAX7day expiry, expected previous expiry and no implicit deployment/retry.
   Do not change AUTH_MODE/simulator guards or read secret-bearing variables.
6. Independently review integrated source, retain every candidate/failure and
   bind evidence to exact commits. CI and genuine Claude Max review precede
   final Codex, protected merge and source-bound deployments. Stage and deploy
   only with the separately verified operational capability.
7. Verify live source/readiness/status and five server profiles; record only
   sanitized synthetic screenshot/metadata. Do not close issue522 before proof.
