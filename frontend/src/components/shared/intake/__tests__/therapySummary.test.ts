import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntakeTherapySummary } from '../IntakeTherapySummary';
import { StepVerifica } from '../StepVerifica';
import { buildIntakeTherapyReview } from '../intakeTherapies';
import { emptyTherapyForm } from '../../../operator/cartella/TherapyFormFields';
import type { DischargeTherapyRow } from '../dischargeTherapy';
import type { TherapyCorrectionTarget } from '../intakeTherapyNavigation';

Object.assign(globalThis, { React });

const form = () => ({
  ...emptyTherapyForm(),
  farmacoNome: 'Farmaco sintetico',
  commercialStrengthValue: '2,5',
  commercialStrengthUnit: 'mg',
  pharmaceuticalForm: 'compressa',
  viaSomministrazione: 'orale',
  dataInizio: '',
  note: 'Istruzione sintetica completa',
  schedules: [
    {
      time: '08:00',
      quantityNumerator: 1,
      quantityDenominator: 2,
      administrationUnit: 'compressa',
    },
    { time: '25:10', quantityNumerator: 2, quantityDenominator: 0, administrationUnit: '' },
  ],
});
function descendants(node: unknown): ReactElement<Record<string, any>>[] {
  if (Array.isArray(node)) return node.flatMap(descendants);
  if (!node || typeof node !== 'object' || !('props' in node)) return [];
  const element = node as ReactElement<Record<string, any>>;
  return [element, ...descendants(element.props.children)];
}
function fieldMarkup(html: string, field: string, schedule?: number) {
  return (
    (html.match(/<dl\b[\s\S]*?<\/dl>/g) ?? []).find(
      (part) =>
        part.includes(`data-summary-field="${field}"`) &&
        (schedule === undefined || part.includes(`data-summary-schedule="${schedule}"`)),
    ) ?? ''
  );
}
const render = (data: Record<string, unknown>, busy = false) =>
  renderToStaticMarkup(
    createElement(StepVerifica, {
      data,
      busy,
      error: null,
      onConfirm() {},
      onUpdateSection() {},
      onReviewTherapies() {},
      showAcceptance: false,
      showCreate: false,
    }),
  );

test('summary displays exact invalid values beside the corresponding field errors without changing the draft', () => {
  const data = { terapia: [form()] };
  const original = structuredClone(data);
  const html = render(data);
  assert.match(fieldMarkup(html, 'commercialStrengthValue'), /2,5/);
  assert.doesNotMatch(html, /NaN/);
  assert.match(fieldMarkup(html, 'time', 1), /25:10[\s\S]*Orario 2: indica un/);
  assert.match(fieldMarkup(html, 'quantity', 1), /2 \/ 0[\s\S]*quantità valida/);
  assert.match(fieldMarkup(html, 'administrationUnit', 1), /Non indicato[\s\S]*scegli l’unità/);
  assert.match(fieldMarkup(html, 'dataInizio'), /Non indicato[\s\S]*data di inizio valida/);
  assert.doesNotMatch(fieldMarkup(html, 'time', 0), /is-invalid/);
  assert.match(html, /orale/);
  assert.match(html, /Istruzione sintetica completa/);
  assert.deepEqual(data, original);
});

test('each error opens the original source field and schedule after excluded imports', () => {
  const excluded: DischargeTherapyRow = {
    farmacoNome: 'Bozza esclusa',
    forma: '',
    dosaggio: '',
    viaSomministrazione: '',
    quantita: '',
    orari: [],
    giorni: [],
    dataInizio: '',
    classe: '',
    note: '',
    originalText: 'Fonte esclusa',
    stato: 'da_verificare',
    excludedFromConfirm: true,
  };
  const data = { terapiaImport: [excluded], terapia: [form()] };
  const therapy = buildIntakeTherapyReview(data)[1];
  let selected: TherapyCorrectionTarget | undefined;
  const nodes = descendants(
    IntakeTherapySummary({
      therapy,
      busy: false,
      onCorrect(target) {
        selected = target;
      },
    }),
  );
  const button = nodes.find(
    (node) =>
      node.type === 'button' &&
      node.props['aria-label'] === 'Correggi Ora 2 della terapia 2: Farmaco sintetico',
  );
  assert.ok(button);
  button.props.onClick();
  assert.equal(selected?.type, 'manual');
  assert.equal(selected?.index, 0);
  assert.equal(selected?.field, 'time');
  assert.equal(selected?.scheduleIndex, 1);
  const html = render(data, true);
  assert.doesNotMatch(html, /data-testid="intake-therapy-1"/);
  assert.match(html, /Bozza esclusa/);
  assert.ok(
    descendants(IntakeTherapySummary({ therapy, busy: true, onCorrect() {} }))
      .filter((node) => node.type === 'button')
      .every((node) => node.props.disabled),
  );
});

test('import source and reviewed values remain separate and malicious text is escaped', () => {
  const reviewed = { ...form(), commercialStrengthValue: '5', dataInizio: '2026-10-06' };
  const row: DischargeTherapyRow = {
    farmacoNome: 'Nome estratto',
    forma: '',
    dosaggio: '20 mg/ml',
    viaSomministrazione: 'OS',
    quantita: 'testo ambiguo',
    orari: [],
    giorni: [],
    dataInizio: '',
    classe: '',
    note: '',
    originalText: '<script>malicious()</script>\nTesto estratto integrale',
    stato: 'da_verificare',
    reviewedTherapy: reviewed,
  };
  const html = render({ terapiaImport: [row] });
  assert.match(html, /Farmaco sintetico/);
  assert.match(fieldMarkup(html, 'commercialStrengthValue'), />5</);
  assert.match(
    fieldMarkup(html, 'sourceReview'),
    /&lt;script&gt;[\s\S]*Testo estratto integrale[\s\S]*confrontandoli/,
  );
  assert.doesNotMatch(html, /<script>/);
});

test('one-time therapies show the actual invalid date and time instead of recurring schedules', () => {
  const once = {
    ...form(),
    commercialStrengthValue: '5',
    tipo: 'una_tantum' as const,
    dataSomministrazione: 'data errata',
    orarioSomministrazione: '29:00',
  };
  const html = render({ terapia: [once] });
  assert.match(fieldMarkup(html, 'dataSomministrazione'), /data errata[\s\S]*Indica data e orario/);
  assert.match(fieldMarkup(html, 'orarioSomministrazione'), /29:00[\s\S]*Indica data e orario/);
  assert.doesNotMatch(html, /data-summary-field="time"/);
});
