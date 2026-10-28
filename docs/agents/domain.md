# Domain documentation

Use a **single clinical domain context** for this setup. The frontend/backend
workspace split alone does not require independent domain glossaries.

Before relevant code exploration, read root `GLOSSARY.md` if present and any
applicable `docs/adr/` decision records. If a future root `GLOSSARY-MAP.md`
explicitly defines multiple contexts, follow that map for the affected area.
Missing glossary/ADR files are not setup failures: create them only when actual
terminology or decisions are established, without inventing clinical rules.
Use established terms consistently and identify conflicts with existing ADRs.

Codex and Claude consume these same docs. Their current user instructions and
ClinicOS quality/release gates take precedence over generic skill advice.
Clinical choices must come from explicit data, existing approved behavior, or
the authorized operator. Preserve auditability and never include patient data,
credentials or live connection strings in specs, examples, logs or evidence.
