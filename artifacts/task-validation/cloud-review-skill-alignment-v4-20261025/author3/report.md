# PR #511 review findings reconciliation

Source baseline: `d981ee054a9a16b920cae474a50540f88f9b73de`. Scope remains the single documentation file `.claude/skills/clinicos/references/bug-delivery.md`. The patch applies only the requested Section 7 and Section 8 wording changes; all other paragraphs, including human trust-root and ownership rules, are preserved.

1. **Medium, Section 7 activation evidence (partially addressed; packet evidence remains parent-owned).** Section 7 now explicitly states GitHub Actions string comparisons are case-insensitive and that `TRUE`/`True` enable while `FALSE`/`False` disable. The supplied workflow expression shows the unset/empty and lowercase `true` conditions plus the probe exception; GitHub comparisons ignore case. The supplied operator guide documents the probe contract. The parent packet is responsible for attaching these exact source/context files and the required check evidence. Old-head green checks on `d981ee0` do not establish checks on this edited output, and no fresh native human review on the new SHA is claimed here. The change requires new-head native checks and the independent authorized human review required for `.claude/` before merge.

2. **Low, referenced guide ordering.** Resolved by supplied native evidence: PR #513 is merged, with merge commit `a9510cfd1085800df7015682dd330ee562e1191f`, which is the stated main baseline. Section 8 also points operators to `docs/cloud-claude-review.md` and Section 7.

3. **Low, duplicate activation text.** Resolved. Section 7 contains the complete activation semantics and operational probe instructions. Section 8 now refers to Section 7 and `docs/cloud-claude-review.md`, retaining the supported-host alternative and the no-Anthropic-API-billing/no-extra-key policy.

4. **Low, case-insensitive values.** Resolved in Section 7 with explicit enabled and disabled examples.

No native review, new-head check, test run, or human approval is asserted by this author report. The finding-to-change scope is limited to the two requested textual corrections.
