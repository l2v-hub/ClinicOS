import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const routeUrl = new URL('../patient-diary.ts', import.meta.url);

test('patient diary route is scoped, no-store and bounded by default', async () => {
  const source = await readFile(routeUrl, 'utf8');
  assert.match(source, /Cache-Control', 'private, no-store'/);
  assert.match(source, /router\.use\('\/:patientId\/diary', requirePatientScope\)/);
  assert.match(source, /take: input\.limit \+ 1/);
  assert.match(source, /orderBy: \[\{ entryDateTime: 'desc' \}, \{ id: 'desc' \}\]/);
  assert.match(source, /const hasMore = rows\.length > input\.limit/);
  assert.match(source, /loadedCount: entries\.length/);
});

test('patient diary authorship is server authoritative on create and immutable on update', async () => {
  const source = await readFile(routeUrl, 'utf8');
  const createBlock =
    source.split('// POST /patients/:patientId/diary')[1]?.split('// GET ')[0] ?? '';
  const updateBlock =
    source.split('// PUT /patients/:patientId/diary/:entryId')[1]?.split('// DELETE ')[0] ?? '';
  assert.match(createBlock, /authoritativeDiaryAuthor\(req\.operator!\)/);
  assert.match(createBlock, /\.\.\.author/);
  assert.doesNotMatch(updateBlock, /authorType !== undefined|authorName !== undefined/);
});
