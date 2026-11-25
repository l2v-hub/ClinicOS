import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StayStatusCard } from '../cartella/StayStatusCard';

// Regressione: la finestra «Camera e Assegnazione» conteneva l'unico campo «Stato ricovero» ma
// nessun punto della cartella la apriva, e il tab «Dimissione» non scriveva lo stato: un paziente
// non poteva essere dimesso dall'interfaccia.

const detail = readFileSync(new URL('../PatientDetail.tsx', import.meta.url), 'utf8');
const tab = readFileSync(new URL('../cartella/DimissioneTab.tsx', import.meta.url), 'utf8');

test('the room/stay dialog is reachable from the chart header', () => {
  assert.match(detail, /setCardModal\('camera'\)/);
  assert.match(detail, /cardModal === 'camera' && renderCameraModal\(\)/);
  // L'ingresso è un pulsante vero nell'intestazione, non un testo.
  assert.match(detail, /<button[^>]*\bonClick=\{openStayDialog\}[^>]*\bdata-stay-open\b/s);
});

test('the Dimissione tab receives the discharge and readmit actions from the chart', () => {
  assert.match(detail, /<DimissioneTab[^]*?onDischarge=\{[^]*?onReadmit=\{/);
  assert.match(tab, /<StayStatusCard[^]*?onDischarge=\{onDischarge\}[^]*?onReadmit=\{onReadmit\}/);
});

test('tab and dialog share one confirmation and one save path', () => {
  assert.equal(detail.match(/<ConfirmDialog\b/g)?.length, 1);
  // La conferma salva solo attraverso saveStay (dimissione) o updConEsito (annullamento).
  assert.match(detail, /await saveStay\(\{ statoRicovero: 'dimesso' \}, ''\)/);
  assert.match(detail, /await updConEsito\(\{ statoRicovero: 'ricoverato' \}\)/);
  // La finestra non salva «Dimesso» senza passare dalla conferma.
  assert.match(
    detail,
    /needsDischargeConfirmation\(cartella\.statoRicovero, cameraModalForm\.statoRicovero\)\s*\) \{\s*setStayConfirm\('dimetti'\);\s*return;/,
  );
});

test('no other editor writes the stay status behind the confirmation', () => {
  // Il profilo copiava stato, camera, letto e reparto all'apertura e li riscriveva al salvataggio:
  // con la dimissione ora raggiungibile, un profilo rimasto aperto l'avrebbe annullata in silenzio.
  const start = detail.indexOf('function openProfileEditor');
  const snapshot = detail.slice(start, detail.indexOf('setProfiloPhoneError(null)', start));
  assert.ok(start > 0 && snapshot.length > 0);
  for (const field of ['statoRicovero', 'cameraNumero', 'lettoNumero', 'repartoRicovero'])
    assert.doesNotMatch(snapshot, new RegExp(`^\\s*${field}:`, 'm'), field);
  // Gli unici punti che scrivono lo stato del ricovero sono il salvataggio unico e l'annullamento.
  const writers = detail.match(
    /statoRicovero: '(?:dimesso|ricoverato|ambulatoriale|day_hospital)'/g,
  );
  assert.deepEqual(writers, ["statoRicovero: 'dimesso'", "statoRicovero: 'ricoverato'"]);
});

test('reassigning a bed reopens an assignment that was closed today', () => {
  const app = readFileSync(new URL('../../../App.tsx', import.meta.url), 'utf8');
  assert.match(app, /const closedToday = active\?\.endDate === today;/);
  assert.match(app, /active\.bedId === bed\.id && !closedToday/);
  assert.match(app, /\{ bedId: bed\.id, \.\.\.\(closedToday \? \{ endDate: null \} : \{\}\) \}/);
  // La chiusura del letto che non riesce ferma chi chiama (la dimissione non cambia lo stato).
  assert.match(app, /if \(!closeRes\.ok\) \{[^}]*return \{ ok: false \};/s);
});

test('a non-discharged patient is offered «Dimetti paziente»', () => {
  const html = renderToStaticMarkup(
    createElement(StayStatusCard, {
      statoRicovero: 'ricoverato',
      onDischarge: () => {},
      onReadmit: () => {},
    }),
  );
  assert.match(html, /Stato del ricovero/);
  assert.match(html, /Ricoverato/);
  assert.match(html, /<button[^>]*data-stay-action="dimetti"[^>]*>Dimetti paziente<\/button>/);
  assert.doesNotMatch(html, /Annulla dimissione/);
});

test('a discharged patient is offered the undo, not a second discharge', () => {
  const html = renderToStaticMarkup(
    createElement(StayStatusCard, {
      statoRicovero: 'dimesso',
      onDischarge: () => {},
      onReadmit: () => {},
    }),
  );
  assert.match(html, /Dimesso/);
  assert.match(html, /<button[^>]*data-stay-action="riammetti"[^>]*>Annulla dimissione<\/button>/);
  assert.doesNotMatch(html, /Dimetti paziente/);
});

test('a role that cannot edit the chart sees the status without the action', () => {
  const html = renderToStaticMarkup(createElement(StayStatusCard, { statoRicovero: 'dimesso' }));
  assert.match(html, /Dimesso/);
  assert.doesNotMatch(html, /data-stay-action/);
});

test('an unknown status is not presented as an active stay', () => {
  const html = renderToStaticMarkup(
    createElement(StayStatusCard, { statoRicovero: undefined, onDischarge: () => {} }),
  );
  assert.match(html, /badge--gray[^>]*>Non indicato/);
  assert.match(html, /Dimetti paziente/);
});

test('the action is disabled while a save is running', () => {
  const html = renderToStaticMarkup(
    createElement(StayStatusCard, {
      statoRicovero: 'ricoverato',
      onDischarge: () => {},
      onReadmit: () => {},
      busy: true,
    }),
  );
  assert.match(html, /<button[^>]*disabled=""[^>]*data-stay-action="dimetti"/);
});
