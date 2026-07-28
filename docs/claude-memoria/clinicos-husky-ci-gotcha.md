---
name: clinicos-husky-ci-gotcha
description: 'ClinicOS root prepare script must be `husky || exit 0` — bare `husky` breaks CI/production npm install (Azure/Build red)'
metadata:
  node_type: memory
  type: project
  originSessionId: 7a45fd8d-9aea-4836-82a8-521a0c24281f
---

Root `package.json` `"prepare"` MUST be **`husky || exit 0`**, never bare `"husky"`.

**Why:** `prepare` runs on every `npm install`, including CI/production builds (Oryx / Azure Static Web Apps) that omit devDependencies. With bare `husky`, the binary isn't there → `sh: husky: not found` (code 127) → **Build fails**. This broke the "Azure Static Web Apps CI/CD" on main and the Build job on every PR after the tooling quick-win added `prepare: husky`. Fixed in PR #287 (`ad1e974`) with `husky || exit 0` (installs hooks locally when husky is present, no-ops safely when absent; works on both `sh` and `cmd`).

**How to apply:** if CI/deploy fails with `husky: not found` / code 127, check root `scripts.prepare`. Don't revert to bare `husky`. Related: [[clinicos-deploy-mechanics]].
