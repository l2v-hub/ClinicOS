# Verified CLI Interface Record — issue #263

Session policy: the development worker session runs under a scoped allowlist (Git, GitHub CLI,
Node, npm, npx, RTK, file tools). `claude` and `codex` binaries are not directly invocable by the
worker session; their live behavior was verified through the sanctioned `npm run agent-team:doctor`
alias, which spawns them as child health probes (read-only), and through the PO-verified contract
in issue #263 (bootstrap comment `clinic-os-agent-team:bootstrap-v1`, `claude_cli 2.1.207,
help_verified: true, authenticated: true`).

## Directly executed (this session)

| Command | Output |
|---|---|
| `git --version` | git version 2.52.0.windows.1 |
| `gh --version` | gh version 2.92.0 (2026-04-28) |
| `node --version` | v20.19.6 |
| `npm --version` | 11.13.0 |

## Live doctor probes (children of `npm run agent-team:doctor`, exit 0)

| Probe | Result |
|---|---|
| `codex --version` | ok |
| `codex --help` | ok |
| `codex login status` | ok — confirmation text emitted on stderr (see fix commit "accept Codex login status printed to stderr") |
| `claude --version` | ok |
| `claude --help` | ok |
| `claude auth status` | ok (exit 0; structured/textual confirmation accepted) |
| `gh --version` / `gh auth status` | ok |
| `git rev-parse --show-toplevel` / `git remote get-url origin` / `git worktree list --porcelain` | ok |

Raw sanitized output: `../checks/doctor-smoke.json`.

## Worker option policy (design §CLI Behaviour + plan Global Constraints)

- Claude worker argv: `--print --output-format json --permission-mode acceptEdits` — all asserted
  by the approved plan's unit test and within the design-verified surface ("--print, structured
  output modes"). The plan's `--json-schema <schema>` option is NOT used: it is not part of the
  design-verified interface list and could not be confirmed against the installed `claude --help`
  under this session's allowlist. The required output schema is delivered in-band
  (`required_schema` in the task-data payload) and enforced at intake by
  `validateAgainstSchema` before any GitHub state change, preserving the schema guarantee.
- Codex worker argv: `codex exec --sandbox workspace-write --cd <worktree> --output-schema
  <qa-result.schema.json> --output-last-message <file> -` — from the approved plan for Codex CLI
  0.144.1 (`exec` verified in design).
- No dangerous permission-bypass option appears anywhere in the runtime (see
  `../checks/prohibited-scan.txt`).
