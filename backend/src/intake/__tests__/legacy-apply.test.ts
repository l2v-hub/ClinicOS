import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  LegacyIntakeApplyInputError,
  applyLegacyIntakeDocument,
  parseLegacyIntakeApplyInput,
} from '../legacy-apply.js';

test('legacy intake apply accepts only bounded resource identifiers', () => {
  assert.deepEqual(parseLegacyIntakeApplyInput({ documentId: ' doc_1 ', patientId: 'pat-1' }), {
    documentId: 'doc_1',
    patientId: 'pat-1',
  });
  for (const body of [
    null,
    {},
    { documentId: '../doc', patientId: 'pat-1' },
    { documentId: 'doc-1', patientId: 'p'.repeat(129) },
    { documentId: 'doc-1', patientId: 'pat-1', status: 'applied' },
  ]) {
    assert.throws(() => parseLegacyIntakeApplyInput(body), LegacyIntakeApplyInputError);
  }
});

function fakeClient(
  patientExists: boolean,
  document: { status: string; patientId: string | null },
) {
  let updateCalls = 0;
  return {
    client: {
      patient: {
        async findUnique() {
          return patientExists ? { id: 'patient-1' } : null;
        },
      },
      patientIntakeDocument: {
        async updateMany(input: {
          where: { id: string; status: 'extracted'; patientId: null };
          data: { patientId: string; status: 'applied' };
        }) {
          updateCalls += 1;
          if (document.status !== input.where.status || document.patientId !== null) {
            return { count: 0 };
          }
          document.status = input.data.status;
          document.patientId = input.data.patientId;
          return { count: 1 };
        },
      },
    },
    updateCalls: () => updateCalls,
  };
}

test('only an extracted unlinked document can be applied once', async () => {
  const document = { status: 'extracted', patientId: null as string | null };
  const fake = fakeClient(true, document);
  const input = { documentId: 'document-1', patientId: 'patient-1' };

  assert.equal(await applyLegacyIntakeDocument(fake.client, input), 'applied');
  assert.equal(await applyLegacyIntakeDocument(fake.client, input), 'unavailable');
  assert.deepEqual(document, { status: 'applied', patientId: 'patient-1' });
});

test('competing patient links produce exactly one successful association', async () => {
  const document = { status: 'extracted', patientId: null as string | null };
  const fake = fakeClient(true, document);
  const outcomes = await Promise.all([
    applyLegacyIntakeDocument(fake.client, {
      documentId: 'document-1',
      patientId: 'patient-1',
    }),
    applyLegacyIntakeDocument(fake.client, {
      documentId: 'document-1',
      patientId: 'patient-2',
    }),
  ]);

  assert.deepEqual(outcomes.sort(), ['applied', 'unavailable']);
  assert.ok(document.patientId === 'patient-1' || document.patientId === 'patient-2');
  assert.equal(document.status, 'applied');
});

test('missing patients and ineligible documents remain unchanged', async () => {
  const missingPatientDocument = { status: 'extracted', patientId: null as string | null };
  const missingPatient = fakeClient(false, missingPatientDocument);
  assert.equal(
    await applyLegacyIntakeDocument(missingPatient.client, {
      documentId: 'document-1',
      patientId: 'missing-patient',
    }),
    'unavailable',
  );
  assert.equal(missingPatient.updateCalls(), 0);

  for (const document of [
    { status: 'uploaded', patientId: null as string | null },
    { status: 'applied', patientId: 'patient-2' as string | null },
  ]) {
    const before = { ...document };
    const fake = fakeClient(true, document);
    assert.equal(
      await applyLegacyIntakeDocument(fake.client, {
        documentId: 'document-1',
        patientId: 'patient-1',
      }),
      'unavailable',
    );
    assert.deepEqual(document, before);
  }
});

test('route validates input and performs the conditional apply inside one transaction', () => {
  const source = readFileSync(new URL('../../routes/patient-intake.ts', import.meta.url), 'utf8');
  assert.match(source, /parseLegacyIntakeApplyInput\(req\.body\)/);
  assert.match(source, /prisma\.\$transaction\(\(tx\) => applyLegacyIntakeDocument\(tx, input\)\)/);
  assert.match(source, /outcome === 'unavailable'/);
  assert.match(source, /res\.status\(409\)/);
});
