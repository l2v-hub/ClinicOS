// UX direct-access W4: diary per-reader «Presa visione», capability-gated diary actions, NEWS2
// compact text / «Rileva ora», agenda info without taps. Static render (no DOM), real components.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DiarioPazienteTab } from '../DiarioPazienteTab';
import { ackTime, countToSee, needsMyAck, seenByText } from '../diaryAck';
import { writeSessionCache } from '../../../../lib/sessionCache';
import { diaryCacheKey, type DiarySnapshot } from '../../../../lib/patientTabSnapshots';
import { setSessionCapabilities } from '../../../../lib/capabilities';
import type { CapabilityMap, DiarioPazienteEntry } from '../../../../types';
Object.assign(globalThis, { React });

const NOW = new Date('2026-10-03T10:00:00.000Z'); // 12:00 Europe/Rome

function entry(over: Partial<DiarioPazienteEntry>): DiarioPazienteEntry {
  return {
    id: 'e1',
    patientId: 'p1',
    authorType: 'medico',
    authorName: 'Medico 1',
    title: 'Febbre',
    content: 'TC 39.2',
    priority: 'urgente',
    status: 'aperta',
    entryDateTime: '2026-10-03T08:00',
    category: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...over,
  };
}

const caps = (allowed: Record<string, boolean>): CapabilityMap =>
  Object.fromEntries(
    Object.entries(allowed).map(([id, ok]) => [
      id,
      { allowed: ok, effect: ok ? 'ALLOWED' : 'DENIED' },
    ]),
  ) as unknown as CapabilityMap;

function renderDiary(entries: DiarioPazienteEntry[], patientId: string): string {
  writeSessionCache<DiarySnapshot>(diaryCacheKey(patientId, 'tutti'), {
    entries,
    hasMore: false,
    nextCursor: null,
  });
  return renderToStaticMarkup(
    React.createElement(DiarioPazienteTab, { pazienteId: patientId, operatoreNome: 'x' }),
  );
}

test('needsMyAck / countToSee: only urgent entries not yet seen by THIS reader', () => {
  const unseen = entry({ acknowledgeable: true, acknowledgedByMe: false });
  const seen = entry({ id: 'e2', acknowledgeable: true, acknowledgedByMe: true });
  const normal = entry({ id: 'e3', priority: 'normale', acknowledgeable: false });
  const legacy = entry({ id: 'e4' }); // no ack fields (legacy / older backend)
  assert.equal(needsMyAck(unseen), true);
  assert.equal(needsMyAck(seen), false);
  assert.equal(needsMyAck(normal), false);
  assert.equal(needsMyAck(legacy), false);
  assert.equal(countToSee([unseen, seen, normal, legacy]), 1);
});

test('seenByText: names and times in plain text, the reader is «te»; older days carry the date', () => {
  assert.equal(seenByText([], NOW), null);
  assert.equal(
    seenByText(
      [
        {
          operatorName: 'Infermiere 1',
          operatorRole: 'infermiere',
          acknowledgedAt: '2026-10-03T06:12:00.000Z',
          byMe: false,
        },
        {
          operatorName: 'Medico 1',
          operatorRole: 'medico',
          acknowledgedAt: '2026-10-03T06:30:00.000Z',
          byMe: true,
        },
      ],
      NOW,
    ),
    'Visto da: Infermiere 1 08:12, te 08:30',
  );
  assert.equal(ackTime('2026-10-02T19:05:00.000Z', NOW), '02/10 21:05');
});

test('diary card: urgent unseen entry shows «Da vedere» + «Presa visione»; seen shows «Visto da»', () => {
  setSessionCapabilities(null);
  const html = renderDiary(
    [
      entry({ id: 'u1', acknowledgeable: true, acknowledgedByMe: false, acknowledgements: [] }),
      entry({
        id: 'u2',
        acknowledgeable: true,
        acknowledgedByMe: true,
        acknowledgements: [
          {
            operatorName: 'Infermiere 1',
            operatorRole: 'infermiere',
            acknowledgedAt: NOW.toISOString(),
            byMe: true,
          },
        ],
      }),
      entry({
        id: 'n1',
        priority: 'normale',
        acknowledgeable: false,
        acknowledgedByMe: false,
        acknowledgements: [],
      }),
    ],
    'p-ack',
  );
  assert.equal(
    html.match(/>Presa visione</g)?.length,
    1,
    'one button: only the unseen urgent entry',
  );
  assert.equal(html.match(/>Da vedere</g)?.length, 1);
  assert.match(html, /1 voce urgente da vedere/);
  assert.match(html, /Visto da: te \d{2}:\d{2}/);
  assert.match(
    html,
    /data-entry-id="u1"[^>]*>|class="[^"]*diario-card--to-see[^"]*"[^>]*data-entry-id="u1"/,
  );
});

test('F8: Modifica / Elimina appear only with the capability the backend enforces', () => {
  const rows = [entry({ id: 'c1', priority: 'normale' })];
  setSessionCapabilities(caps({ 'diary.update_entry': true, 'diary.delete_entry': false }));
  let html = renderDiary(rows, 'p-cap-nurse');
  assert.match(html, /title="Modifica"/);
  assert.doesNotMatch(html, /title="Elimina"/);

  setSessionCapabilities(caps({ 'diary.update_entry': false, 'diary.delete_entry': false }));
  html = renderDiary(rows, 'p-cap-oss');
  assert.doesNotMatch(html, /title="Modifica"/);
  assert.doesNotMatch(html, /title="Elimina"/);
  assert.doesNotMatch(html, /diario-card__actions/);

  setSessionCapabilities(caps({ 'diary.update_entry': true, 'diary.delete_entry': true }));
  html = renderDiary(rows, 'p-cap-all');
  assert.match(html, /title="Elimina"/);
  setSessionCapabilities(null);
});

test('NEWS2: compact label carries time and «da aggiornare»; tile offers «Rileva ora» and wraps', () => {
  const src = readFileSync(new URL('../../News2Chip.tsx', import.meta.url), 'utf8');
  const compact = src.split('const compactLabel =')[1]?.split('const title =')[0] ?? '';
  assert.match(compact, /news2When\(latest\.reading\.measuredAt\)/);
  assert.match(compact, /da aggiornare/);
  assert.match(compact, /NEWS2 non calcolabile/);
  assert.match(src, /Rileva ora/);
  assert.match(src, /useCan\('parameters\.create_reading'\)/);
  const css = readFileSync(new URL('../../News2.css', import.meta.url), 'utf8');
  assert.match(css, /\.vt--news2 \.vt__value--muted \{\s*white-space: normal;/);
});

test('agenda: note inline, status in words, operator name, month without «+N»', () => {
  const op = readFileSync(new URL('../../OperatorAgenda.tsx', import.meta.url), 'utf8');
  const admin = readFileSync(new URL('../../../admin/AdminAgenda.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(op, /apt\.note && isSelected/);
  assert.doesNotMatch(op, /agt-month-more/);
  assert.doesNotMatch(admin, /agt-month-more/);
  assert.doesNotMatch(op, /slice\(0, 2\)/);
  assert.doesNotMatch(admin, /slice\(0, 3\)/);
  assert.match(op, /<strong>\{STATO_LABEL\[a\.stato\]\}<\/strong>/);
  assert.match(admin, /operatorShortName\(op\)/);
  assert.match(admin, /agt-note-inline/);
});

test('topbar subtitle wraps (no single-line ellipsis); allergy names never collapse to a bare ⚠', () => {
  const app = readFileSync(new URL('../../../../App.css', import.meta.url), 'utf8');
  const rule = app.split('.topbar-title .page-header__subtitle {')[1]?.split('}')[0] ?? '';
  assert.match(rule, /white-space: normal/);
  assert.doesNotMatch(rule, /text-overflow: ellipsis/);
  const css = readFileSync(new URL('../../../../app-additions.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /\.patient-topbar-title__allergy \{\s*width: 32px;[^}]*font-size: 0/);
  assert.match(css, /\.patient-allergy-strip \{\s*display: flex;/);
  const detail = readFileSync(new URL('../../PatientDetail.tsx', import.meta.url), 'utf8');
  assert.match(detail, /className="patient-allergy-strip"/);
});
