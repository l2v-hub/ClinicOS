# Plan

1. Preserve primary/runtime checkout; create isolated follow-up worktree on main62a52a94. Cherry-pick only approved093 assertion; source test bytes must match093 exactly.
2. Add only exact follow-up branch=false to frontend Vercel git.deploymentEnabled; verify against live project root and official branch-default semantics. No provider project settings mutation.
3. Validate native suite, unchanged baseline config, branch veto, independent QA/negative control, sanitized browser metadata and artifacts. Commit source/evidence once frozen; no code writer concurrent with review.
4. Push only follow-up branch, create PR without auto-merge, attach it. Observe CI and absence of deployments. Use final remaining cumulative Claude cycle4 on exact source after CI; Max subscription only, Read/Glob/Grep, no MCP/API fallback or writes.
5. Publish exact head/CI integration identities, independent evidence, Claude verdict, deployment absence and preservation checks. Leave open for final human verification; if any essential gate fails, report actual limit, no merge/deploy/issue processing.
