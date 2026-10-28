# Scope amendment 1 — PR483

Root authorization before additional consumer source edit, 2026-10-18.

Add frontend/src/components/operator/cartella/useAnomalieReparto.ts and narrowly focused tests for this hook to the existing clinical followup scope. This actual read-feed consumer must parse the discriminated read-only verification group rather than silently omit its drug references. It may use verification.items prescribed drug names without inferred dose/time/administration key. Keep catalog-empty behavior, ACL, deduplication and existing anomaly policy. No new schema or clinical mapping. Original task contract/reservation hashes and all historical proofs remain unchanged.
