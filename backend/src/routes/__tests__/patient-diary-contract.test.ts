import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const routeUrl = new URL('../patient-diary.ts', import.meta.url);
const assistantWriterUrl = new URL('../../ai/voice/write-services.ts', import.meta.url);

test('patient diary route is scoped, no-store and bounded by default', async () => {
  const source = await readFile(routeUrl, 'utf8');
  assert.match(source, /Cache-Control', 'private, no-store'/);
  assert.match(source, /router\.use\('\/:patientId\/diary', requirePatientScope\)/);
  assert.match(source, /loadPatientDiary\(\s*patientId/);
  const reader = await readFile(
    new URL('../../patients/diary-read-service.ts', import.meta.url),
    'utf8',
  );
  assert.match(reader, /LIMIT \$\{input\.limit \+ 1\}/);
  assert.match(reader, /ORDER BY "entryDateTime" DESC, "id" DESC/);
  assert.match(reader, /const hasMore = rows\.length > input\.limit/);
  assert.match(reader, /loadedCount: entries\.length/);
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

test('patient and assistant diary writes share validation before persistence', async () => {
  const source = await readFile(routeUrl, 'utf8');
  const assistantWriter = await readFile(assistantWriterUrl, 'utf8');
  const createBlock =
    source.split('// POST /patients/:patientId/diary')[1]?.split('// GET ')[0] ?? '';
  const updateBlock =
    source.split('// PUT /patients/:patientId/diary/:entryId')[1]?.split('// DELETE ')[0] ?? '';

  assert.ok(
    createBlock.indexOf('parseDiaryCreateBody(req.body)') <
      createBlock.indexOf('authoritativeDiaryAuthor(req.operator!)'),
  );
  assert.ok(
    updateBlock.indexOf('parseDiaryPatchBody(req.body)') <
      updateBlock.indexOf('prisma.patientDiaryEntry.findFirst'),
  );
  assert.match(assistantWriter, /addDiaryNote[\s\S]+?parseDiaryCreateBody/);
  assert.match(assistantWriter, /patientDiaryEntry\.create[\s\S]+?\.\.\.input/);
});
