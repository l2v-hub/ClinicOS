import assert from 'node:assert/strict';
import { test } from 'node:test';
import React, { createElement, isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  emptyTherapyForm,
  TherapyFormFields,
  type TherapyFormValue,
} from '../../../operator/cartella/TherapyFormFields';
import { applyTherapyFormChange } from '../../../operator/cartella/therapyFormChange';
import { therapyFormToDischargeRow } from '../dischargeTherapy';
import {
  buildIntakeTherapyReview,
  therapyInputDiagnostics,
  therapyInputIssues,
} from '../intakeTherapies';
import { therapyFormToInput } from '../therapyFormPayload';
import { StepClinica } from '../StepClinica';
import { StepVerifica } from '../StepVerifica';
import type { TherapyCorrectionTarget } from '../intakeTherapyNavigation';
import type { TherapyFieldIssue } from '../../../operator/cartella/therapyFieldFeedback';

Object.assign(globalThis, { React });

function completeForm(): TherapyFormValue {
  return {
    ...emptyTherapyForm(),
    farmacoNome: 'Farmaco sintetico',
    dataInizio: '2026-09-23',
    commercialStrengthValue: '25',
    giorniSettimana: [1, 3, 5],
    schedules: ['08:00', '16:00'].map((time) => ({
      time,
      quantityNumerator: 1,
      quantityDenominator: 1,
      administrationUnit: 'compressa',
    })),
  };
}

function imported(form = completeForm(), flagged = false) {
  return therapyFormToDischargeRow(form, {
    farmacoNome: form.farmacoNome,
    forma: 'CPR',
    dosaggio: '25 MG',
    quantita: '1 Cpr',
    orari: ['08:00', '16:00'],
    giorni: ['Lun', 'Mer', 'Ven'],
    dataInizio: form.dataInizio,
    viaSomministrazione: 'OS',
    classe: '',
    note: '',
    originalText: 'Documento sintetico',
    stato: flagged ? 'da_verificare' : 'ok',
  });
}

function formMarkup(form: TherapyFormValue) {
  const issues = therapyInputDiagnostics(therapyFormToInput(form));
  return renderToStaticMarkup(
    createElement(TherapyFormFields, { value: form, onChange() {}, issues }),
  );
}

function controlTag(markup: string, field: TherapyFieldIssue['field'], scheduleIndex?: number) {
  return (markup.match(/<(?:input|select|button|div)\b[^>]*>/g) ?? []).find(
    (tag) =>
      tag.includes(`data-therapy-field="${field}"`) &&
      (scheduleIndex === undefined || tag.includes(`data-therapy-schedule="${scheduleIndex}"`)),
  );
}

function assertInlineError(
  markup: string,
  field: TherapyFieldIssue['field'],
  scheduleIndex?: number,
) {
  const tag = controlTag(markup, field, scheduleIndex);
  assert.ok(tag, `editable target exists for ${field}/${scheduleIndex ?? ''}`);
  assert.match(tag, /aria-invalid="true"/);
  const description = /aria-describedby="([^"]+)"/.exec(tag)?.[1];
  assert.ok(description);
  assert.ok(markup.includes(`<p id="${description}" class="therapy-form__error">`));
  return description;
}

type ElementProps = {
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};
function buttons(node: ReactNode): Array<React.ReactElement<ElementProps>> {
  if (Array.isArray(node)) return node.flatMap(buttons);
  if (!isValidElement<ElementProps>(node)) return [];
  return [...(node.type === 'button' ? [node] : []), ...buttons(node.props.children)];
}
function textOf(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<ElementProps>(node)) return textOf(node.props.children);
  return typeof node === 'string' || typeof node === 'number' ? String(node) : '';
}
function verification(
  data: Record<string, unknown>,
  onReviewTherapies: (target?: TherapyCorrectionTarget) => void,
  busy = false,
) {
  return StepVerifica({
    data: {
      anagrafica: { firstName: 'Persona', lastName: 'Sintetica' },
      _accepted: { demographics: true, therapy: true },
      ...data,
    },
    busy,
    error: null,
    onConfirm() {},
    onUpdateSection() {},
    onReviewTherapies,
  });
}

test('diagnostics address original source indices despite excluded imports and multiple schedules', () => {
  const bad = completeForm();
  bad.schedules[1] = { ...bad.schedules[0] };
  const review = buildIntakeTherapyReview({
    terapiaImport: [{ ...imported(), excludedFromConfirm: true }, imported(bad)],
    terapia: [completeForm(), bad],
  });
  assert.deepEqual(review[1].diagnostics, [
    {
      type: 'import',
      index: 1,
      field: 'time',
      scheduleIndex: 1,
      message: 'Orario 2: elimina l’orario duplicato',
    },
  ]);
  assert.deepEqual(review[3].diagnostics, [
    { ...review[1].diagnostics[0], type: 'manual', index: 1 },
  ]);
  assert.deepEqual(review[3].input.intakeSource, { type: 'manual', index: 1 });
  assert.equal(review[3].index, 4);
});

test('invalid drug, dates, route, strength, weekdays and each dose field have described inline errors', () => {
  const bad = {
    ...completeForm(),
    farmacoNome: '',
    dataInizio: '',
    dataFine: '2026-02-30',
    viaSomministrazione: '',
    commercialStrengthValue: '-1',
    commercialStrengthUnit: '',
    giorniSettimana: [9],
    schedules: [
      { time: '25:99', quantityNumerator: 0, quantityDenominator: 1, administrationUnit: '' },
    ],
  };
  const markup = formMarkup(bad);
  const issues = therapyInputDiagnostics(therapyFormToInput(bad));
  const ids = issues.map(({ field, scheduleIndex }) =>
    assertInlineError(markup, field, scheduleIndex),
  );
  assert.equal(new Set(ids).size, issues.length, 'each field has its own description');
  assert.deepEqual(therapyInputIssues(therapyFormToInput(bad)), [
    ...new Set(issues.map((issue) => issue.message)),
  ]);
});

test('a duplicate or invalid second time marks only that time and preserves the other schedule', () => {
  for (const time of ['08:00', '', '24:00']) {
    const form = completeForm();
    form.schedules[1].time = time;
    const markup = formMarkup(form);
    assertInlineError(markup, 'time', 1);
    assert.doesNotMatch(controlTag(markup, 'time', 0)!, /aria-invalid/);
    assert.doesNotMatch(controlTag(markup, 'quantity', 1)!, /aria-invalid/);
    assert.equal(form.schedules[0].time, '08:00');
  }
});

test('empty schedules and divided patches expose the correct correction controls', () => {
  assertInlineError(formMarkup({ ...completeForm(), schedules: [] }), 'schedules');
  const patch = completeForm();
  patch.schedules[1] = {
    ...patch.schedules[1],
    administrationUnit: 'cerotto',
    quantityDenominator: 2,
  };
  assertInlineError(formMarkup(patch), 'quantity', 1);
});

test('PRN ignores periodic schedules and residual invalid end date/weekdays remain reachable after a type change', () => {
  const form = completeForm();
  form.schedules[1].time = '';
  const prn = applyTherapyFormChange(form, { tipo: 'al_bisogno' });
  assert.deepEqual(therapyInputDiagnostics(therapyFormToInput(prn)), []);
  assert.equal(controlTag(formMarkup(prn), 'time', 1), undefined);
  const residual = { ...prn, dataFine: '2020-01-01', giorniSettimana: [9] };
  const markup = formMarkup(residual);
  assertInlineError(markup, 'dataFine');
  assertInlineError(markup, 'giorniSettimana');
});

test('one-off data and time blockers identify separate editable fields', () => {
  const form = {
    ...completeForm(),
    tipo: 'una_tantum' as const,
    dataSomministrazione: '',
    orarioSomministrazione: '',
  };
  assert.deepEqual(
    therapyInputDiagnostics(therapyFormToInput(form)).map((issue) => issue.field),
    ['dataSomministrazione', 'orarioSomministrazione'],
  );
  const markup = formMarkup(form);
  assertInlineError(markup, 'dataSomministrazione');
  assertInlineError(markup, 'orarioSomministrazione');
  assert.equal(controlTag(markup, 'time', 0), undefined);
});

test('summary correction opens the exact manual row through the section registry, even after excluded imports', () => {
  const bad = completeForm();
  bad.schedules[1].time = '08:00';
  const data = {
    terapiaImport: [{ ...imported(), excludedFromConfirm: true }, imported()],
    terapia: [completeForm(), bad],
  };
  let target: TherapyCorrectionTarget | undefined;
  const tree = verification(data, (next) => {
    target = next;
  });
  const action = buttons(tree).find(
    (button) => textOf(button.props.children) === 'Terapia 4: Orario 2: elimina l’orario duplicato',
  );
  assert.ok(action?.props.onClick);
  action.props.onClick();
  assert.deepEqual(target, {
    type: 'manual',
    index: 1,
    field: 'time',
    scheduleIndex: 1,
    message: 'Orario 2: elimina l’orario duplicato',
  });
  const markup = renderToStaticMarkup(
    createElement(StepClinica, { data, onUpdateSection() {}, therapyCorrection: target }),
  );
  const manualRows = (markup.match(/<article\b[^>]*>[\s\S]*?<\/article>/g) ?? []).filter(
    (article) => article.includes('data-therapy-source="manual"'),
  );
  assert.equal(manualRows.length, 2);
  assert.match(manualRows[0], /aria-expanded="false"/);
  assert.match(manualRows[1], /data-therapy-index="1"/);
  assert.match(manualRows[1], /aria-expanded="true"/);
  assertInlineError(manualRows[1], 'time', 1);
});

test('summary imported source-review action targets the original row and time edits never acknowledge OCR', () => {
  const form = completeForm();
  const original = imported(form, true);
  form.schedules[1].time = '20:00';
  const edited = therapyFormToDischargeRow(form, original);
  const data = { terapiaImport: [{ ...imported(), excludedFromConfirm: true }, edited] };
  const before = JSON.stringify(data);
  let target: TherapyCorrectionTarget | undefined;
  const tree = verification(data, (next) => {
    target = next;
  });
  const action = buttons(tree).find((button) =>
    textOf(button.props.children).includes('Terapia 2: Verifica i dati estratti'),
  );
  assert.ok(action?.props.onClick);
  action.props.onClick();
  assert.equal(target?.type, 'import');
  assert.equal(target?.index, 1);
  assert.equal(target?.field, 'sourceReview');
  const markup = renderToStaticMarkup(createElement(StepClinica, { data, onUpdateSection() {} }));
  assertInlineError(markup, 'sourceReview');
  assert.match(markup, /Ho verificato questa terapia/);
  assert.equal(JSON.stringify(data), before, 'navigation and rendering never mutate clinical data');
  assert.equal(edited.stato, 'da_verificare');
  assert.deepEqual(buildIntakeTherapyReview(data)[1].times, ['08:00', '20:00']);
});

test('excluded blockers are absent from correction actions and busy disables remaining actions', () => {
  const bad = { ...completeForm(), dataInizio: '' };
  const data = {
    terapiaImport: [{ ...imported(bad, true), excludedFromConfirm: true }],
    terapia: [bad],
  };
  const actions = buttons(verification(data, () => {}, true)).filter(
    (button) => button.props.className === 'therapy-correction-link',
  );
  assert.equal(actions.length, 1);
  assert.equal(textOf(actions[0].props.children), 'Terapia 2: Indica una data di inizio valida');
  assert.equal(actions[0].props.disabled, true);
});
