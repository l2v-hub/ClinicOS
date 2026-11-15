// Una sola bozza d'ingresso per paziente: riconoscimento dei doppioni e archiviazione.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { abandonDraft, abandonDuplicateDrafts, listDrafts, patchDraft } from '../draft-service.js';
import { draftIdentityKey, duplicateOfIds } from '../draft-identity.js';

const run = randomUUID().slice(0, 8);
const OPERATOR = `op-dedupe-${run}`;
const COLLEAGUE = `op-dedupe-other-${run}`;
const created: string[] = [];

async function draft(
  anagrafica: Record<string, unknown> | null,
  createdById = OPERATOR,
  source = 'import',
) {
  const row = await prisma.patientIntakeDraft.create({
    data: { source, createdById, data: anagrafica ? { anagrafica } : {} },
  });
  created.push(row.id);
  return row;
}

after(async () => {
  await prisma.patientIntakeDraft.deleteMany({
    where: { OR: [{ id: { in: created } }, { createdById: { in: [OPERATOR, COLLEAGUE] } }] },
  });
});

test('draftIdentityKey: solo identità forte (CF valido oppure cognome+nome+data di nascita)', () => {
  const byName = { lastName: "D'Àngelo ", firstName: ' Maria  Pia', dateOfBirth: '1950-03-04' };
  assert.equal(draftIdentityKey({ anagrafica: byName }), 'nd:dangelo|maria pia|1950-03-04');
  assert.equal(
    draftIdentityKey({
      anagrafica: { lastName: 'DANGELO', firstName: 'maria pia', dateOfBirth: '1950-03-04' },
    }),
    'nd:dangelo|maria pia|1950-03-04',
  );
  // Il CF valido prevale e ignora maiuscole/spazi.
  assert.equal(
    draftIdentityKey({ anagrafica: { ...byName, codiceFiscale: ' rssmra80a01h501u ' } }),
    'cf:RSSMRA80A01H501U',
  );
  // Un CF non valido non identifica nessuno: si ricade su nome+data.
  assert.equal(
    draftIdentityKey({ anagrafica: { ...byName, codiceFiscale: 'XXXXXX00X00X000X' } }),
    'nd:dangelo|maria pia|1950-03-04',
  );
  // Identità deboli: mai una chiave (due omonimi restano bozze distinte).
  assert.equal(draftIdentityKey({ anagrafica: { lastName: 'Rossi', firstName: 'Mario' } }), null);
  assert.equal(
    draftIdentityKey({ anagrafica: { lastName: 'Rossi', dateOfBirth: '1950-03-04' } }),
    null,
  );
  assert.equal(draftIdentityKey({}), null);
  assert.equal(draftIdentityKey(null), null);
});

test('duplicateOfIds: la più recente è la principale; il proprietario fa parte della chiave', () => {
  const identity = { lastName: 'Rossi', firstName: 'Mario', dateOfBirth: '1950-03-04' };
  const at = (minutes: number) => new Date(Date.UTC(2026, 0, 1, 10, minutes));
  const rows = [
    { id: 'old', data: { anagrafica: identity }, createdById: 'a', updatedAt: at(1) },
    { id: 'new', data: { anagrafica: identity }, createdById: 'a', updatedAt: at(9) },
    { id: 'mid', data: { anagrafica: identity }, createdById: 'a', updatedAt: at(5) },
    { id: 'colleague', data: { anagrafica: identity }, createdById: 'b', updatedAt: at(3) },
    { id: 'weak', data: { anagrafica: { lastName: 'Rossi' } }, createdById: 'a', updatedAt: at(2) },
  ];
  assert.deepEqual(
    [...duplicateOfIds(rows)].sort(),
    [
      ['mid', 'new'],
      ['old', 'new'],
    ].sort(),
  );
});

test('listDrafts segnala i doppioni dello stesso paziente con duplicateOfId', async () => {
  const identity = { lastName: `Doppione${run}`, firstName: 'Mario', dateOfBirth: '1950-03-04' };
  const first = await draft(identity);
  const second = await draft(identity);
  const other = await draft({ ...identity, firstName: 'Luigi' });
  const colleague = await draft(identity, COLLEAGUE);
  // La seconda bozza è quella modificata per ultima.
  await patchDraft(second.id, { anagrafica: { ...identity, phone: '3330000000' } });

  const mine = await listDrafts(OPERATOR);
  const byId = new Map(mine.map((row) => [row.id, row]));
  assert.equal(byId.get(second.id)?.duplicateOfId, null);
  assert.equal(byId.get(first.id)?.duplicateOfId, second.id);
  assert.equal(byId.get(other.id)?.duplicateOfId, null);
  assert.equal(byId.has(colleague.id), false, 'le bozze di un collega non sono nel mio elenco');
  const theirs = await listDrafts(COLLEAGUE);
  assert.equal(theirs.find((row) => row.id === colleague.id)?.duplicateOfId, null);
});

test('abandonDraft archivia senza cancellare, è idempotente e rifiuta le bozze confermate', async () => {
  const row = await draft({ lastName: 'Archiviata', firstName: run, dateOfBirth: '1940-01-01' });
  const archived = await abandonDraft(row.id);
  assert.equal(archived.status, 'abandoned');
  assert.equal(archived.version, row.version + 1);
  assert.equal((await abandonDraft(row.id)).version, archived.version, 'seconda chiamata: no-op');
  const stored = await prisma.patientIntakeDraft.findUnique({ where: { id: row.id } });
  assert.deepEqual(stored?.data, row.data, 'i dati restano a DB');
  assert.equal(
    (await listDrafts(OPERATOR)).some((item) => item.id === row.id),
    false,
  );
  await assert.rejects(
    patchDraft(row.id, { anagrafica: { firstName: 'Modifica' } }),
    (error: { kind?: string; message?: string }) =>
      error.kind === 'config' && /eliminata/.test(error.message ?? ''),
  );

  const confirmed = await prisma.patientIntakeDraft.create({
    data: { source: 'manual', createdById: OPERATOR, status: 'confirmed', data: {} },
  });
  created.push(confirmed.id);
  await assert.rejects(
    abandonDraft(confirmed.id),
    (error: { kind?: string }) => error.kind === 'config',
  );
  await assert.rejects(
    abandonDraft(`missing-${run}`),
    (error: { kind?: string }) => error.kind === 'not_found',
  );
});

test('abandonDuplicateDrafts archivia solo i doppioni forti dello stesso operatore', async () => {
  const identity = { lastName: `Confermato${run}`, firstName: 'Carla', dateOfBirth: '1945-05-05' };
  const confirmed = await draft(identity);
  const duplicate = await draft(identity);
  const homonym = await draft({ ...identity, dateOfBirth: '1960-06-06' });
  const colleague = await draft(identity, COLLEAGUE);

  assert.equal(await abandonDuplicateDrafts(confirmed.id), 1);
  const status = async (id: string) =>
    (await prisma.patientIntakeDraft.findUnique({ where: { id } }))?.status;
  assert.equal(await status(duplicate.id), 'abandoned');
  assert.equal(await status(confirmed.id), 'draft', 'la bozza confermata non viene toccata qui');
  assert.equal(await status(homonym.id), 'draft');
  assert.equal(await status(colleague.id), 'draft');

  const weak = await draft({ lastName: 'Senza', firstName: 'Data' });
  await draft({ lastName: 'Senza', firstName: 'Data' });
  assert.equal(await abandonDuplicateDrafts(weak.id), 0, 'identità debole: nessuna archiviazione');
});
