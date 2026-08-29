import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Nota } from '../../types';
import { buildNotesMailboxUrl, mergeNotesPage } from '../notesMailbox';

const note = (id: string): Nota => ({
  id,
  autoreId: 'a',
  autoreNome: 'A',
  destinatarioId: 'b',
  destinatarioNome: 'B',
  priorita: 'normale',
  messaggio: id,
  stato: 'non_letta',
  createdAt: '2030-01-01T00:00:00.000Z',
});

test('notes mailbox URL encodes server filters and never requests more than 50', () => {
  assert.equal(
    buildNotesMailboxUrl('https://api.example', { box: 'unread', q: 'febbre & dolore' }, 'abc'),
    'https://api.example/notes?box=unread&limit=50&q=febbre+%26+dolore&cursor=abc',
  );
});

test('notes mailbox appends pages without duplicate cards', () => {
  assert.deepEqual(
    mergeNotesPage([note('1'), note('2')], [note('2'), note('3')]).map((item) => item.id),
    ['1', '2', '3'],
  );
});
