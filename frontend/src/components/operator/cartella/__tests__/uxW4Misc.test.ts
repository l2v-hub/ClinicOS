// UX direct-access W4 (+ UX2 W8 urgency model «Ho capito»), capability-gated diary actions, NEWS2
// compact text / «Rileva ora», agenda info without taps. Static render (no DOM), real components.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DiarioPazienteTab } from '../DiarioPazienteTab';
import { countToSee, needsMyAck } from '../diaryAck';
import { urgencyTime, urgencyTraceText } from '../../../../lib/urgency';
import { writeSessionCache } from '../../../../lib/sessionCache';
import { diaryCacheKey, type DiarySnapshot } from '../../../../lib/patientTabSnapshots';
import { setSessionCapabilities } from '../../../../lib/capabilities';
import type {
  CapabilityMap,
  DiarioPazienteEntry,
  UrgencyTakenBy,
  UrgencyView,
} from '../../../../types';
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

const active = (over: Partial<UrgencyView> = {}): UrgencyView => ({
  state: 'active',
  takenBy: null,
  isAuthor: false,
  canAcknowledge: true,
  ...over,
});
const taken = (over: Partial<UrgencyTakenBy> = {}): UrgencyView => ({
  state: 'taken',
  takenBy: {
    operatorName: 'Medico 1',
    operatorRole: 'medico',
    acknowledgedAt: '2026-10-03T06:12:00.000Z',
    byMe: false,
    ...over,
  },
  isAuthor: false,
  canAcknowledge: false,
});

test('UX2 W8 needsMyAck / countToSee: only ACTIVE urgencies that this reader (not the author) can take', () => {
  const open = entry({ urgency: active() });
  const mine = entry({ id: 'e2', urgency: active({ isAuthor: true, canAcknowledge: false }) });
  const done = entry({ id: 'e3', urgency: taken() });
  const normal = entry({
    id: 'e4',
    priority: 'normale',
    urgency: { state: 'none', takenBy: null, isAuthor: false, canAcknowledge: false },
  });
  const legacy = entry({ id: 'e5' }); // no urgency (legacy Cartella rows)
  assert.equal(needsMyAck(open), true);
  assert.equal(needsMyAck(mine), false, 'the author never takes charge of their own urgency');
  assert.equal(needsMyAck(done), false);
  assert.equal(needsMyAck(normal), false);
  assert.equal(needsMyAck(legacy), false);
  assert.equal(countToSee([open, mine, done, normal, legacy]), 1);
});

test('UX2 W8 trace: «Urgenza presa in carico da X (ruolo) alle hh:mm», older days carry the date', () => {
  assert.equal(
    urgencyTraceText(taken(), NOW),
    'Letta e compresa da Medico 1 (medico) alle 08:12 · priorità originale: urgente',
  );
  assert.equal(
    urgencyTraceText(taken({ byMe: true }), NOW),
    'Letta e compresa da Medico 1 (medico) alle 08:12 · priorità originale: urgente',
  );
  assert.equal(
    urgencyTraceText({ state: 'taken', takenBy: null, isAuthor: false, canAcknowledge: false }),
    'Urgenza storica · conferma di lettura non disponibile',
  );
  assert.equal(urgencyTraceText(active(), NOW), 'Urgente');
  assert.match(
    urgencyTraceText(active({ isAuthor: true, canAcknowledge: false }), NOW) ?? '',
    /in attesa che un collega confermi la lettura/,
  );
  assert.equal(urgencyTime('2026-10-02T19:05:00.000Z', NOW), '02/10 21:05');
});

test('UX2 W8 diary card: «Ho capito» only for a non-author on an active urgency; then only the trace', () => {
  setSessionCapabilities(null);
  const html = renderDiary(
    [
      entry({ id: 'u1', urgency: active() }),
      entry({ id: 'u2', urgency: active({ isAuthor: true, canAcknowledge: false }) }),
      entry({ id: 'u3', urgency: taken() }),
      entry({
        id: 'n1',
        priority: 'normale',
        urgency: { state: 'none', takenBy: null, isAuthor: false, canAcknowledge: false },
      }),
    ],
    'p-ack',
  );
  assert.equal(html.match(/>Ho capito</g)?.length, 1, 'one button: the non-author active urgency');
  assert.match(html, /1 urgenza da prendere in carico/);
  // Lo storico mostra anche il giorno quando la fixture non è più di oggi.
  assert.match(html, /Letta e compresa da Medico 1 \(medico\) alle (?:\d{2}\/\d{2} )?\d{2}:\d{2}/);
  assert.match(html, /in attesa che un collega confermi la lettura/);
  // No open/closed concept and no per-reader «Visto da» list.
  assert.doesNotMatch(html, /Presa visione|Visto da|Da vedere|>Aperta<|>Completata</);
  assert.match(html, /class="[^"]*diario-card--to-see[^"]*"[^>]*data-entry-id="u1"/);
  assert.doesNotMatch(html, /class="[^"]*diario-card--to-see[^"]*"[^>]*data-entry-id="u3"/);
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
  const overview = readFileSync(new URL('../../VitalsOverview.tsx', import.meta.url), 'utf8');
  assert.match(overview, /useCan\('parameters\.create_reading'\)/);
  assert.match(overview, /Rileva ora/);
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
