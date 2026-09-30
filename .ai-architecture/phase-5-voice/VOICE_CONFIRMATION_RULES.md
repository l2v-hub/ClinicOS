# Phase 5 — Voice confirmation rules

The Phase 4 confirmation contract (policy v2) is authoritative and unchanged. Voice adds no way to
confirm.

1. **A spoken «conferma» is only text.** After review it reaches `/skills/converse` as a message.
   The engine recognises it (`isExplicitConfirmation`) only to answer «Per confermare premi
   «Conferma» sull'anteprima» — status stays `NEEDS_CONFIRMATION`, zero writes
   (backend test B/K, browser test B). The chat now shows that server reply when the preview has
   not changed, and the voice panel shows the button-only hint in AWAITING_CONFIRMATION.
2. **Confirmation = UI event bound to the preview.** `action:'confirm'` + `previewId` of the
   preview on screen. Before the commit the engine re-checks identity/ownership of the workflow,
   the current policy (capability revocation → `DENIED`, browser test G), the resident scope, the
   preview id (a modified payload → new id; stale id → `preview_stale`) and, for prescriptions, the
   bound therapy payload.
3. **Prescriptions and administrations are proposals.** Voice can only prepare them
   (`HIGH_RISK` preview, browser test D); nothing is written without the button; cancel writes
   nothing.
4. **Resident safety.** An utterance never re-targets: a resident change discards a pending
   transcript; ambiguous names → `NEEDS_CLARIFICATION` with candidates (test C); a resident outside
   the scope → no preview, zero writes (test H). The preview always shows the resident.
5. **Duplicate protection.** One transcript → at most one Assistant request (`submitted` ref +
   reducer + `inFlight`); a double «Conferma» → exactly one write (workflow versioning, test K).
6. **Cancellation before commit.** «Annulla» on the transcript, on the listening mic and on the
   preview never writes (test F, D).
7. **Correction.** The transcript is editable; the workflow uses the corrected value (test E:
   heard 140/90, corrected to 135/85, preview 135/85).
8. **Failure is never success.** DENIED / FAILED / transport errors map the voice state to ERROR;
   the verified result comes only from a `COMPLETED` backend answer.
