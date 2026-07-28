---
name: clinicos-worktree-validation
description: How to validate a ClinicOS PR branch locally in a git worktree (npm workspace + Prisma traps)
metadata:
  node_type: memory
  type: project
  originSessionId: d977eeaf-eae7-40b8-9261-fbc00f31ba7b
---

Validating a PR branch in a worktree (`.worktrees/*`, `.wt-*`): the repo is an npm workspace — `node_modules` dirs may exist but be EMPTY; check `node_modules/.bin/tsx` at the worktree ROOT, and run `npm install` from the worktree root, not from backend/. Then `npm run prisma:generate` in backend/ is MANDATORY before `npm test`, otherwise ~14 test files fail in bulk with "module '@prisma/client' does not provide an export named 'PrismaClient'" (stub client). Green sequence: root `npm install` → backend `npm run prisma:generate` → `npm test` → `npm run build` → frontend `npm run build`.

When GitHub Actions is billing-blocked (jobs never start, annotation "recent account payments have failed"), this local validation posted as a PR comment is the accepted substitute evidence for the Codex gate — see [[clinicos-evidence-workflow]].
