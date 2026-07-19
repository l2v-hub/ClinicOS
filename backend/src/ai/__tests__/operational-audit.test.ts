// Issue #223: standardized PHI-safe audit for operational UI/REST actions.
// DB-free: recordOperationalAudit forwards to recordAuditEvent, captured via setAuditPersistence spy.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  recordOperationalAudit,
  setAuditPersistence,
  type AiAuditEventInput,
} from '../audit-store.js';

const ALLOWED_KEYS = new Set([
  'requestId',
  'operatorId',
  'operatorRole',
  'patientId',
  'actionType',
  'kind',
  'channel',
  'fields',
  'outcome',
  'createdAt',
]);

async function capture(fn: () => void): Promise<AiAuditEventInput[]> {
  const events: AiAuditEventInput[] = [];
  setAuditPersistence(async (evt) => {
    events.push(evt);
  });
  try {
    fn();
    await Promise.resolve();
  } finally {
    setAuditPersistence(null);
  }
  return events;
}

test('#223 AC1: records actor / action / entity / outcome / timestamp with channel ui', async () => {
  const events = await capture(() =>
    recordOperationalAudit({
      requestId: 'req-1',
      actorId: 'op7',
      actorRole: 'infermiere',
      action: 'consegna.update',
      kind: 'update',
      patientId: 'pat-9',
      fields: ['stato'],
      outcome: 'ok',
      at: '2026-07-06T08:00:00.000Z',
    }),
  );
  assert.equal(events.length, 1);
  const e = events[0];
  assert.equal(e.operatorId, 'op7'); // actor
  assert.equal(e.operatorRole, 'infermiere');
  assert.equal(e.actionType, 'consegna.update'); // action (entity.verb)
  assert.equal(e.kind, 'update');
  assert.equal(e.patientId, 'pat-9'); // entity scope
  assert.equal(e.outcome, 'ok'); // outcome
  assert.equal(e.createdAt, '2026-07-06T08:00:00.000Z'); // timestamp
  assert.equal(e.channel, 'ui');
  assert.deepEqual(e.fields, ['stato']);
});

test('#223 AC2: only field NAMES are recorded — no values / payload / secrets can be passed', async () => {
  const events = await capture(() =>
    recordOperationalAudit({
      actorId: 'op1',
      action: 'patient.update_contact',
      fields: ['telefono', 'email'],
    }),
  );
  const e = events[0];
  // Structural guarantee: the event carries only the allowlisted keys, and fields are the NAMES given.
  for (const k of Object.keys(e)) assert.ok(ALLOWED_KEYS.has(k), `chiave non consentita: ${k}`);
  assert.deepEqual(e.fields, ['telefono', 'email']);
  // No value-like content leaked anywhere in the serialized event.
  const s = JSON.stringify(e);
  assert.ok(!/@|\+39|\d{6,}/.test(s), `contenuto valore-simile nell'evento: ${s}`);
});

test('#223 AC2: defaults are safe (role operatore, kind update, outcome ok, channel ui, fields [])', async () => {
  const events = await capture(() =>
    recordOperationalAudit({ actorId: 'op1', action: 'room.assign' }),
  );
  const e = events[0];
  assert.equal(e.operatorRole, 'operatore');
  assert.equal(e.kind, 'update');
  assert.equal(e.outcome, 'ok');
  assert.equal(e.channel, 'ui');
  assert.deepEqual(e.fields, []);
  assert.equal(e.patientId, null);
});

test('#223 AC3: fields are capped at 20 (defense in depth)', async () => {
  const many = Array.from({ length: 30 }, (_, i) => `f${i}`);
  const events = await capture(() =>
    recordOperationalAudit({ actorId: 'op1', action: 'bulk.update', fields: many }),
  );
  assert.equal(events[0].fields.length, 20);
});
