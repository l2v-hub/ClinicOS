# Cycle 19 — Bounded cross-patient vital search

## Baseline risk

The assistant loaded the first 100 patients without deterministic ordering, applied the signed patient allow-list only after that cap, and then loaded one complete clinical chart per patient in a sequential N+1 loop. Partial results were not disclosed in the visual or spoken response.

## Acceptance criteria

- Apply tenant, role/environment gate, and patient scope before clinical reads.
- Apply the patient allow-list in SQL before the patient cap.
- Replace the sequential N+1 path with at most two bounded database reads.
- Keep patient order deterministic and align every returned vital with an authorized source reference.
- Bound patient scanning, patient results, nested vital readings, and source references.
- Propagate truncation to the assistant response and disclose partial results visually and through TTS.
- Use one-row look-ahead so an exact-size result is not marked partial without evidence.
- Tolerate malformed legacy `parametriVitali` values without failing the whole search.

## Safety envelope

- Cross-patient search remains disabled by default and requires manager/admin role plus explicit environment enablement.
- No write capability and no schema migration.
- No raw clinical content is added to audit records.
- Rollback is the single cycle commit.
