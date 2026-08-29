import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertNarrativeDraftMetadataBounds,
  NarrativeInputError,
  parseNarrativeMetadata,
  parseNarrativeSaveInput,
} from '../narrative-input.js';

test('narrative input preserves bounded text and known review states', () => {
  assert.deepEqual(
    parseNarrativeSaveInput({ reviewedText: 'Testo verificato', reviewStatus: 'reviewed' }),
    { reviewedText: 'Testo verificato', reviewStatus: 'reviewed' },
  );
});

test('narrative input rejects oversized text, wrong types and unknown states', () => {
  for (const input of [
    null,
    { reviewedText: 'x'.repeat(100_001) },
    { originalText: 42 },
    { reviewStatus: 'approved-by-client' },
  ]) {
    assert.throws(() => parseNarrativeSaveInput(input), NarrativeInputError);
  }
});

test('narrative metadata projects bounded annotations and source references', () => {
  assert.deepEqual(
    parseNarrativeMetadata(
      [
        {
          sectionKey: 'DIAGNOSI',
          tagType: 'DATE',
          text: '29/08/2026',
          startOffset: 0,
          endOffset: 10,
          ignored: 'not persisted',
        },
      ],
      [
        {
          sectionKey: 'DIAGNOSI',
          fileId: 'doc-1',
          fileName: 'lettera.pdf',
          pageFrom: 2,
          pageTo: 3,
          ignored: 'not persisted',
        },
      ],
      '29/08/2026 Diagnosi',
      'DIAGNOSI',
    ),
    {
      annotations: [
        {
          sectionKey: 'DIAGNOSI',
          tagType: 'DATE',
          text: '29/08/2026',
          startOffset: 0,
          endOffset: 10,
        },
      ],
      sourceReferences: [
        {
          sectionKey: 'DIAGNOSI',
          fileId: 'doc-1',
          fileName: 'lettera.pdf',
          pageFrom: 2,
          pageTo: 3,
        },
      ],
    },
  );
});

test('narrative metadata rejects amplification, invalid offsets and unsafe provenance', () => {
  const validTag = {
    sectionKey: 'DIAGNOSI',
    tagType: 'DATE',
    text: '29/08/2026',
    startOffset: 0,
    endOffset: 10,
  };
  for (const [annotations, references] of [
    [Array.from({ length: 257 }, () => validTag), []],
    [[{ ...validTag, endOffset: 99 }], []],
    [[{ ...validTag, tagType: 'MODEL_HTML' }], []],
    [[], Array.from({ length: 65 }, () => ({ sectionKey: 'DIAGNOSI' }))],
    [[], [{ sectionKey: 'ALTRO', fileName: 'lettera.pdf' }]],
    [[], [{ sectionKey: 'DIAGNOSI', fileName: 'x'.repeat(256) }]],
    [[], [{ sectionKey: 'DIAGNOSI', pageFrom: 4, pageTo: 3 }]],
  ] as const) {
    assert.throws(
      () => parseNarrativeMetadata(annotations, references, '29/08/2026 Diagnosi', 'DIAGNOSI'),
      NarrativeInputError,
    );
  }
});

test('narrative draft metadata rejects oversized arrays before section routing', () => {
  assert.throws(
    () =>
      assertNarrativeDraftMetadataBounds({
        boldTags: Array.from({ length: 1281 }, () => ({})),
        sourceReferences: [],
      }),
    NarrativeInputError,
  );
  assert.throws(
    () =>
      assertNarrativeDraftMetadataBounds({
        boldTags: [],
        sourceReferences: Array.from({ length: 321 }, () => ({})),
      }),
    NarrativeInputError,
  );
});
