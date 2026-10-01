// Phase 7 — pure units: shift window (DST-safe), deterministic projection, eligibility.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { romeInstant, shiftWindow } from '../time.js';
import { eligibility, projectSignals } from '../engine.js';
import type { ProactiveEvent } from '../sources.js';
import { EVENT_CATALOG } from '../catalog.js';

test('romeInstant is DST-aware (CEST +2, CET +1)', () => {
  assert.equal(romeInstant('2026-07-15', '07:00').toISOString(), '2026-07-15T05:00:00.000Z');
  assert.equal(romeInstant('2026-12-15', '07:00').toISOString(), '2026-12-15T06:00:00.000Z');
});

test('shift window: current and previous shift from facility time', () => {
  const at = (iso: string) => shiftWindow(new Date(iso));
  const morning = at('2026-07-15T08:30:00.000Z'); // 10:30 Rome
  assert.equal(morning.current.id, 'mattina');
  assert.equal(morning.previous.id, 'notte');
  assert.equal(morning.previous.start, '2026-07-14T19:00:00.000Z');
  const night = at('2026-07-15T22:30:00.000Z'); // 00:30 Rome next day
  assert.equal(night.current.id, 'notte');
  assert.equal(night.previous.id, 'pomeriggio');
});

const ev = (over: Partial<ProactiveEvent>): ProactiveEvent => ({
  eventId: `vitals.recorded:${Math.random()}`,
  type: 'vitals.recorded',
  occurredAt: '2026-07-15T08:00:00.000Z',
  residentId: 'r1',
  residentLabel: 'Rossi Mario',
  actor: { kind: 'operator', id: 'x', name: 'OSS' },
  payload: { parameters: 'pa' },
  ...over,
});

test('projection groups a burst into one signal; a new event changes the revision', () => {
  const burst = Array.from({ length: 10 }, (_, i) =>
    ev({ occurredAt: `2026-07-15T08:0${i}:00.000Z` }),
  );
  const [one] = projectSignals(burst);
  assert.equal(projectSignals(burst).length, 1);
  assert.equal(one!.count, 10);
  const [two] = projectSignals([...burst, ev({ occurredAt: '2026-07-15T09:00:00.000Z' })]);
  assert.equal(two!.signalId, one!.signalId);
  assert.notEqual(two!.rev, one!.rev);
});

test('priority comes from the source field, never escalated by the engine', () => {
  const mk = (priority: string) =>
    projectSignals([
      ev({
        type: 'diary.entry_created',
        eventId: `diary.entry_created:${priority}`,
        payload: { priority, authorType: 'oss' },
      }),
    ])[0]!;
  assert.equal(mk('normale').priority, 'normale');
  assert.equal(mk('importante').priority, 'alta');
  assert.equal(mk('urgente').priority, 'urgente');
  assert.equal(mk('qualsiasi testo').priority, 'normale');
});

test('every write-capable action is an existing skill or a reopen, never a direct tool call', () => {
  const signals = projectSignals(
    EVENT_CATALOG.filter((d) => d.type !== 'access.denied_summary').map((d) =>
      ev({
        type: d.type,
        eventId: `${d.type}:x1:y`,
        payload: {
          workflowId: 'w1',
          priority: 'normale',
          status: 'aperta',
          overdue: false,
          date: '2026-07-15',
          slot: 'mattina',
          time: '08:00',
          outcome: 'erogata',
          version: 3,
        },
      }),
    ),
  );
  for (const s of signals) {
    if (!s.action) continue;
    assert.ok(['skill', 'resume_workflow', 'classic'].includes(s.action.kind), s.signalId);
  }
});

test('eligibility fails closed when the policy check throws', () => {
  const authz = {
    can: () => {
      throw new Error('policy down');
    },
  } as never;
  const e = eligibility(authz, {});
  assert.equal(e.allowed.filter((t) => t !== 'workflow.pending').length, 0);
});
