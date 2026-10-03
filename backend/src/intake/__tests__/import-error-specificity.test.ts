// Phase 10 (AT-09 / AT-10): a rejected patient import names the exact row and field the operator
// must fix — numbered as on the intake page — and a valid import is never refused.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { Server } from 'node:http';
import express from 'express';
import multer from 'multer';
import { validateDraftTherapySelection } from '../therapy-selection.js';
import { validateConfirmTherapies } from '../confirm-therapies.js';
import {
  PatientIdentityInputError,
  normalizePatientIdentity,
} from '../../patients/progressive-identity.js';
import { uploadLimitError } from '../../ai/upload/upload-errors.js';

const reviewed = {
  farmacoNome: 'Farmaco sintetico',
  dataInizio: '2026-09-15',
  dataFine: '',
  viaSomministrazione: 'orale',
  tipo: 'periodica',
  stato: 'attiva',
  pharmaceuticalForm: 'compressa',
  drugPackageRef: '',
  commercialStrengthUnit: 'mg',
  commercialStrengthValue: 20,
  giorniSettimana: [],
  schedules: [
    {
      time: '08:00',
      quantityNumerator: 1,
      quantityDenominator: 1,
      administrationUnit: 'compressa',
    },
  ],
};
const input = (type: 'import' | 'manual', index: number, patch: Record<string, unknown> = {}) => ({
  ...reviewed,
  giorniSettimana: '',
  ...patch,
  intakeSource: { type, index },
});
const importRow = { stato: 'ok', reviewedTherapy: reviewed, originalText: 'riga sintetica' };

function rejects(fn: () => unknown, pattern: RegExp) {
  assert.throws(fn, (error: Error) => {
    assert.match(error.message, pattern);
    // Field-level messages never echo a clinical value.
    assert.doesNotMatch(error.message, /Farmaco sintetico|20 mg|08:00/);
    return true;
  });
}

test('a manual row that differs from the saved draft names its page number and the field', () => {
  const data = { terapiaImport: [importRow, importRow], terapia: [reviewed] };
  rejects(
    () =>
      validateDraftTherapySelection(data, [
        input('import', 0),
        input('import', 1),
        input('manual', 0, { viaSomministrazione: 'IM' }),
      ] as never),
    /^Terapia 3: il campo «via di somministrazione» è diverso dalla bozza salvata/,
  );
  rejects(
    () =>
      validateDraftTherapySelection(data, [
        input('import', 0),
        input('import', 1, {
          schedules: [{ ...reviewed.schedules[0], time: '09:00' }],
        }),
        input('manual', 0),
      ] as never),
    /^Terapia 2: il campo «orari e quantità»/,
  );
});

test('a saved row missing from the confirmation is named, not a generic mismatch', () => {
  const data = { terapiaImport: [importRow], terapia: [reviewed, reviewed] };
  rejects(
    () => validateDraftTherapySelection(data, [input('import', 0), input('manual', 0)] as never),
    /^Terapia 3: manca dalla conferma/,
  );
});

test('rows still to verify, deferred or left in draft say which row and what to do', () => {
  rejects(
    () =>
      validateDraftTherapySelection(
        { terapiaImport: [importRow, { ...importRow, stato: 'da_verificare' }] },
        [input('import', 0), input('import', 1)] as never,
      ),
    /^Terapia 2: verifica la terapia importata/,
  );
  rejects(
    () =>
      validateDraftTherapySelection({ terapiaImport: [{ ...importRow, conflictDeferred: true }] }, [
        input('import', 0),
      ] as never),
    /^Terapia 1: la fonte della terapia è cambiata o è stata rinviata/,
  );
  rejects(
    () =>
      validateDraftTherapySelection(
        { terapiaImport: [{ ...importRow, excludedFromConfirm: true }] },
        [input('import', 0)] as never,
      ),
    /^Terapia 1: è lasciata in bozza/,
  );
});

test('a valid import selection is accepted (deferred rows excluded, manual rows after imports)', () => {
  const data = {
    terapiaImport: [importRow, { ...importRow, excludedFromConfirm: true }],
    terapia: [reviewed],
  };
  const result = validateDraftTherapySelection(data, [
    input('import', 0),
    input('manual', 0),
  ] as never);
  assert.deepEqual(result.selectedSources, ['import:0', 'manual:0']);
  assert.deepEqual(result.deferredImportIndexes, [1]);
});

test('therapy validation errors use the intake page numbering when provided', () => {
  rejects(
    () => validateConfirmTherapies([{ ...reviewed, giorniSettimana: '', schedules: [] }], () => 4),
    /^Terapia 4: .*sezione Terapia/,
  );
  assert.doesNotThrow(() => validateConfirmTherapies([{ ...reviewed, giorniSettimana: '' }]));
});

test('identity errors name the exact missing field', () => {
  const base = { firstName: 'Persona', lastName: 'Sintetica' };
  assert.throws(
    () => normalizePatientIdentity({ ...base, lastName: '  ' }),
    (e: Error) => e instanceof PatientIdentityInputError && /^Cognome obbligatorio/.test(e.message),
  );
  assert.throws(
    () => normalizePatientIdentity({ ...base, firstName: undefined }),
    (e: Error) => /^Nome obbligatorio/.test(e.message),
  );
  assert.throws(
    () => normalizePatientIdentity({ ...base, firstName: 'x'.repeat(151) }),
    (e: Error) => /^Nome troppo lungo/.test(e.message),
  );
  // Valid identities, including the Italian OCR birth date format, pass unchanged.
  const ok = normalizePatientIdentity({ ...base, dateOfBirth: '01/02/1940' });
  assert.equal(ok.lastName, 'Sintetica');
  assert.equal(ok.dateOfBirth?.toISOString().slice(0, 10), '1940-02-01');
});

test('upload limits say which limit was hit, never the raw multer code', () => {
  const limits = { maxFileBytes: 25 * 1024 * 1024, maxFiles: 10 };
  const size = uploadLimitError(new multer.MulterError('LIMIT_FILE_SIZE'), limits)!;
  assert.equal(size.status, 413);
  assert.match(size.body.error, /25 MB/);
  const count = uploadLimitError(new multer.MulterError('LIMIT_FILE_COUNT'), limits)!;
  assert.match(count.body.error, /al massimo 10 file/);
  assert.doesNotMatch(size.body.error + count.body.error, /LIMIT_/);
  assert.equal(uploadLimitError(new Error('other'), limits), null);
  const unexpected = uploadLimitError(
    new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'doc'),
    limits,
  )!;
  assert.equal(unexpected.status, 400);
  assert.equal(unexpected.body.code, 'invalid_upload');
});

// ── POST /patients (manual "Nuovo paziente"): the missing fields are listed by name ──
let server: Server;
let base: string;
before(async () => {
  // Validation answers before any query; the fallback URL cannot reach a database.
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/import_errors_test';
  process.env.AUTH_MODE = 'demo';
  process.env.NODE_ENV = 'test';
  const { default: router } = await import('../../routes/patients.js');
  const app = express();
  app.use(express.json());
  app.use('/patients', router);
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert.ok(address && typeof address === 'object');
      base = `http://127.0.0.1:${address.port}/patients`;
      resolve();
    });
  });
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  const { prisma } = await import('../../lib/prisma.js');
  await prisma.$disconnect();
});

test('POST /patients lists exactly the missing required fields', async () => {
  const response = await fetch(base, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Operator-Id': 'import-errors-operator',
      'X-Operator-Role': 'operatore',
    },
    body: JSON.stringify({ firstName: 'Persona', lastName: ' ', dateOfBirth: '' }),
  });
  assert.equal(response.status, 400);
  const body = (await response.json()) as { error: string; fields: string[]; code: string };
  assert.equal(body.error, 'Campi obbligatori mancanti: cognome, data di nascita');
  assert.deepEqual(body.fields, ['lastName', 'dateOfBirth']);
  assert.equal(body.code, 'required_fields');
});
