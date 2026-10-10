# Release parser incident

Before any source promotion the root release parser stopped on `0 !== undefined`: the original six-case browser recipe deliberately omits `expectedErrors` when mutations are disabled, whereas supplemental recipes explicitly store zero or one. Raw QA and replay evidence, source, recipes and assertions were not edited.

The integration parser now treats that absent field as zero only with mutations disabled and no allowed mutation, requires exactly zero console/HTTP errors, and still checks explicit controlled409 cases exactly. Only the integration parser changed; no test failure or application finding was waived. Failed invocation retained in the task tool transcript; source promotion had not executed.
