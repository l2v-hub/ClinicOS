import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const route = readFileSync(new URL('../note.ts', import.meta.url), 'utf8');
const validation = readFileSync(
  new URL('../../notes/write-validation.ts', import.meta.url),
  'utf8',
);

test('note patient links are resolved inside the authenticated patient scope', () => {
  assert.match(route, /import \{ patientScopeWhere \} from '\.\.\/patients\/patient-scope\.js'/);
  assert.match(route, /resolvePatient\([\s\S]*?actor: Operator/);
  assert.match(route, /patient\.findFirst\([\s\S]*?\.\.\.patientScopeWhere\(actor\)/);
  assert.match(route, /resolvePatient\(input\.pazienteId, actor\)/);
  assert.match(route, /resolvePatient\(patch\.pazienteId, actor\)/);
  assert.match(route, /error instanceof NotePatientNotFoundError/);
  assert.match(route, /code: 'patient_not_found'/);
});

test('note creation never infers a facility-wide recipient', () => {
  assert.match(validation, /function destination\(value: unknown\)/);
  assert.match(validation, /const id = value;/);
  assert.doesNotMatch(validation, /value === undefined \? 'tutti'/);
});
