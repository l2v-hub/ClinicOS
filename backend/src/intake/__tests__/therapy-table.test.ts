// Terapia scritta in tabella (righe markdown dell'OCR): una prescrizione per riga, ogni cella nel
// campo della sua colonna, la riga originale verbatim. Mai un farmaco dall'intestazione.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDischargeTherapy } from '../parse-discharge-therapy.js';
import { therapySourceInventory } from '../therapy-source-inventory.js';

const TABLE = `TERAPIA DOMICILIARE CONSIGLIATA

|  Farmaco | Dose | Posologia | Via | Note  |
| --- | --- | --- | --- | --- |
|  Furosemide (Lasix) 25 mg cpr | 50 mg | 2 cpr ore 8, 1 cpr ore 14 | os | controllo peso quotidiano  |
|  Bisoprololo 2,5 mg cpr | 2,5 mg | 1 cpr ore 8 | os |   |
|  Insulina glargine (Lantus) | 18 UI | ore 22 | sc | secondo glicemie  |
|  Tiotropio 18 mcg cps inalatoria | 18 mcg | 1 inalazione ore 8 | inalatoria |   |
|  Cerotto alfa 5 mg | 5 mg | 1 al giorno | applicare sul braccio |   |`;

test('each table row is one prescription; header and separator are not drugs', () => {
  const rows = parseDischargeTherapy(TABLE);
  assert.deepEqual(
    rows.map((r) => [r.farmacoNome, r.dosaggio, r.viaSomministrazione]),
    [
      ['FUROSEMIDE', '25 mg', 'OS'],
      ['BISOPROLOLO', '2,5 mg', 'OS'],
      ['INSULINA', '18 UI', 'SC'],
      ['TIOTROPIO', '18 mcg', 'INAL'],
      ['CEROTTO', '5 mg', ''],
    ],
  );
  // The source row stays verbatim and every rebuilt row is confirmed by the operator.
  assert.equal(rows[1].originalText, '|  Bisoprololo 2,5 mg cpr | 2,5 mg | 1 cpr ore 8 | os |   |');
  assert.ok(rows.every((r) => r.stato === 'da_verificare'));
});

test('what a column says and no field holds stays visible in the note', () => {
  const [furosemide, , insulina, , cerotto] = parseDischargeTherapy(TABLE);
  // Column dose differs from the strength written next to the name: both are shown.
  assert.match(furosemide.note, /dose: 50 mg/);
  assert.match(furosemide.note, /controllo peso quotidiano/);
  assert.match(furosemide.note, /ore 8, 1 cpr ore 14/);
  assert.match(insulina.note, /secondo glicemie/);
  // A route that is not a known code is written out, never guessed.
  assert.match(cerotto.note, /via: applicare sul braccio/);
});

test('a table that is not a therapy table and plain lines keep the previous behaviour', () => {
  // No "farmaco" column: not recognised as a therapy table.
  const other = parseDischargeTherapy(
    '| Esame | Valore |\n| --- | --- |\n| Creatinina 1,9 mg | alto |',
  );
  assert.ok(other.every((r) => r.originalText.startsWith('|')));
  const plain = parseDischargeTherapy('RAMIPRIL 5 mg (OS) 1 Cpr ore 08:00');
  assert.equal(plain.length, 1);
  assert.equal(plain[0].farmacoNome, 'RAMIPRIL');
  assert.deepEqual(plain[0].orari, ['08:00']);
  assert.equal(plain[0].stato, 'ok');
});

test('a table continues after a blank line; a plain line ends it', () => {
  const rows = parseDischargeTherapy(
    '| Farmaco | Posologia |\n| --- | --- |\n| Ramipril 5 mg | 1 cpr ore 8 |\n\n| Bisoprololo 2,5 mg | 1 cpr ore 8 |\n\nPARACETAMOLO 1000 mg (OS) 1 Cpr ore 08:00',
  );
  assert.deepEqual(
    rows.map((r) => r.farmacoNome),
    ['RAMIPRIL', 'BISOPROLOLO', 'PARACETAMOLO'],
  );
});

test('name and strength from the extraction cover the table row: no duplicate candidate', () => {
  const rows = therapySourceInventory(TABLE, [
    { nome: 'Furosemide', dose: '25 mg' },
    { nome: 'Bisoprololo', dose: '2,5 mg' },
    { nome: 'Insulina glargine', dose: '18 UI' },
    { nome: 'Tiotropio', dose: '18 mcg' },
    { nome: 'Cerotto alfa', dose: '5 mg' },
  ]);
  assert.equal(rows.length, 5);
  assert.ok(rows.every((r) => r.sourceKind === undefined && r.structuredSource));
});

test('a different strength or an unrelated name stays a separate candidate', () => {
  const rows = therapySourceInventory(TABLE, [
    { nome: 'Furosemide', dose: '500 mg' },
    { nome: 'Insulina lispro', dose: '18 UI' },
    { nome: 'Lasix', dose: '25 mg' },
  ]);
  assert.equal(rows.filter((r) => r.sourceKind === 'structured').length, 3);
});
