# Independent design review and actual correction

A separate read-only Codex agent reviewed the implementation while it was being written and reported blocking findings, not approval. Findings included: shared staged-patch races; mutable database binding before automatic migration; native deployment reservation without CAS; absence of real user-action/fencing integration; incomplete Max/final-Codex provenance; normalized credential reflection; source/build omissions; native state reader that might attempt initialization; and divergent GH_TOKEN identity.

Corrections in this candidate:
- ALL live mutative operations now fail before reservation or provider writes through requireWriteAuthority; requireAtomicEffect is an independent second fail-closed barrier. No atomicity, live action capability or live deployment is claimed. These do not fix the provider races: they prevent the affected paths from executing until a qualified adapter exists.
- Native provenance consumes actual canonical review/merge proof for the historical application and the new gate separately. Native review ledger coherence is distinct from fresh model execution.
- A read-only runner rejects mutation commands even if a broad local credential is used. Only the exact immutable native read-thread GraphQL query is admitted. Missing state branch cannot be initialized.
- GH_TOKEN must match the validated GITHUB_TOKEN. Both raw and normalized credential aliases are rejected from serialized receipts.
- Windows Path/PATH normalization was corrected after an actual first native reader probe failed with spawn-failed. A later authenticated read-only probe successfully verified historical PR525 native proof. This is NOT approval of the new gate and NOT a deployment result.

Actual local fixture tests: 46 passed, zero failed/skipped. Live mutation, configuration, build, migration, readiness and full parity remain unverified. The separate review agent has not approved deployment or rerun the tests.
