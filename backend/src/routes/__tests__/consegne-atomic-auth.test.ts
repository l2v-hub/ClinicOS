import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Prisma construction requires a syntactically valid URL, but these contract tests never connect.
process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:9/clinicos_contract';

const { atomicConsegnaUpdateWhere } = await import('../consegne.js');
const routeSource = readFileSync(new URL('../consegne.ts', import.meta.url), 'utf8');

test('atomic update predicates preserve the current field-level authorization policy', () => {
  assert.deepEqual(
    atomicConsegnaUpdateWhere('handover-1', { id: 'assigned-1', role: 'operatore' }, false),
    {
      AND: [
        { id: 'handover-1' },
        { OR: [{ creatoDaId: 'assigned-1' }, { operatoreAssegnatoId: 'assigned-1' }] },
      ],
    },
  );
  assert.deepEqual(
    atomicConsegnaUpdateWhere('handover-1', { id: 'author-1', role: 'operatore' }, true),
    { id: 'handover-1', creatoDaId: 'author-1' },
  );
  assert.deepEqual(
    atomicConsegnaUpdateWhere('handover-1', { id: 'admin-1', role: 'admin' }, true),
    { id: 'handover-1' },
  );
});

test('handover writes cannot fall back to an unconditional id-only mutation', () => {
  assert.match(routeSource, /tx\.consegna\.updateMany\(\{[\s\S]*atomicConsegnaUpdateWhere/);
  assert.match(routeSource, /if \(result\.count === 0\) return null/);
  assert.match(routeSource, /prisma\.consegna\.deleteMany\(\{[\s\S]*creatoDaId: actor\.id/);
  assert.match(routeSource, /if \(deleted\.count === 0\)/);
  assert.doesNotMatch(routeSource, /prisma\.consegna\.update\(\{\s*where: \{ id \}, data/);
  assert.doesNotMatch(routeSource, /prisma\.consegna\.delete\(\{\s*where: \{ id:/);
});
