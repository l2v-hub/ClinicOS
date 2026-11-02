# Revision 4 analysis — genuine Claude findings

Source a5be73fa0d6d75abe216b67f99dbc754449f6315; baseline bc880a6dccc40d8dbad73c718c8aa4256562d254.

Round1 on ed5686807ea4a358430563c7a488fde1bf478f81, run41505078505, native review5741807864 was genuinely changes-requested, not approved. Both original report bytes and claim/request/round nonces are retained in history and canonical imported prefix. No budget reset or PR520 allowance is used.

Finding1: a successful staged operation permanently excluded every later renewal. The revised controller permits only an expired, strictly linked staged chain; the latest completed cutoff must exactly equal the new expected prior expiry. All earlier authorization/audit prefixes are checked. In-flight/uncertain, live, parallel and skipped-cutoff states remain blocking. Fresh live target inspection still precedes each later claim/write, so an old stage never applied to the backend cannot enable a later mutation.

Finding2: invalid optional expiry metadata rejected enabled Entra/demo modes. Unusable metadata now normalizes to null; server mode remains the sole availability gate. Disabled mode stays blocked and cannot be falsely classified expired. Unknown/contradictory auth gates still reject. New tests extend rather than skip coverage.

No backend auth, role policy, source target, production credential, SQL or clinical write was changed.
