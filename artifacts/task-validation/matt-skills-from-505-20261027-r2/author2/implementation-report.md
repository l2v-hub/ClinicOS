# PR518 — genuine peer1 correction author delivery

Reservation92aa0766-efbe-44ff-beec-4c343162cec9; source cf45ad47f4146f929bf5a19acd12d35336258953; peer report6443164512. TaskContract was written before edits. The actual authoring target is this private source-files/ projection of exactly the five reserved paths. The prepared worktree was initially not materialized, so its first read failed; the coordinator subsequently materialized it. No author checkout/restore was performed and the five worktree paths still match the original baseline byte-for-byte.

## Three findings addressed

1. Wizard is explicit-only in both harnesses: policy.allow_implicit_invocation:false in its existing Codex YAML and disable-model-invocation:true in its SKILL frontmatter. Wizard instructions and ask-matt now require a specific wizard request and no longer claim automatic invocation upon a setup blocker.
2. Wizard preparation uses example/template key names and configuration references only. It explicitly excludes live env files, credentials, process values, stored hosting/CI secrets and copying secret values into defaults/prompts/reports. No real env/credential file was read and no vendored script/instruction was executed in this task.
3. The inherited PR Summary is retained unchanged because the actual upstream HumanLayer MIT permission was retrieved and verified. CREDITS now links the real humanlayer/skills show-me path at immutable revision653b6411c1f70c275a18e37673b042ff99f67ceb and contains the complete exact MIT copyright/permission/disclaimer. PR metadata uses that same URL, proper HumanLayer spelling, MIT and CREDITS notice. The imported attribution to Dex Horthy is described accurately as the imported attribution, not a newly verified author claim. Matt Pocock's existing package license remains untouched.

Five public, unauthenticated read-only HTTP requests succeeded: main license, main skill, main ref, pinned license, pinned skill. Both pinned files match the initially retrieved main bytes exactly. Receipts and bytes are in public-provenance/. No further provenance request was made; no credentials were sent. License SHA5f13c18ea00ea5c1384f41745feeca774079164f7f59a92e4ac0899ad217b26f; pinned skill SHA434a2346cc95e313b0d367d477dda2e23ba642dd2181757415a09500664af100.

## Actual validation

All27 imported skill frontmatters and27 Codex agent YAML files parse with a duplicate-key-rejecting safe YAML loader. Names/descriptions and boolean invocation flags are valid. Wizard flags and key-only research guidance, identical original PR body after frontmatter, complete exact HumanLayer notice, matching pinned URLs, unchanged Matt license and exact five-file source projection passed. Package source count stays80; no81st license file is introduced.

An initial verifier counted all29 repository skills instead of the27 imported skills, including existing clinicos and codex-bug-triage. That failed probe is retained in validation-probe1.json; the verifier now scopes the imported package. No source edit was made to bypass this failed assertion. Static validator is private validate-static.py and performs no network or vendor execution.

READY_FOR_INDEPENDENT_QA; final decision PARTIAL. Native import/new implementation2, new-head CI, genuine Claude, fresh independent final Codex and ordinary protected merge remain pending. Original505/cf45, prior QA and peer1 remain immutable. This delivers source corrections only; it does not claim global runtime installation or completion of remaining PR505 runtime integration.
