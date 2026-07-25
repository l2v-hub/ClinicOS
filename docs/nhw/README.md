# ClinicOS NHW Machine Knowledge Base

This directory is the canonical dual-form knowledge base for ClinicOS.

- Resolve a concept by its stable lowercase dot-separated identifier in `catalog/manifest.json`.
- Read the referenced atomic Markdown unit for its definition, behavior, invariants, failures, and evidence.
- Traverse typed relations in `graph/edges.jsonl`; all endpoints are indexed in `graph/nodes.jsonl`.
- Verify claims against `evidence/source-map.jsonl` and source hashes.
- Inspect `coverage/ledger.json` before trusting completeness.
- Apply source precedence: executable runtime, schema and migrations, tests, deployment configuration, requirements, then narrative documentation.
- Treat `observed`, `inferred`, `declared`, `drifted`, and `deprecated` as distinct confidence states.
- Never retrieve configuration values from this knowledge base; only variable names and consumers are modeled.

Current authoring inventory hash: `83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683`.
