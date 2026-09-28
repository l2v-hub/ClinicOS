// Guardia del design system canonico (design-system.css): un solo aspetto per ogni tipo di controllo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../../', import.meta.url));
const read = (p: string) => readFileSync(join(SRC, p), 'utf8');
function walk(dir: string, ext: string): string[] {
  return readdirSync(join(SRC, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(rel, ext);
    return e.name.endsWith(ext) ? [rel] : [];
  });
}
/** Blocchi CSS più interni: [selettore, corpo] (le @media contengono blocchi interni). */
function blocks(css: string): [string, string][] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1].trim(), m[2]]);
}

const HMI_FILES = [
  'components/operator/PatientList.tsx',
  'components/operator/TherapyRoundsPage.tsx',
  'components/operator/TherapyGiroRows.tsx',
  'components/operator/ParameterEntryPanel.tsx',
  'components/operator/MultiPatientParametri.tsx',
  'components/operator/ConsegneWorkspace.tsx',
  'components/operator/ConsegneRounds.tsx',
  'components/operator/ConsegnaComposer.tsx',
  'components/operator/OperatorAgenda.tsx',
  'components/admin/AdminAgenda.tsx',
  'components/operator/cartella/PatientTherapyCalendar.tsx',
  'components/shared/NotesPage.tsx',
  'components/operator/cartella/RicercaFarmaco.tsx',
  'components/operator/AdessoQueue.tsx',
  'components/operator/TurnoAppointments.tsx',
  'components/operator/PatientDetail.tsx',
];
const LOCAL_CONTROLS =
  /\b(plist-chip|plist-btn|giro-chip|giro-btn|giro-icon-btn|nm-chip|nm-new-btn|nm-link|nm-icon-btn|ho-chip|ho-btn|ho-link|par-chip|par-next|par-save|par-link|agt-new-btn|turno-btn|chart-action|agt-nav-btn|agt-today-btn|ricerca-farmaco__apri)\b/;

test('HMI pages use only canonical controls, never page-local chip/button classes', () => {
  for (const file of HMI_FILES) {
    const match = read(file).match(LOCAL_CONTROLS);
    assert.equal(match, null, `${file} usa ancora ${match?.[0]}`);
  }
});

test('Terapia, Agenda (operatore e admin) and the therapy calendar share DateNav', () => {
  for (const file of [
    'components/operator/TherapyRoundsPage.tsx',
    'components/operator/OperatorAgenda.tsx',
    'components/admin/AdminAgenda.tsx',
    'components/operator/cartella/PatientTherapyCalendar.tsx',
  ])
    assert.match(read(file), /<DateNav/, file);
});

const VISUAL =
  /(^|;|\s)(height|min-height|border(-[a-z-]+)?|background(-color)?|color|font(-[a-z]+)?|padding(-[a-z]+)?)\s*:/;
const CANONICAL = /\.(ds-chip|ds-btn|ds-icon-btn|ds-link)(?![\w-])(?!__)/;

test('only design-system.css decides how a canonical control looks', () => {
  const offenders: string[] = [];
  for (const file of walk('.', '.css')) {
    if (file.endsWith('design-system.css')) continue;
    for (const [selector, body] of blocks(read(file)))
      if (CANONICAL.test(selector) && VISUAL.test(body)) offenders.push(`${file}: ${selector}`);
  }
  assert.deepEqual(offenders, []);
});

test('legacy control classes are aliased to the canonical look and cannot be forced back', () => {
  const ds = read('design-system.css');
  for (const alias of [
    'filter-chip',
    'agt-filter-chip',
    'agt-view-btn',
    'btn-primary',
    'btn-success',
    'btn-secondary',
    'icon-btn',
    'btn-ghost',
    'btn-ghost-outline',
  ])
    assert.match(ds, new RegExp(`\\.${alias}[,)]`), alias);
  assert.match(ds, /:not\(#ds\)/);
  const forced: string[] = [];
  for (const file of walk('.', '.css'))
    for (const [selector, body] of blocks(read(file)))
      if (
        /\.(filter-chip|agt-filter-chip|agt-view-btn|btn-primary|btn-success|btn-secondary|btn-sm|icon-btn|ds-[a-z-]+)\b/.test(
          selector,
        ) &&
        /!important/.test(body)
      )
        forced.push(`${file}: ${selector}`);
  assert.deepEqual(forced, []);
});

test('design-system.css is the last stylesheet loaded by the app shell', () => {
  const app = read('App.tsx');
  const appCss = app.indexOf("import './App.css';");
  const ds = app.indexOf("import './design-system.css';");
  assert.ok(appCss >= 0 && ds > appCss);
});

/** Tag di apertura dei <button> (gestisce le arrow function dentro le graffe). */
function openingButtons(source: string): string[] {
  const out: string[] = [];
  let i = source.indexOf('<button');
  while (i >= 0) {
    let depth = 0;
    let j = i;
    for (; j < source.length; j++) {
      const c = source[j];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) break;
    }
    out.push(source.slice(i, j + 1));
    i = source.indexOf('<button', j);
  }
  return out;
}

test('every chip declares its state to assistive technology', () => {
  const missing: string[] = [];
  for (const file of walk('.', '.tsx'))
    for (const tag of openingButtons(read(file)))
      if (
        /className=\{?["`'][^"`']*\b(ds-chip|filter-chip|agt-filter-chip|agt-view-btn)\b/.test(
          tag,
        ) &&
        !/aria-(pressed|selected|expanded|haspopup|current)=/.test(tag)
      )
        missing.push(`${file}: ${tag.slice(0, 90).replace(/\s+/g, ' ')}`);
  assert.deepEqual(missing, []);
});

test('retired control classes are gone from the markup', () => {
  const found: string[] = [];
  for (const file of walk('.', '.tsx'))
    if (/\b(srev-chip|schedule-op-btn)\b/.test(read(file))) found.push(file);
  assert.deepEqual(found, []);
});

// Controlli che avevano una forma propria: ora sono canonici. La vecchia classe resta solo come
// aggancio (test, evidenze), nessun foglio di pagina può ridarle un aspetto.
const RETIRED_LOOKS = [
  'news2-chip',
  'farmaco-non-trovato',
  'clinical-card__toggle',
  'patient-roster__open',
  'patient-roster__delete',
  'patient-card__delete',
];

test('retired own-shaped controls get their look only from the design system', () => {
  const offenders: string[] = [];
  const hook = new RegExp(`\\.(${RETIRED_LOOKS.join('|')})(?![\\w-])`);
  for (const file of walk('.', '.css')) {
    if (file.endsWith('design-system.css')) continue;
    for (const [selector, body] of blocks(read(file))) {
      // la freccia del toggle ruota (svg interno): è contenuto, non l'aspetto del controllo
      if (/clinical-card__toggle svg/.test(selector) && !VISUAL.test(body)) continue;
      if (hook.test(selector) && VISUAL.test(body)) offenders.push(`${file}: ${selector}`);
    }
  }
  assert.deepEqual(offenders, []);
  const markup: [string, RegExp][] = [
    ['components/operator/News2Chip.tsx', /className=\{`news2-chip \$\{badgeClass\(/],
    [
      'components/operator/cartella/TerapiaFarmacologicaTab.tsx',
      /"ds-badge ds-badge--warning farmaco-non-trovato"/,
    ],
    ['components/shared/ClinicalCard.tsx', /"ds-icon-btn clinical-card__toggle"/],
    ['components/operator/PatientRoster.tsx', /"ds-icon-btn patient-roster__open"/],
    [
      'components/operator/PatientRoster.tsx',
      /"ds-icon-btn ds-icon-btn--danger patient-roster__delete"/,
    ],
    ['components/operator/PatientRoster.tsx', /"ds-btn ds-btn--danger patient-card__delete"/],
  ];
  for (const [file, re] of markup) assert.match(read(file), re, file);
});

test('the assistant opens from the sidebar and its controls are canonical (HMI 1)', () => {
  // nessun pulsante flottante: si apre dalla voce "Assistente" della sidebar
  for (const file of ['App.tsx', 'components/shared/AgnosPanel.tsx'])
    assert.doesNotMatch(read(file), /className="ai-fab"/, file);
  const offenders: string[] = [];
  for (const file of walk('.', '.css')) {
    if (file.endsWith('design-system.css')) continue;
    for (const [selector, body] of blocks(read(file)))
      if (/\.(ai-fab|agnos-tts|agnos-mic)(?![\w-])/.test(selector) && VISUAL.test(body))
        offenders.push(`${file}: ${selector}`);
  }
  assert.deepEqual(offenders, []);
  assert.match(read('components/shared/TeamsLikeSidebar.tsx'), /aria-expanded=\{assistantOpen\}/);
  const composer = read('components/shared/agnos/AgnosComposer.tsx');
  assert.match(
    composer,
    /className=\{`ds-icon-btn agnos-mic\$\{voice\.listening \? ' ds-icon-btn--recording' : ''\}`\}/,
  );
  assert.match(composer, /placeholder=\{[^}]*'Chiedi o detta'\}/);
  // premuto e registrazione sono stati del design system
  const ds = read('design-system.css');
  assert.match(ds, /\[aria-pressed='true'\]:not\(#ds\)/);
  assert.match(ds, /\.ds-icon-btn\.ds-icon-btn--recording:not\(#ds\)/);
});

test('the status badge is styled only by the design system', () => {
  const offenders: string[] = [];
  for (const file of walk('.', '.css')) {
    if (file.endsWith('design-system.css')) continue;
    for (const [selector, body] of blocks(read(file)))
      // anche i toni (--ok…) e il testo (__text): nessuna pagina li ridisegna
      if (/\.ds-badge(?![\w])/.test(selector) && VISUAL.test(body))
        offenders.push(`${file}: ${selector}`);
  }
  assert.deepEqual(offenders, []);
  assert.match(read('design-system.css'), /\.ds-badge:not\(#ds\)/);
});

test('canonical controls carry no inline visual style (only layout: margin, flex, gap)', () => {
  const found: string[] = [];
  for (const file of walk('.', '.tsx'))
    for (const tag of openingButtons(read(file)))
      if (
        /className=\{?["`'][^"`']*\b(ds-(chip|btn|icon-btn|link)|filter-chip|btn-(primary|secondary|success|ghost|sm|danger)|icon-btn)\b/.test(
          tag,
        ) &&
        /style=\{\{[^}]*\b(height|minHeight|minWidth|width|padding\w*|fontSize|fontWeight|color|background\w*|border\w*)\s*:/.test(
          tag,
        )
      )
        found.push(`${file}: ${tag.slice(0, 90).replace(/\s+/g, ' ')}`);
  assert.deepEqual(found, []);
});
