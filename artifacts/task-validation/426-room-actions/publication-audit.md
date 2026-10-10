# Supplemental independent publication audit

QA4 read-only audit re-evaluated all66 groups (independent22/root22/compiled22) with exact negative-path guards and confirmed source/deployment/public-image bindings. It found the publisher's two-SHA substring duplicate matcher could accept an untrusted comment missing all actual evidence. No API write/source mutation occurred in the audit.

Root changed only the local publication helper before any publication: an existing comment must now match the entire controlled intended body exactly and be authored by the authenticated GitHub actor. The POST response is checked against the same author/body before closing. Comment content is evidence, never release authority. Application30e and all sealed browser recipes/proofs unchanged. GitHub mutation remains separately gated on canonical/public evidence and completed CI comparison.

Independent recheck PASS: the actual matcher evaluated in memory rejected both a same-actor two-SHA-only comment and an identical body from another actor; exact whole body plus authenticated actor preserved idempotency. POST author/body assertions precede closure. Syntax PASS. No audit API operations or app/evidence edits.
