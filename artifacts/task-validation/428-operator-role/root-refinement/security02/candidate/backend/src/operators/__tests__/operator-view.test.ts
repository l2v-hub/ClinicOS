import assert from 'node:assert/strict';
import test from 'node:test';
import { toOperatore, toDirectoryOperatore, splitFullName, todayRange } from '../operator-view.js';

const row = {
  id: 'SYNTHETIC-428',
  createdAt: new Date('2026-10-10'),
  department: 'Reparto sintetico',
  phone: 'test-only',
  ruolo: null as string | null,
  qualifica: 'Qualifica sintetica',
  user: { email: 'synthetic428@example.test', fullName: 'Nome Cognome Sintetico', isActive: true },
  _count: { registeredPatients: 3, appointments: 2 },
};

test('428 both projections represent missing role without inventing medico', () => {
  assert.equal(toOperatore(row, 2).ruolo, '');
  assert.equal(toDirectoryOperatore(row, 2).ruolo, '');
  assert.equal(row.ruolo, null);
});

test('428 role tokens including legacy/case/whitespace are preserved exactly', () => {
  for (const ruolo of [
    'medico',
    'oss',
    'fisioterapista',
    'operatore',
    'admin',
    'manager',
    '  OSS ',
    'custom',
    '',
  ]) {
    const source = Object.freeze({ ...row, ruolo });
    assert.equal(toOperatore(source, 4).ruolo, ruolo);
    assert.equal(toDirectoryOperatore(source, 4).ruolo, ruolo);
    assert.equal(source.ruolo, ruolo);
  }
});

test('428 minimum directory still omits private contact and patient counts', () => {
  const privateView = toOperatore(row, 2),
    directory = toDirectoryOperatore(row, 2);
  assert.equal(privateView.email, row.user.email);
  assert.equal(privateView.telefono, row.phone);
  assert.equal(privateView.pazientiAssegnati, 3);
  assert.equal(directory.email, '');
  assert.equal(directory.telefono, '');
  assert.equal(directory.pazientiAssegnati, 0);
  assert.equal(directory.appuntamentiOggi, 2);
  assert.equal(directory.qualifica, row.qualifica);
  assert.equal('userRole' in directory, false);
  assert.equal('permissions' in directory, false);
});

test('428 extracted name and today-range behavior remains unchanged', () => {
  assert.deepEqual(splitFullName(' Nome  Cognome Sintetico '), {
    nome: 'Nome',
    cognome: 'Cognome Sintetico',
  });
  const range = todayRange();
  assert.equal(range.gte.getHours(), 0);
  assert.equal(range.gte.getMinutes(), 0);
  assert.equal(range.lte.getHours(), 23);
  assert.equal(range.lte.getMilliseconds(), 999);
});
