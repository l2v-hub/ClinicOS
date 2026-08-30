import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sourcePanel = readFileSync(
  new URL('../../components/shared/DocumentSourcePanel.tsx', import.meta.url),
  'utf8',
);
const preview = readFileSync(
  new URL('../../components/shared/DocumentPreview.tsx', import.meta.url),
  'utf8',
);
const dischargeImport = readFileSync(
  new URL('../../components/shared/DischargeImportModal.tsx', import.meta.url),
  'utf8',
);

test('patient source panel fetches one selected document instead of the whole collection', () => {
  assert.doesNotMatch(sourcePanel, /Promise\.all\s*\(/);
  assert.match(sourcePanel, /const MAX_PREVIEW_CACHE = 5/);
  assert.match(sourcePanel, /docs\.find\(.*sourceTarget\?\.fileName/s);
  assert.match(sourcePanel, /requestDocument\(selected\.id\)/);
  assert.match(sourcePanel, /previewControllersRef\.current\.has\(documentId\)/);
  assert.match(sourcePanel, /encodeURIComponent\(documentId\)/);
  assert.match(sourcePanel, /import \{ documentAuthHeaders \} from '\.\.\/\.\.\/lib\/entraAuth'/);
  assert.equal(sourcePanel.match(/await documentAuthHeaders\(/g)?.length, 2);
});

test('lazy previews abort requests, bound blob memory and retain local-upload compatibility', () => {
  assert.match(sourcePanel, /controller\.abort\(\)/);
  assert.match(sourcePanel, /while \(cache\.size > MAX_PREVIEW_CACHE\)/);
  assert.match(sourcePanel, /URL\.revokeObjectURL/);
  assert.match(sourcePanel, /onRequestDocument=\{requestDocument\}/);
  assert.match(sourcePanel, /<DocumentPreview\s+key=\{patientId\}/);
  assert.match(preview, /onRequestDocument\?\.\(doc\.id\)/);
  assert.match(preview, /found === idx && sourceTarget\.page/);
  assert.match(preview, /Caricamento documento/);
  assert.match(preview, /Riprova/);
  assert.match(dischargeImport, /url: URL\.createObjectURL\(f\)/);
});
