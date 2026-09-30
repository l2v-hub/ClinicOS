// Invocability + GUI parity: roster.* and rooms.occupancy tools reach the SAME services as
// routes/roster-order.ts and routes/admin-rooms.ts; legacy admin/manager gate is preserved.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import { adminRosterOrderRouter, meRosterOrderRouter } from '../../routes/roster-order.js';
import { getFacilityOccupancy } from '../../rooms/occupancy-service.js';
import { createToolRegistry } from '../registry.js';
import { operationsTools } from '../capabilities/operations.js';
import {
  captureAudit,
  cleanup,
  createOperator,
  ctxOf,
  demoHeaders,
  restoreAudit,
  runId,
  serve,
  type TestOperator,
} from './support.js';

const registry = createToolRegistry(operationsTools);
const department = `Reparto ${runId}`;
let guiOp: TestOperator;
let toolOp: TestOperator;
let admin: TestOperator;
let contextId = '';

interface PreferenceDto {
  context: { id: string; label: string; version: string } | null;
  override: { criterion: string; direction: string } | null;
  effective: { criterion: string; direction: string };
  source: string;
  revision: string | null;
}

before(async () => {
  captureAudit();
  guiOp = await createOperator('roster-gui');
  toolOp = await createOperator('roster-tool');
  admin = await createOperator('roster-admin', 'admin');
  // Unique department → the DB trigger links a dedicated RosterContext (never the shared one).
  for (const op of [guiOp, toolOp, admin]) {
    await prisma.operator.update({ where: { id: op.operatorId }, data: { department } });
  }
  const profile = await prisma.operator.findUniqueOrThrow({
    where: { id: toolOp.operatorId },
    select: { rosterContextId: true },
  });
  contextId = profile.rosterContextId!;
  assert.ok(contextId);
});

after(async () => {
  restoreAudit();
  await cleanup([guiOp, toolOp, admin], []);
  await prisma.rosterContext.deleteMany({ where: { departmentKey: `department:${department}` } });
});

test('roster.get_my_order returns the department context of the operator (same as GUI)', async () => {
  const gui = await serve('/me', meRosterOrderRouter);
  try {
    const http = await (
      await fetch(`${gui.base}/me/roster-order`, { headers: demoHeaders(toolOp) })
    ).json();
    const result = await registry.invoke<PreferenceDto>('roster.get_my_order', {}, ctxOf(toolOp));
    assert.equal(result.ok, true, JSON.stringify(result));
    if (!result.ok) return;
    assert.equal(result.data.context?.id, contextId);
    assert.equal(result.data.context?.label, department);
    assert.equal(result.data.source, 'system');
    assert.equal(result.data.revision, '0');
    assert.deepEqual(JSON.parse(JSON.stringify(result.data)), http);
  } finally {
    await gui.close();
  }
});

test('GUI == Tool: roster.set_my_order persists the same override; stale version → conflict on both', async () => {
  const gui = await serve('/me', meRosterOrderRouter);
  try {
    const body = {
      contextId,
      override: { criterion: 'location', direction: 'desc' },
      expectedVersion: '0',
    };
    const httpRes = await fetch(`${gui.base}/me/roster-order`, {
      method: 'PATCH',
      headers: demoHeaders(guiOp),
      body: JSON.stringify(body),
    });
    assert.equal(httpRes.status, 200);
    const http = (await httpRes.json()) as PreferenceDto;

    const tool = await registry.invoke<PreferenceDto>(
      'roster.set_my_order',
      { body },
      ctxOf(toolOp),
    );
    assert.equal(tool.ok, true, JSON.stringify(tool));
    if (!tool.ok) return;
    // Same business outcome (both operators share the context, so the DTOs are identical).
    assert.deepEqual(JSON.parse(JSON.stringify(tool.data)), http);
    assert.equal(tool.data.source, 'personal');
    assert.equal(tool.data.revision, '1');
    assert.deepEqual(tool.data.effective, { criterion: 'location', direction: 'desc' });

    const rows = await prisma.operatorRosterPreference.findMany({
      where: { operatorId: { in: [guiOp.operatorId, toolOp.operatorId] }, contextId },
      orderBy: { operatorId: 'asc' },
    });
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.equal(row.criterion, 'location');
      assert.equal(row.direction, 'desc');
      assert.equal(row.revision, 1n);
    }

    // Replay with the stale version: route 409, tool conflict with the same domain code.
    const staleHttp = await fetch(`${gui.base}/me/roster-order`, {
      method: 'PATCH',
      headers: demoHeaders(guiOp),
      body: JSON.stringify(body),
    });
    assert.equal(staleHttp.status, 409);
    const staleHttpBody = (await staleHttp.json()) as { code: string };
    const staleTool = await registry.invoke('roster.set_my_order', { body }, ctxOf(toolOp));
    assert.equal(staleTool.ok, false);
    if (!staleTool.ok) {
      assert.equal(staleTool.error.code, 'conflict');
      assert.equal(staleTool.error.status, 409);
      assert.equal(staleTool.error.domainCode, staleHttpBody.code);
    }

    // Invalid order is rejected by the existing contract (400 on both paths).
    const bad = { ...body, override: { criterion: 'age', direction: 'asc' }, expectedVersion: '1' };
    const badHttp = await fetch(`${gui.base}/me/roster-order`, {
      method: 'PATCH',
      headers: demoHeaders(guiOp),
      body: JSON.stringify(bad),
    });
    assert.equal(badHttp.status, 400);
    const badTool = await registry.invoke('roster.set_my_order', { body: bad }, ctxOf(toolOp));
    assert.equal(badTool.ok, false);
    if (!badTool.ok) assert.equal(badTool.error.code, 'invalid_input');
  } finally {
    await gui.close();
  }
});

test('roster.list_contexts: admin sees its department context; operatore is forbidden', async () => {
  const denied = await registry.invoke('roster.list_contexts', {}, ctxOf(toolOp));
  assert.equal(denied.ok, false);
  if (!denied.ok) {
    assert.equal(denied.error.code, 'forbidden');
    assert.ok(['role_forbidden', 'capability_denied'].includes(String(denied.error.domainCode)));
  }

  const gui = await serve('/admin', adminRosterOrderRouter);
  try {
    const guiDenied = await fetch(`${gui.base}/admin/roster-contexts`, {
      headers: demoHeaders(toolOp),
    });
    assert.equal(guiDenied.status, 403);

    // Walk the pages with the cursor until our context appears (other contexts may exist).
    let cursor: string | undefined;
    let found: { id: string; label: string; version: string } | undefined;
    for (let page = 0; page < 50 && !found; page++) {
      const query: Record<string, string> = { limit: '100', ...(cursor ? { cursor } : {}) };
      const result = await registry.invoke<{
        items: Array<{ id: string; label: string; version: string }>;
        hasMore: boolean;
        nextCursor: string | null;
      }>('roster.list_contexts', { query }, ctxOf(admin));
      assert.equal(result.ok, true, JSON.stringify(result));
      if (!result.ok) return;
      if (page === 0) {
        const http = await (
          await fetch(`${gui.base}/admin/roster-contexts?limit=100`, {
            headers: demoHeaders(admin),
          })
        ).json();
        assert.deepEqual(result.data, http);
      }
      found = result.data.items.find((item) => item.id === contextId);
      if (!result.data.hasMore) break;
      cursor = result.data.nextCursor ?? undefined;
    }
    assert.ok(found, 'department context listed');
    assert.equal(found!.label, department);
  } finally {
    await gui.close();
  }
});

test('roster.set_context_default: admin updates the default (version++); operatore forbidden, nothing written', async () => {
  const before = await prisma.rosterContext.findUniqueOrThrow({ where: { id: contextId } });
  const body = {
    default: { criterion: 'name', direction: 'desc' },
    expectedVersion: before.version.toString(),
  };

  const denied = await registry.invoke(
    'roster.set_context_default',
    { contextId, body },
    ctxOf(toolOp),
  );
  assert.equal(denied.ok, false);
  if (!denied.ok) assert.equal(denied.error.code, 'forbidden');
  const unchanged = await prisma.rosterContext.findUniqueOrThrow({ where: { id: contextId } });
  assert.equal(unchanged.version, before.version);
  assert.equal(unchanged.defaultCriterion, null);

  const ok = await registry.invoke<{ id: string; default: unknown; version: string }>(
    'roster.set_context_default',
    { contextId, body },
    ctxOf(admin),
  );
  assert.equal(ok.ok, true, JSON.stringify(ok));
  if (ok.ok) {
    assert.equal(ok.data.id, contextId);
    assert.deepEqual(ok.data.default, { criterion: 'name', direction: 'desc' });
    assert.equal(ok.data.version, (before.version + 1n).toString());
  }
  const row = await prisma.rosterContext.findUniqueOrThrow({ where: { id: contextId } });
  assert.equal(row.defaultCriterion, 'name');
  assert.equal(row.defaultDirection, 'desc');

  // Stale version → conflict, unknown context → not_found (RosterError status kept).
  const stale = await registry.invoke(
    'roster.set_context_default',
    { contextId, body },
    ctxOf(admin),
  );
  assert.equal(stale.ok, false);
  if (!stale.ok) assert.equal(stale.error.domainCode, 'roster_default_conflict');
  const missing = await registry.invoke(
    'roster.set_context_default',
    { contextId: `${runId}-missing`, body: { default: null, expectedVersion: '0' } },
    ctxOf(admin),
  );
  assert.equal(missing.ok, false);
  if (!missing.ok) {
    assert.equal(missing.error.code, 'not_found');
    assert.equal(missing.error.domainCode, 'roster_context_not_found');
  }

  // The operator now sees the department default through roster.get_my_order.
  const mine = await registry.invoke<PreferenceDto>('roster.get_my_order', {}, ctxOf(admin));
  assert.equal(mine.ok, true);
  if (mine.ok) {
    assert.equal(mine.data.source, 'department');
    assert.deepEqual(mine.data.effective, { criterion: 'name', direction: 'desc' });
  }
});

test('rooms.occupancy: admin gets the facility KPIs of the service; operatore forbidden', async () => {
  const denied = await registry.invoke('rooms.occupancy', {}, ctxOf(toolOp));
  assert.equal(denied.ok, false);
  if (!denied.ok) assert.equal(denied.error.code, 'forbidden');

  const result = await registry.invoke<Record<string, number>>('rooms.occupancy', {}, ctxOf(admin));
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  const expected = await getFacilityOccupancy();
  assert.deepEqual(result.data, expected);
  for (const key of ['totalRooms', 'totalBeds', 'occupiedBeds', 'freeBeds', 'maintenanceBeds']) {
    assert.equal(typeof result.data[key], 'number');
  }
});
