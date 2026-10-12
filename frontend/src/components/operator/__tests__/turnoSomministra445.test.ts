// #445: Turno infermiere — un blocco per paziente e orario, un solo «Somministra N», allergie
// sempre visibili, ritardi in ore oltre i 90 minuti, scala glicemica mai registrata in blocco.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { durataUmana, type AdessoItem } from '../../../lib/adessoQueue';
import { allergyNames } from '../../../lib/useTurnoAllergies';
import { AdessoQueue, type TurnoAllergy } from '../AdessoQueue';

Object.assign(globalThis, { React });

const dose = (key: string, extra: Partial<AdessoItem> = {}): AdessoItem => ({
  key,
  kind: 'terapia-ritardo',
  patientId: 'P1',
  nome: 'Persona Sintetica',
  dettaglio: `Farmaco ${key} · 1 compressa · orale`,
  tempo: 'Non registrata da 12 ore',
  ora: '08:00',
  luogo: 'Posto letto non assegnato',
  inRitardo: true,
  urgenza: 720,
  landing: {
    tab: 'terapia-farmacologica',
    therapy: { date: '2026-10-12', fascia: 'mattina', therapyId: key },
  },
  dose: {
    therapyId: key,
    date: '2026-10-12',
    fascia: 'mattina',
    scheduledTime: '08:00',
    doseMode: 'fixed',
    farmaco: `Farmaco ${key}`,
    dose: '1 compressa',
    via: 'orale',
  },
  ...extra,
});

const render = (
  items: AdessoItem[],
  allergie?: Record<string, TurnoAllergy>,
  canAdminister = true,
) =>
  renderToStaticMarkup(
    React.createElement(AdessoQueue, {
      items,
      terapie: 'ready',
      consegne: 'ready',
      anomalie: 'ready',
      onSelectPaziente: () => {},
      onOpenTherapy: () => {},
      onOpenConsegne: () => {},
      allergie,
      canAdminister,
    }),
  );

test('445 delays read in minutes up to 90, then hours, then days', () => {
  assert.equal(durataUmana(10), '10 min');
  assert.equal(durataUmana(90), '90 min');
  assert.equal(durataUmana(91), '2 ore');
  assert.equal(durataUmana(719), '12 ore');
  assert.equal(durataUmana(60), '60 min');
  assert.equal(durataUmana(1440 + 30), '1 giorno');
  assert.equal(durataUmana(3 * 1440), '3 giorni');
});

test('445 doses of one patient in one band are one block with one «Somministra N»', () => {
  const html = render(
    [dose('a'), dose('b'), dose('c', { patientId: 'P2', nome: 'Altra Persona' })],
    {
      P1: { state: 'ready', allergeni: ['Penicillina', 'Lattice'] },
      P2: { state: 'ready', allergeni: [] },
    },
  );
  assert.equal((html.match(/>Somministra 2</g) ?? []).length, 1);
  assert.equal((html.match(/>Somministra</g) ?? []).length, 1);
  // l'orario fa da intestazione una volta per i due pazienti della stessa fascia
  assert.equal((html.match(/adesso-dose__time/g) ?? []).length, 1);
  assert.match(html, /<strong>08:00<\/strong> non registrata da 12 ore/);
  // nome e posto letto una volta per blocco, non per farmaco
  assert.equal((html.match(/Persona Sintetica<\/strong>/g) ?? []).length, 1);
  assert.match(html, /Allergie: Penicillina, Lattice/);
  assert.match(html, /Nessuna allergia registrata/);
  assert.doesNotMatch(html, /In ritardo di \d+ min/);
  assert.doesNotMatch(html, /Ordine operativo/);
});

test('445 glucose-scale doses are never counted in the bulk action', () => {
  const html = render([
    dose('a'),
    dose('g', { dose: { ...dose('g').dose!, doseMode: 'glucose_scale' } }),
  ]);
  assert.match(html, />Somministra</);
  assert.doesNotMatch(html, />Somministra 2</);
  const onlyGlucose = render([
    dose('g', { dose: { ...dose('g').dose!, doseMode: 'glucose_scale' } }),
  ]);
  assert.doesNotMatch(onlyGlucose, />Somministra/);
  assert.match(onlyGlucose, /Apri terapia/);
});

test('445 roles that do not administer see the block without the action; allergy states are explicit', () => {
  const html = render([dose('a')], { P1: { state: 'loading', allergeni: [] } }, false);
  assert.doesNotMatch(html, />Somministra/);
  assert.match(html, /Allergie in verifica/);
  assert.match(
    render([dose('a')], { P1: { state: 'error', allergeni: [] } }),
    /Allergie non disponibili/,
  );
});

test('445 allergy names fall back to the count, never to silence', () => {
  const base = {
    patientId: 'P1',
    statoRicovero: null,
    hasCriticalVitals: false,
    hasHighRisk: false,
    hasSevereAllergy: false,
    terapieTotali: 0,
    terapieCompletate: 0,
    consegneAperte: 0,
  };
  assert.deepEqual(allergyNames({ ...base, allergieCount: 0 }), []);
  assert.deepEqual(allergyNames({ ...base, allergieCount: 2 }), ['2 registrate']);
  assert.deepEqual(
    allergyNames({
      ...base,
      allergieCount: 1,
      allergeni: [{ allergene: 'Penicillina', gravita: 'grave' }],
    }),
    ['Penicillina'],
  );
});

test('445 the panel records through the giro endpoints with the slot key and explicit confirmation', () => {
  const panel = readFileSync(new URL('../TurnoDosePanel.tsx', import.meta.url), 'utf8');
  assert.match(panel, /recordAdministration\(/);
  assert.match(panel, /\{ confirmed: true \}/);
  assert.match(panel, /doseMode !== 'glucose_scale'/);
  assert.match(panel, /MOTIVI\.map/);
  // nessun farmaco/dose dal client: solo la chiave dello slot
  assert.doesNotMatch(panel, /farmacoNome|farmacoDose/);
});

test('445 QA: an allergy list cut at 10 names says how many are missing', () => {
  const names = Array.from({ length: 10 }, (_, i) => ({ allergene: `A${i}`, gravita: null }));
  assert.deepEqual(
    allergyNames({
      patientId: 'P1',
      statoRicovero: null,
      hasCriticalVitals: false,
      hasHighRisk: false,
      hasSevereAllergy: true,
      terapieTotali: 0,
      terapieCompletate: 0,
      consegneAperte: 0,
      allergieCount: 13,
      allergeni: names,
    }).at(-1),
    '+3 altre',
  );
});

test('445 QA: doses at different times of the same band are separate blocks with their own time', () => {
  const html = render([dose('a', { ora: '06:00' }), dose('b', { ora: '08:00' })]);
  assert.equal((html.match(/adesso-dose__block/g) ?? []).length, 2);
  assert.match(html, /<strong>06:00<\/strong>/);
  assert.match(html, /<strong>08:00<\/strong>/);
  assert.doesNotMatch(html, />Somministra 2</);
});

test('445 QA: every attempted dose stays «in verifica» until a read that started after it', () => {
  const queue = readFileSync(new URL('../AdessoQueue.tsx', import.meta.url), 'utf8');
  const panel = readFileSync(new URL('../TurnoDosePanel.tsx', import.meta.url), 'utf8');
  const hook = readFileSync(
    new URL('../cartella/useRiepilogoSomministrazioni.ts', import.meta.url),
    'utf8',
  );
  // il pannello segnala OGNI dose tentata, riuscita o no
  assert.match(panel, /onAttempted\(pending\.map\(\(d\) => d\.key\)\)/);
  // una dose fallita non si riprova dal pannello e non dice «non registrata» senza risposta
  assert.match(
    panel,
    /const attempted = \(key: string\) => recorded\.has\(key\) \|\| Boolean\(errors\[key\]\)/,
  );
  assert.match(panel, /esito incerto/);
  assert.match(
    panel,
    /if \(inFlight\.current \|\| pending\.length === 0 \|\| incomplete\) return;/,
  );
  assert.match(panel, /Esclusa: non viene registrata/);
  // la coda trattiene fino alla lettura successiva e tiene le scelte fuori dal pannello
  assert.match(queue, /revisioneLetta < hold\[it\.key\]/);
  assert.match(queue, /latestRevision\.current \+ 1/);
  assert.match(queue, /const ready = group\.items\.filter\(\(it\) => !held\(it\)\)/);
  assert.match(queue, /choices=\{choices\}/);
  // pannello aperto: si invia solo ciò che la coda viva dà ancora da fare (#445 QA 3)
  assert.match(panel, /included\.has\(d\.key\) && liveKeys\.has\(d\.key\) && !attempted\(d\.key\)/);
  assert.match(panel, /Stato cambiato nel frattempo: non viene registrata/);
  // la revisione letta è quella alla quale la lettura è PARTITA
  assert.match(hook, /readRevision: revision/);
});

test('445 QA: the urgency chip counts only what the reader can take charge of', async () => {
  const { buildTurnoChips } = await import('../../../lib/turnoChips');
  const base = {
    urgentState: 'ready' as const,
    critici: 0,
    clinicalState: 'ready' as const,
    anomalie: { pazienti: 0, farmaci: 0, fallito: false },
    onOpenUrgent: () => {},
    onOpenCritici: () => {},
    onRetryClinical: () => {},
    onOpenAnomalie: () => {},
  };
  // l'autore di tre urgenze non ha nulla da prendere in carico
  assert.deepEqual(buildTurnoChips({ ...base, urgentToTakeCharge: 0, urgentAtLeast: false }), []);
  // anteprima troncata: si dice che è un minimo
  assert.equal(
    buildTurnoChips({ ...base, urgentToTakeCharge: 5, urgentAtLeast: true })[0].label,
    'Almeno 5 urgenze da prendere in carico',
  );
  const dashboard = readFileSync(new URL('../OperatorDashboard.tsx', import.meta.url), 'utf8');
  assert.match(
    dashboard,
    // #446: dalla stessa coda del badge, solo le urgenze altrui
    /urgentToTakeCharge: urgentQueue\.state === 'ready' \? urgentQueue\.rows\.length : undefined/,
  );
});
