// Contratto del mapping contatti del wizard di intake → paziente/cartella.
//   node --import tsx --test src/lib/__tests__/intakeContacts.test.ts   (da frontend/)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIntakeContacts, composeAddress } from '../intakeContacts';

test('composes the full address from street, CAP, town and province', () => {
  assert.equal(
    composeAddress({ address: 'Via Roma 1', cap: '24100', comune: 'Bergamo', provincia: 'bg' }),
    'Via Roma 1, 24100 Bergamo (BG)',
  );
});

test('address keeps only the parts that were filled', () => {
  assert.equal(composeAddress({ address: 'Via Roma 1' }), 'Via Roma 1');
  assert.equal(composeAddress({ comune: 'Bergamo' }), 'Bergamo');
  assert.equal(composeAddress({ address: '  ', cap: '' }), undefined);
});

test('address and referente go to the patient columns only; relation and extra contact to the cartella', () => {
  assert.deepEqual(
    buildIntakeContacts({
      address: 'Via Roma 1',
      comune: 'Bergamo',
      referenteNome: 'Chiara Galli',
      referenteRelazione: 'figlio',
      referenteTelefono: '340 555 0126',
      emergencyContact: 'Marco Galli, 339 555 0101',
    }),
    {
      patient: {
        address: 'Via Roma 1, Bergamo',
        emergencyContactName: 'Chiara Galli',
        emergencyContactPhone: '340 555 0126',
      },
      cartella: {
        contattoEmergenzaRel: 'Figlio / Figlia',
        contattoEmergenzaAltro: 'Marco Galli, 339 555 0101',
      },
    },
  );
});

test('nothing filled means nothing sent', () => {
  assert.deepEqual(buildIntakeContacts({ referenteNome: ' ' }), { patient: {}, cartella: {} });
});

test('an unknown relation code is kept as written', () => {
  assert.equal(
    buildIntakeContacts({ referenteRelazione: 'Vicina di casa' }).cartella.contattoEmergenzaRel,
    'Vicina di casa',
  );
});

test('intake confirmation sends the mapped contacts (source contract)', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(
    new URL('../../components/shared/intake/IntakeWorkspace.tsx', import.meta.url),
    'utf8',
  );
  assert.match(src, /buildIntakeContacts\(/);
  assert.match(src, /\.\.\.contacts\.patient/);
  assert.match(src, /\.\.\.contacts\.cartella/);
  assert.doesNotMatch(
    src,
    /emergencyContactName: a\.emergencyContactName/,
    'the old unmapped key must not come back',
  );
});
