# PR 497 final public candidate

Candidate source: `4c85fdf5a97eea10c8efcc6d105cd32de054e030`. This is a reviewable publication candidate assembled from selected author, independent QA, PostgreSQL, and fresh browser evidence. Root still owns independent candidate QA, publication, and every remaining release gate.

- `task-contract.md`, `analysis.md`, `implementation-plan.md`, and `validation-report.md` describe the source change, evidence, limits, and pending gates.
- `source-provenance.json` and `input-provenance.json` record source and evidence provenance. `browser-input-manifest.json` binds selected browser files to the finalized runtime5 output manifest. `payload-inventory.json` lists the candidate payload. `public-payload-seal.json` hashes all candidate files except itself.
- `proofs/` contains selected UI contrast and concurrency artifacts.
- `browser/app/` contains actual app browser results, screenshots, finalized video, and privacy-checked trace evidence.
- `browser/component/` contains synthetic-prop production-component results, screenshots, finalized video, and privacy-checked trace evidence. This component fixture is not clinical HTTP/PG E2E.

The fresh browser run passed on the exact candidate source. The original eight `bb12` evidence aliases remain unchanged and are not claimed as rerun here. Current publication-head native checks, a new actual Claude review, final Codex review, deployment, and closure remain pending. This candidate has not been published.
