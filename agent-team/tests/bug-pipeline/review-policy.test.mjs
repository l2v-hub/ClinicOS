import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isStandaloneInfrastructureFile,
  standaloneMergePolicy,
  STANDALONE_INFRASTRUCTURE_SCOPES,
} from '../../src/bug-pipeline/review-policy.mjs';

test('trusted infrastructure classification accepts only canonical paths in fixed scopes', () => {
  assert.equal(Object.isFrozen(STANDALONE_INFRASTRUCTURE_SCOPES), true);
  for (const file of [
    '.agents/review.md',
    '.claude/settings.json',
    '.github/workflows/ci.yml',
    'agent-team/src/bug-pipeline/cli.mjs',
    'agent-team/tests/bug-pipeline/review-policy.test.mjs',
    'scripts/quality-gate/check.mjs',
    'docs/standalone-pr-review.md',
    'CLAUDE.md',
    'AGENTS.md',
  ])
    assert.equal(isStandaloneInfrastructureFile(file), true, file);

  for (const file of [
    '',
    '/docs/policy.md',
    'docs\\policy.md',
    'docs//policy.md',
    'docs/./policy.md',
    'docs/../frontend/app.ts',
    'docs/policy\n.md',
    'frontend/src/app.ts',
    'backend/api/routes.mjs',
    'prisma/schema.prisma',
    'agent-team/providers/cloud.mjs',
    'clinicos-ai-runtime/main.py',
    'scripts/unreviewed.mjs',
    'AGENTS.md/child',
  ])
    assert.equal(isStandaloneInfrastructureFile(file), false, JSON.stringify(file));
});

test('merge policy requires nonempty files and an explicit exact or directory allowlist', () => {
  assert.equal(
    standaloneMergePolicy({
      files: ['agent-team/src/bug-pipeline/cli.mjs', 'docs/standalone-pr-review.md'],
      infrastructureFiles: ['agent-team/src/', 'docs/'],
    }),
    null,
  );
  assert.equal(
    standaloneMergePolicy({
      files: ['CLAUDE.md'],
      infrastructureFiles: ['CLAUDE.md'],
    }),
    null,
  );

  for (const policy of [
    undefined,
    null,
    { files: [], infrastructureFiles: ['docs/'] },
    { files: ['docs/policy.md'], infrastructureFiles: [] },
    { files: ['docs/policy.md'], infrastructureFiles: ['docs-other/'] },
    { files: ['docs/policy.md', 'frontend/src/app.ts'], infrastructureFiles: [''] },
    { files: ['../docs/policy.md'], infrastructureFiles: ['../'] },
    { files: ['docs//policy.md'], infrastructureFiles: ['docs/'] },
    { files: ['agent-team/src/../../frontend/app.ts'], infrastructureFiles: [''] },
    { files: ['clinicos-ai-runtime/main.py'], infrastructureFiles: ['clinicos-ai-runtime/'] },
  ])
    assert.equal(
      standaloneMergePolicy(policy),
      'unsupported-infrastructure-scope',
      JSON.stringify(policy),
    );
});
