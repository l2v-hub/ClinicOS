# Codex follow-up 5: Milo fixed-dose payload

The assistant rejected Milo’s captured therapy payload because it carried `doseMode: "fixed"`, which the `bindableTherapy` key allowlist did not accept. Validation stopped at that allowlist before draft matching. The captured response already exposes `therapyDraft.preview.row` directly; no preview unwrapping or matcher change was needed.

The implementation permits `doseMode` only when explicitly present as the literal `fixed`. Payloads that omit the field keep their prior behavior. Unit coverage checks the mapper-shaped payload and rejects `glucose_scale`, unknown, null, object, empty, and explicit undefined values. The existing assistant HTTP positive fixture now carries `fixed`; its prior tampered drug, altered dose/route, hidden-field, stale-preview, and confirmation assertions remain.

**Validation:** two credential-stripped runner attempts each passed the skills unit file (9/9) and backend TypeScript check.

**Not run:** assistant HTTP E2E, API/database, browser/UI, SQL/reload, or remaining matrix. Those require the independent runtime phase. The old QA4 report and STOP remain unchanged; the root-cause correction is recorded in the private author packet.

Source SHA-256 after edit:

- `backend/src/skills/engine.ts`: `3b7aae916e2b7c143e49b7d12e280a22e9edc97caa83aaf60aa18283f4c2f339`
- `backend/src/skills/__tests__/skills-unit.test.ts`: `29ca250e4c5e6eda31e76d790709ec2a14fb2e09ad627b5db3cf8af2db033f02`
- `backend/src/skills/__tests__/assistant-e2e.test.ts`: `711acac709245ab447ad85372637af89b333545f20a4bdbfdd483f76dfb2e480`

The worktree HEAD remains at the assigned base SHA. No Git mutation was performed. Private preservation manifests include source before/after hashes and prove the sealed QA4 report, STOP, and prior proof files remain unchanged.
