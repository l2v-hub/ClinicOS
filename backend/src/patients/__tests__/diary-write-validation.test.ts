import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DiaryWriteInputError,
  DIARY_TIME_ZONE,
  MAX_DIARY_CATEGORY_LENGTH,
  MAX_DIARY_CONTENT_BYTES,
  MAX_DIARY_TITLE_LENGTH,
  parseDiaryCreateBody,
  parseDiaryPatchBody,
} from '../diary-write-validation.js';

function rejects(value: unknown, pattern: RegExp, patch = false): void {
  assert.throws(
    () => (patch ? parseDiaryPatchBody(value) : parseDiaryCreateBody(value)),
    (error: unknown) => error instanceof DiaryWriteInputError && pattern.test(error.message),
  );
}

test('diary create normalizes the supported clinical fields and discards spoofed authorship', () => {
  assert.deepEqual(
    parseDiaryCreateBody({
      authorType: 'medico',
      authorName: 'Falso',
      title: '  Controllo  ',
      content: '  Paziente stabile  ',
      priority: 'urgente',
      status: 'da_rivedere',
      entryDateTime: '2026-08-30T09:15',
      category: '  clinica  ',
    }),
    {
      title: 'Controllo',
      content: 'Paziente stabile',
      priority: 'urgente',
      status: 'da_rivedere',
      entryDateTime: '2026-08-30T09:15',
      category: 'clinica',
    },
  );
});

test('diary create rejects oversized, invalid-enum and impossible-date payloads', () => {
  const base = { content: 'ok', entryDateTime: '2026-08-30T09:15' };
  rejects({ ...base, content: 'x'.repeat(MAX_DIARY_CONTENT_BYTES + 1) }, /content supera/);
  rejects({ ...base, title: 'x'.repeat(MAX_DIARY_TITLE_LENGTH + 1) }, /title supera/);
  rejects({ ...base, category: 'x'.repeat(MAX_DIARY_CATEGORY_LENGTH + 1) }, /category supera/);
  rejects({ ...base, priority: 'critica' }, /priority non valida/);
  rejects({ ...base, status: 'cancellata' }, /status non valido/);
  rejects({ ...base, entryDateTime: '2026-02-30T09:15' }, /entryDateTime non valida/);
  rejects({ ...base, extra: 'field' }, /Campo non consentito/);
  rejects([], /Corpo richiesta non valido/);
});

test('diary patch validates every supplied field and refuses empty or spoof-only writes', () => {
  assert.deepEqual(parseDiaryPatchBody({ title: null, content: '  aggiornamento  ' }), {
    title: null,
    content: 'aggiornamento',
  });
  rejects({ content: '   ' }, /content obbligatorio/, true);
  rejects({ status: 'chiusa' }, /status non valido/, true);
  rejects({ entryDateTime: '30/08/2026 09:15' }, /entryDateTime non valida/, true);
  rejects({ authorType: 'medico', authorName: 'Falso' }, /Nessuna modifica valida/, true);
});

test('diary datetime canonicalizes UI and assistant timestamps to sortable facility-local minutes', () => {
  assert.equal(DIARY_TIME_ZONE, 'Europe/Rome');
  const local = parseDiaryCreateBody({ content: 'a', entryDateTime: '2024-02-29T23:59' });
  assert.equal(local.entryDateTime, '2024-02-29T23:59');
  const utc = parseDiaryCreateBody({ content: 'a', entryDateTime: '2026-08-30T09:15:30.123Z' });
  assert.equal(utc.entryDateTime, '2026-08-30T11:15');
  const sameInstant = parseDiaryCreateBody({
    content: 'a',
    entryDateTime: '2026-08-30T11:15:30.123+02:00',
  });
  assert.equal(sameInstant.entryDateTime, utc.entryDateTime);
  const winterUtc = parseDiaryCreateBody({ content: 'a', entryDateTime: '2026-01-30T09:15:00Z' });
  assert.equal(winterUtc.entryDateTime, '2026-01-30T10:15');
});
