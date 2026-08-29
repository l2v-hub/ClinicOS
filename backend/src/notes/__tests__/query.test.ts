import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  decodeNotesCursor,
  encodeNotesCursor,
  buildNotesTsQuery,
  NotesInputError,
  parseNotesListQuery,
} from '../query.js';
import { parseNoteCreateBody, parseNotePatchBody } from '../write-validation.js';

test('notes query defaults to a bounded mailbox and round-trips a stable cursor', () => {
  const cursor = { createdAt: new Date('2030-01-02T03:04:05.000Z'), id: 'note_123' };
  const token = encodeNotesCursor(cursor);
  assert.deepEqual(decodeNotesCursor(token), cursor);
  assert.deepEqual(parseNotesListQuery({}), { box: 'all', limit: 50 });
  assert.deepEqual(parseNotesListQuery({ box: 'unread', limit: '12', q: '  febbre  ' }), {
    box: 'unread',
    limit: 12,
    q: 'febbre',
  });
});

test('notes search builds only a bounded prefix tsquery', () => {
  assert.equal(buildNotesTsQuery('  Febbre Rossi  '), 'febbre:* & rossi:*');
  assert.equal(
    buildNotesTsQuery('uno due tre quattro cinque sei sette otto nove'),
    'uno:* & due:* & tre:* & quattro:* & cinque:* & sei:* & sette:* & otto:*',
  );
  assert.throws(() => buildNotesTsQuery('---'), NotesInputError);
});

test('notes query rejects malformed, oversized and ambiguous input', () => {
  for (const query of [
    { limit: '0' },
    { limit: '51' },
    { limit: '10foo' },
    { box: 'private' },
    { q: 'x'.repeat(101) },
    { cursor: 'not+base64' },
    { box: ['all', 'sent'] },
  ]) {
    assert.throws(() => parseNotesListQuery(query), NotesInputError);
  }
});

test('note writes are bounded, reject unknown fields and ignore legacy actor labels', () => {
  assert.deepEqual(
    parseNoteCreateBody({
      autoreId: 'spoof',
      autoreNome: 'Spoof',
      destinatarioId: 'tutti',
      destinatarioNome: 'Spoof label',
      stato: 'risolta',
      messaggio: '  Controllare terapia  ',
    }),
    {
      destinatarioId: 'tutti',
      pazienteId: null,
      priorita: 'normale',
      messaggio: 'Controllare terapia',
    },
  );
  assert.deepEqual(parseNotePatchBody({ stato: 'letta' }), { stato: 'letta' });
  assert.throws(() => parseNoteCreateBody({ messaggio: 'x', extra: true }), NotesInputError);
  assert.throws(() => parseNoteCreateBody({ messaggio: 'x'.repeat(4_001) }), NotesInputError);
  assert.throws(() => parseNotePatchBody({}), NotesInputError);
});
