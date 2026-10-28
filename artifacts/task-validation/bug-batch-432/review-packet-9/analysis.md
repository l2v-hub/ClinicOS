# Analysis

The final review after Claude4 identified an authoritative write/read identity mismatch. The read path recognized a same-patient, same-civil-day legacy administration (`therapyId=null`, exact drug name) across bands, while the write guard queried only a modern therapy ID. A one-off prescription clock repaired from untimed to a valid time could therefore enable a duplicate given row or let a stale pending request bypass a recorded refusal.

The source correction adds a single-day identity lookup after access and prescription validation and passes the selected result through the existing `recordedOneTimeOutcome` priority helper. The author continuation also requires an explicit observed refusal state before correction: `expectedStato=non_erogata`. Pending or omitted state rejects. The existing refusal-correction path updates the selected historical row, preserving its ID, null therapy ID and provenance; normal receipt and actor rules remain in force.

QA9 independently confirmed 19 pure tests, 19 real HTTP/PostgreSQL tests, backend types and a private Vite build, then completed four selected rendered/HTTP/SQL continuation steps. It also retained the first runtime harness failure and earlier QA attempts as history. The verdict is scoped readiness for fresh Codex QA, not release certification.
