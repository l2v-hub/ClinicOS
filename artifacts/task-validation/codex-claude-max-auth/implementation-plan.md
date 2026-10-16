# Implementation plan

1. Read official Claude Code Action setup authentication instructions and confirm CLI setup-token support for Pro/Max.
2. Pin subscription review mode in the controller workflow. Prefer dedicated OAuth secret; accept recognizable legacy OAuth only; exclude API fallback and all reviewer credentials from other subprocess roles.
3. Extend captured diagnostic redaction and meaningful real-subprocess regression tests.
4. Replace Anthropic API metadata probe with isolated Claude CLI configuration checks without inference; keep exact reviewed-SHA guard and OpenAI metadata probe.
5. Run scoped tests and independent QA, then push reviewed code and inspect native configuration results. Keep budgets, review/merge/deploy gates intact.
6. Save exact operational status and personal token-entry prerequisite if still missing; never solicit token values in chat.
