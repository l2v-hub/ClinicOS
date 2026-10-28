# Independent QA: Matt Pocock skills source split

**Verdict: PASS for the exact 80-file Codex project-skill vendor source.** `sourcePublicationReady` is `true` for this scoped source change. This verdict covers mechanical source identity, structure, license, references, and static risk review. It does not establish runtime integration, shared Claude or routing readiness, CI, peer review, final review, or merge readiness.

## Evidence checked

- Read immutable Git objects with `git show`/`ls-tree`; the examined source is commit `1123d8bb33d5dec4bcb09e5c6bc7851797db5ee7` (tree `f4c906746f2bb0cbdc9550c197e71ff95ae2acfb`), parented by accepted base `2dc0c0050a9f18a51a7ac980b42b46057870e27e`.
- Compared every one of the 80 manifest entries against preserved PR 505 head `10153ed09e4b16d36f68e49bd6e503b0255c7dc2`: all raw bytes, Git blob IDs, and modes match the recorded projection; the total is 219,349 bytes. The source commit changes exactly those 80 paths from the stated base. None existed at the base, so there are zero main-skill overwrites.
- The 80 paths are 79 skill files across 27 skill directories plus `docs/agents/matt-pocock-LICENSE.txt`. Each directory has a `SKILL.md` with a parseable `name` and `description` frontmatter matching its directory, and parseable `agents/openai.yaml` metadata.
- The MIT license preserves the copyright and full permission, notice, warranty, and liability terms. Recorded provenance is upstream `mattpocock/skills` v1.3.1 at `5beb35b040e3de97e54fa9e386d7e42d15c295c2`, inherited from PR 505 metadata. No independent fresh upstream fetch is claimed or needed for this byte-preserving split.
- Checked 40 relative Markdown links. Three links in `domain-modeling/GLOSSARY-FORMAT.md` point to illustrative `src/ordering`, `src/billing`, and `src/fulfillment` project-layout examples inside a fenced example; they are not required vendor support files. Other checked relative links resolve within the vendored set.
- Reviewed prompt text and shell templates as data only. No vendored command, template, or instruction was executed.

## Findings and limits

1. **Scope is correctly partial.** This is only the 27 Codex project skill definitions and MIT attribution. It does not include the separate 23-file runtime/routing portion, and it does not support a global-install, shared-Claude, or complete-setup claim. The source report correctly leaves native packet, exact-head CI, independent peer/final review, and protected merge pending.
2. **Future invocation can have side effects.** The vendored `/wizard` material describes scripts that open URLs, accept credential values, write `.env`, and can set GitHub secrets/variables with `gh`; other skills describe publishing approved specs or tickets to a configured issue tracker. Those are intended user/project actions, not actions taken by this vendor commit. Review the generated procedure and authorize its external or credential-writing effects when those skills are later invoked.
3. **Reference examples are intentionally not shipped.** The three missing `src/.../GLOSSARY.md` targets are illustrative repository paths in the format guide, not files required for the skill to load.

No blocking source, formatting, privacy, attribution, or instruction-handling defect was found in the bounded scope. The original PR 505 and its runtime remain outside this source commit; this QA does not claim independent verification of remote PR state.
