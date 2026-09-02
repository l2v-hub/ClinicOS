import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sources = [
  readFileSync(new URL('../../components/operator/OperatorAgenda.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('../../components/admin/AdminAgenda.tsx', import.meta.url), 'utf8'),
];
const operatorAgenda = sources[0];
const therapySlot = readFileSync(
  new URL('../../components/shared/TherapySlotOverlay.tsx', import.meta.url),
  'utf8',
);
const agendaStyles = readFileSync(new URL('../../app-additions.css', import.meta.url), 'utf8');

test('operator and admin agendas expose the same accessible navigation contract', () => {
  for (const source of sources) {
    assert.match(source, /role="group" aria-label="Visualizzazione agenda"/);
    assert.match(source, /aria-pressed=\{view === v\}/);
    assert.match(source, /aria-label="Intervallo precedente"/);
    assert.match(source, /aria-label="Vai a oggi"/);
    assert.match(source, /aria-label="Intervallo successivo"/);
  }
});

test('daily agenda stays task-focused instead of rendering dashboard occupancy metrics', () => {
  assert.doesNotMatch(operatorAgenda, /agt-occ-strip|TOTAL_AVAIL_MIN|occLabel|occClass/);
  assert.doesNotMatch(operatorAgenda, /min su .* min disponibili|Sovraccarico/);
  assert.match(operatorAgenda, /view !== 'giornaliero' && <AgendaLegend \/>/);

  const adminAgenda = sources[1];
  assert.doesNotMatch(
    adminAgenda,
    /TOTAL_AVAIL_MIN|occInfo|agt-col-hdr__occ-row|agt-col-hdr__counts|agt-occ-track/,
  );
  assert.match(
    adminAgenda,
    /view !== 'giornaliero' \|\| loadingAppuntamenti \|\| appointmentLoadError/,
  );
  assert.match(adminAgenda, /aria-label="Filtra agenda per operatore"/);
  assert.match(
    adminAgenda,
    /<button[\s\S]*?className={`agt-col-hdr\$\{selected \? ' is-selected' : ''\}`}[\s\S]*?aria-pressed=\{selected\}/,
  );
  assert.match(adminAgenda, /Mostra solo l'agenda di/);
  assert.match(adminAgenda, /Mostra tutti gli operatori, ora è selezionato/);
  assert.match(adminAgenda, /function changeOperatorFilter[\s\S]*?setSelectedAptId\(null\)/);
  assert.match(adminAgenda, /const filtroOpIdEffettivo =[\s\S]*?attivi\.some/);
  assert.match(adminAgenda, /filtroOpIdEffettivo === 'tutti' \? undefined : filtroOpIdEffettivo/);
});

test('admin daily operator selectors are compact, keyboard-visible native buttons', () => {
  assert.match(
    agendaStyles,
    /\.agt-col-hdr\s*\{[\s\S]*?min-height:\s*48px;[\s\S]*?padding:\s*6px 10px;[\s\S]*?cursor:\s*pointer/,
  );
  assert.match(agendaStyles, /\.agt-col-hdr\.is-selected\s*\{/);
  assert.match(agendaStyles, /\.agt-col-hdr:focus-visible\s*\{/);
});

test('admin daily grid covers the working day with compact half-hour rows', () => {
  const adminAgenda = sources[1];
  assert.match(adminAgenda, /Array\.from\(\{ length: 25 \}/);
  assert.match(
    agendaStyles,
    /\.agt-admin-time\s*\{[\s\S]*?min-height:\s*22px;[\s\S]*?\.agt-admin-time\.hour\s*\{[\s\S]*?min-height:\s*22px/,
  );
  assert.match(
    agendaStyles,
    /\.agt-admin-cell\s*\{[\s\S]*?min-height:\s*22px;[\s\S]*?\.agt-admin-cell\.hour\s*\{[\s\S]*?min-height:\s*22px/,
  );
  assert.match(agendaStyles, /\.agt-admin-grid \.agt-therapy-slot\s*\{[\s\S]*?min-height:\s*44px/);
});

test('therapy work is one native action with a prominent non-repeated pending state', () => {
  assert.match(therapySlot, /<button[\s\S]*?className={`agt-therapy-slot/);
  assert.match(therapySlot, /aria-label={`\$\{slot\.label\}, ore \$\{slot\.ora\}/);
  assert.match(therapySlot, /agt-therapy-slot__status--pending/);
  assert.match(therapySlot, /\{pending\} da erogare/);
  assert.doesNotMatch(therapySlot, /agt-therapy-slot__count|agt-therapy-slot__progress/);
  assert.match(
    agendaStyles,
    /\.agt-therapy-slot__status--pending\s*\{[\s\S]*?color: #fff;[\s\S]*?background: #5b35c4/,
  );
  assert.match(agendaStyles, /\.agt-therapy-slot:focus-visible\s*\{/);
  assert.match(therapySlot, /<button[\s\S]*?className={`agt-week-therapy-dot/);
  assert.match(operatorAgenda, /aria-label=\{!slotApt \? `Crea appuntamento alle \$\{ora\}`/);
});

test('daily appointments use strong status surfaces and therapy cards reflow on phones', () => {
  assert.match(
    agendaStyles,
    /\.agt-apt-card--programmato\s*\{[\s\S]*?background: #e7efff;[\s\S]*?border-color: #b9ccf5/,
  );
  assert.match(
    agendaStyles,
    /@media \(max-width: 600px\)[\s\S]*?\.agt-therapy-slot\s*\{[\s\S]*?grid-template-columns: 32px minmax\(0, 1fr\)/,
  );
});
