// Pure unit tests for page provenance in mergeAiIntoDraft (Ingresso 3b, AC2). No database access:
// the Prisma client is only constructed by transitive imports, never queried. Synthetic data only.
import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgresql://unit:unit@127.0.0.1:1/unit_no_db';

type Json = Record<string, unknown>;
type PageText = import('../page-locate.js').PageText;
let merge: typeof import('../draft-merge.js');
let results: typeof import('../results.js');

before(async () => {
  merge = await import('../draft-merge.js');
  results = await import('../results.js');
});

const M = {
  version: 1 as const,
  groups: [
    { id: 'g1', label: 'Lettera 1', sortOrder: 0 },
    { id: 'g2', label: 'Lettera 2', sortOrder: 1 },
  ],
  pages: [
    { id: 'p1', documentId: 'd1', sourcePageNumber: 1, groupId: 'g1', sortOrder: 0 },
    { id: 'p2', documentId: 'd1', sourcePageNumber: 2, groupId: 'g1', sortOrder: 1 },
    { id: 'p3', documentId: 'd2', sourcePageNumber: 1, groupId: 'g2', sortOrder: 0 },
  ],
};
const TEXT =
  '## ANAMNESI\nIperteso da anni\n\n## DIAGNOSI\nScompenso cardiaco\n\n## TERAPIA\nRamipril 5 mg 1 cp ore 8\n\n## ALLERGIE\nPenicillina';
const RAW = {
  anagrafica: { nome: 'Mario', cognome: 'Rossi', dataNascita: '1950-03-02', sesso: 'M' },
  cartella: {
    codiceFiscale: 'RSSMRA50C02H501X',
    diagnosi: [{ descrizione: 'Scompenso cardiaco' }],
    allergie: [{ allergene: 'Penicillina' }],
  },
};
// Letter g1: the header page p1 carries the identity, p2 the clinical text.
// Letter g2 (p3) repeats the date of birth only.
const PAGES: PageText[] = [
  {
    groupId: 'g1',
    pageId: 'p1',
    documentId: 'd1',
    text: 'Paziente: Rossi Mario, nato il 02/03/1950\nCF: RSS MRA 50C02 H501X',
  },
  { groupId: 'g1', pageId: 'p2', documentId: 'd1', text: TEXT },
  { groupId: 'g2', pageId: 'p3', documentId: 'd2', text: 'Controllo — paziente nato il 2.3.1950' },
];
const ref = (p: PageText) => ({ groupId: p.groupId, pageId: p.pageId, documentId: p.documentId });

function group(groupId: 'g1' | 'g2', raw: Json = RAW) {
  return JSON.parse(
    JSON.stringify(results.buildGroupResult(M, groupId, `hash-${groupId}`, TEXT, raw, 'mock')),
  );
}
function letter(existing: Json, pages?: PageText[], groupId: 'g1' | 'g2' = 'g1', raw = RAW) {
  return merge.mergeAiIntoDraft(
    existing,
    { fields: merge.aiDraftFields(merge.letterResult(group(groupId, raw))) },
    'letter',
    { groupIds: [groupId], groupId, inputHash: `hash-${groupId}`, pages },
  );
}
function final(existing: Json, pages?: PageText[], raw: Json = RAW) {
  const m = { ...M, groups: [M.groups[0]], pages: [M.pages[0]] };
  const g = results.buildGroupResult(m, 'g1', 'hash-g1', TEXT, raw, 'mock');
  const result = JSON.parse(JSON.stringify(results.assembleResult(m, 3, [g]))) as Json;
  return merge.mergeAiIntoDraft(
    existing,
    { fields: merge.aiDraftFields(result), result },
    'final',
    { groupIds: ['g1', 'g2'], pages },
  );
}
const origin = (d: Json) => d._fieldOrigin as Record<string, Json>;
const pending = (d: Json) =>
  ((d._fieldProposals as Json[]) ?? []).filter((p) => p.status === 'pending');

describe('mergeAiIntoDraft with page OCR text (AC2)', () => {
  test('letter merge: written origins carry the pages the value was found on', () => {
    const { data } = letter({}, PAGES.slice(0, 2));
    const o = origin(data);
    assert.deepEqual(o['anagrafica.lastName'].pages, [ref(PAGES[0])]);
    assert.deepEqual(o['anagrafica.lastName'].groupIds, ['g1']);
    assert.deepEqual(o['anagrafica.dateOfBirth'].pages, [ref(PAGES[0])]);
    assert.deepEqual(o['anagrafica.codiceFiscale'].pages, [ref(PAGES[0])]);
    assert.deepEqual(o['anagrafica.sex'].pages, [ref(PAGES[0])], 'sex follows the name');
    assert.deepEqual(o['allergie'].pages, [ref(PAGES[1])]);
    // "Scompenso cardiaco" is too short to anchor a page (fewer than 5 words / 30 characters).
    assert.equal(o['diagnosi'].pages, undefined);
    assert.equal(o['allergieStatus'].pages, undefined, 'categorical values get no page');
    assert.deepEqual(o['allergieStatus'].groupIds, ['g1']);
  });

  test('final merge: groupIds narrow only to the single producing letter holding every page', () => {
    const { data } = final({}, PAGES);
    const o = origin(data);
    // Produced by g1 alone and found only on g1's page: narrowed to g1, with the page.
    assert.deepEqual(o['anagrafica.lastName'].pages, [ref(PAGES[0])]);
    assert.deepEqual(o['anagrafica.lastName'].groupIds, ['g1']);
    assert.equal(o['anagrafica.lastName'].final, true);
    // Lists too: the final allergy rows equal g1's own rows.
    assert.deepEqual(o['allergie'].pages, [ref(PAGES[1])]);
    assert.deepEqual(o['allergie'].groupIds, ['g1']);
    // Found on pages of two letters: doubt → no pages, today's groupIds.
    assert.equal(o['anagrafica.dateOfBirth'].pages, undefined);
    assert.deepEqual(o['anagrafica.dateOfBirth'].groupIds, ['g1', 'g2']);
    // No certain page: today's behaviour, every letter of the final result.
    assert.equal(o['allergieStatus'].pages, undefined);
    assert.deepEqual(o['allergieStatus'].groupIds, ['g1', 'g2']);
  });

  test('final merge refreshes the provenance of an AI-owned value it confirms', () => {
    const first = letter({}, PAGES.slice(0, 2)).data;
    const { data } = final(first, PAGES);
    const o = origin(data);
    assert.deepEqual(o['anagrafica.lastName'].pages, [ref(PAGES[0])]);
    assert.deepEqual(o['anagrafica.lastName'].groupIds, ['g1']);
    assert.equal(o['anagrafica.lastName'].final, true);
    // In doubt (pages in two letters) or without a match the recorded provenance is kept.
    assert.deepEqual(o['anagrafica.dateOfBirth'].pages, [ref(PAGES[0])]);
    assert.deepEqual(o['anagrafica.dateOfBirth'].groupIds, ['g1']);
    assert.equal(o['anagrafica.dateOfBirth'].final, true);
    assert.deepEqual(o['allergieStatus'].groupIds, ['g1']);
  });

  test('proposals carry pages; a repeated proposal merges them', () => {
    const existing = { anagrafica: { lastName: 'Verdi', dateOfBirth: '1951-01-01' } };
    const first = letter(existing, PAGES.slice(0, 2)).data;
    const byPath = (d: Json, path: string) => pending(d).find((p) => p.path === path)!;
    assert.deepEqual(byPath(first, 'anagrafica.lastName').pages, [ref(PAGES[0])]);
    assert.deepEqual(byPath(first, 'anagrafica.dateOfBirth').pages, [ref(PAGES[0])]);
    const again = letter(first, [PAGES[2]], 'g2').data;
    const dob = byPath(again, 'anagrafica.dateOfBirth');
    assert.deepEqual(dob.pages, [ref(PAGES[0]), ref(PAGES[2])]);
    assert.deepEqual(dob.groupIds, ['g1', 'g2']);
    assert.equal(pending(again).filter((p) => p.path === 'anagrafica.dateOfBirth').length, 1);
  });

  test('regression: "BASS0 GI0VANNI" on A and "rischio basso" on B never give groupIds ["B"]', () => {
    const raw = { ...RAW, anagrafica: { ...RAW.anagrafica, nome: 'Giovanni', cognome: 'Basso' } };
    const pages: PageText[] = [
      { groupId: 'g1', pageId: 'p1', documentId: 'd1', text: 'Paziente: BASS0 GI0VANNI' },
      { groupId: 'g2', pageId: 'p3', documentId: 'd2', text: 'Morse: rischio cadute basso' },
    ];
    const o = origin(final({}, pages, raw).data);
    for (const path of ['anagrafica.lastName', 'anagrafica.firstName', 'anagrafica.sex']) {
      assert.equal(o[path].pages, undefined, path);
      assert.deepEqual(o[path].groupIds, ['g1', 'g2'], path);
    }
  });

  test('final merge: a value found only in a letter that did not produce it keeps groupIds', () => {
    // The date is produced by g1 (the only letter of the final result) but found only on g2.
    const o = origin(final({}, [PAGES[2]]).data);
    assert.equal(o['anagrafica.dateOfBirth'].pages, undefined);
    assert.deepEqual(o['anagrafica.dateOfBirth'].groupIds, ['g1', 'g2']);
  });

  test('final merge: a value produced by several letters keeps groupIds and no pages', () => {
    const g1 = results.buildGroupResult(M, 'g1', 'hash-g1', TEXT, RAW, 'mock');
    const g2 = results.buildGroupResult(M, 'g2', 'hash-g2', TEXT, RAW, 'mock');
    const result = JSON.parse(JSON.stringify(results.assembleResult(M, 3, [g1, g2]))) as Json;
    const { data } = merge.mergeAiIntoDraft(
      {},
      { fields: merge.aiDraftFields(result), result },
      'final',
      { groupIds: ['g1', 'g2'], pages: [PAGES[0]] },
    );
    const o = origin(data);
    assert.equal(o['anagrafica.lastName'].pages, undefined);
    assert.deepEqual(o['anagrafica.lastName'].groupIds, ['g1', 'g2']);
  });

  test('applying a proposal keeps its pages in the operator origin', () => {
    const first = letter({ anagrafica: { lastName: 'Verdi' } }, PAGES.slice(0, 2)).data;
    const proposal = pending(first).find((p) => p.path === 'anagrafica.lastName')!;
    const applied = merge.decideFieldProposal(first, String(proposal.id), 'apply');
    const o = origin(applied)['anagrafica.lastName'];
    assert.equal(o.by, 'operator');
    assert.deepEqual(o.pages, [ref(PAGES[0])]);
  });

  test('no match: no pages and today’s groupIds', () => {
    const unrelated: PageText[] = [
      { groupId: 'g1', pageId: 'p1', documentId: 'd1', text: 'Pagina illeggibile [ILLEGGIBILE]' },
    ];
    for (const pages of [undefined, [], unrelated]) {
      const l = origin(letter({}, pages).data);
      for (const [path, o] of Object.entries(l)) {
        assert.equal(o.pages, undefined, `${path} has no pages`);
        assert.deepEqual(o.groupIds, ['g1']);
      }
      const f = origin(final({}, pages).data);
      for (const o of Object.values(f)) {
        assert.equal(o.pages, undefined);
        assert.deepEqual(o.groupIds, ['g1', 'g2']);
      }
      const proposals = pending(letter({ anagrafica: { lastName: 'Verdi' } }, pages).data);
      assert.ok(proposals.length);
      for (const p of proposals) assert.equal(p.pages, undefined);
    }
  });

  test('the same merge with and without pages writes the same field values', () => {
    const withPages = letter({}, PAGES).data;
    const without = letter({}).data;
    // List rows carry generated ids and timestamps: compare clinical content only.
    const content = (v: unknown) =>
      JSON.parse(JSON.stringify(v ?? null, (k, x) => (k === 'id' || k === 'createdAt' ? '' : x)));
    for (const key of ['anagrafica', 'anamnesi', 'diagnosi', 'allergie', 'allergieStatus'])
      assert.deepEqual(content(withPages[key]), content(without[key]));
  });

  test('an old draft without pages is read without errors', () => {
    const old = letter({}).data; // origins and proposals without `pages`
    const oldWithProposal = letter({ anagrafica: { lastName: 'Verdi' } }).data;
    assert.doesNotThrow(() => letter(old, PAGES, 'g2'));
    assert.doesNotThrow(() => final(old, PAGES));
    const again = letter(oldWithProposal, PAGES).data;
    const p = pending(again).find((x) => x.path === 'anagrafica.lastName')!;
    assert.deepEqual(p.pages, [ref(PAGES[0])], 'pages added to a pending proposal without them');
    const pid = String(pending(oldWithProposal)[0].id);
    const applied = merge.decideFieldProposal(oldWithProposal, pid, 'apply');
    const path = String(pending(oldWithProposal)[0].path);
    assert.equal(origin(applied)[path].pages, undefined);
  });
});
