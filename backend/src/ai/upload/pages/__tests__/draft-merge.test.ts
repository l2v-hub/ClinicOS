// Pure unit tests for the AI → intake draft merge (no database access: the Prisma client is
// only constructed by transitive imports, never queried).
import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgresql://unit:unit@127.0.0.1:1/unit_no_db';

type Json = Record<string, unknown>;
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
    { id: 'p2', documentId: 'd1', sourcePageNumber: 2, groupId: 'g2', sortOrder: 0 },
  ],
};
const TEXT =
  '## ANAMNESI\nIperteso da anni\n\n## DIAGNOSI\nScompenso cardiaco\n\n## TERAPIA\nRamipril 5 mg 1 cp ore 8\nFurosemide 25 mg 1 cp ore 8\n\n## ALLERGIE\nPenicillina';
const RAW = {
  anagrafica: {
    nome: 'Mario',
    cognome: 'Rossi',
    dataNascita: '1950-03-02',
    sesso: 'M',
    telefono: '+39 333 1111111',
  },
  cartella: {
    codiceFiscale: 'RSSMRA50C02H501X',
    diagnosi: [{ descrizione: 'Scompenso cardiaco' }],
    allergie: [{ allergene: 'Penicillina' }],
  },
};

function group(groupId: 'g1' | 'g2', raw: Json = RAW, text = TEXT) {
  return JSON.parse(
    JSON.stringify(results.buildGroupResult(M, groupId, `hash-${groupId}`, text, raw, 'mock')),
  );
}
function letter(existing: Json, groupId: 'g1' | 'g2' = 'g1', raw: Json = RAW, text = TEXT) {
  const g = group(groupId, raw, text);
  return merge.mergeAiIntoDraft(
    existing,
    { fields: merge.aiDraftFields(merge.letterResult(g)) },
    'letter',
    { groupIds: [groupId], groupId, inputHash: `hash-${groupId}` },
  );
}
function finalResult(raw: Json = RAW, text = TEXT) {
  const m = { ...M, groups: [M.groups[0]], pages: [M.pages[0]] };
  const g = results.buildGroupResult(m, 'g1', 'hash-g1', text, raw, 'mock');
  return JSON.parse(JSON.stringify(results.assembleResult(m, 3, [g]))) as Json;
}
function final(existing: Json, raw: Json = RAW, text = TEXT) {
  const result = finalResult(raw, text);
  return merge.mergeAiIntoDraft(
    existing,
    { fields: merge.aiDraftFields(result), result },
    'final',
    { groupIds: ['g1'] },
  );
}
const ana = (d: Json) => d.anagrafica as Json;
const pending = (d: Json) =>
  ((d._fieldProposals as Json[]) ?? []).filter((p) => p.status === 'pending');

describe('mergeAiIntoDraft — per-letter merge', () => {
  test('fills blank fields and records their AI origin', () => {
    const { data, changed } = letter({ anagrafica: { firstName: '  ' } });
    assert.equal(ana(data).firstName, 'Mario');
    assert.equal(ana(data).lastName, 'Rossi');
    assert.equal(ana(data).codiceFiscale, 'RSSMRA50C02H501X');
    assert.equal(ana(data).codiceFiscaleOrigine, 'import');
    assert.equal((data.anamnesi as Json).patologicaProssima, '## ANAMNESI\nIperteso da anni');
    assert.equal((data.diagnosi as Json[])[0].descrizione, 'Scompenso cardiaco');
    assert.equal((data.allergie as Json[])[0].allergene, 'Penicillina');
    assert.equal(data.allergieStatus, 'presenti');
    const origin = data._fieldOrigin as Record<string, Json>;
    assert.equal(origin['anagrafica.firstName'].by, 'ai');
    assert.equal(origin['anagrafica.firstName'].value, 'Mario');
    assert.deepEqual(origin['anagrafica.firstName'].groupIds, ['g1']);
    assert.equal(origin['anagrafica.firstName'].final, false);
    assert.deepEqual(data._aiMerge, { groups: { g1: 'hash-g1' } });
    assert.equal(changed.anagrafica, true);
    assert.equal(changed.therapy, false);
    assert.deepEqual(data._fieldProposals, []);
  });

  test('never touches therapy, _importSource, _narrative or _importProposals', () => {
    const existing: Json = {
      terapiaImport: [],
      _importProposals: [{ id: 'x', status: 'pending' }],
      _accepted: { demographics: false, therapy: true },
    };
    const { data } = letter(existing);
    assert.deepEqual(data.terapiaImport, []);
    assert.deepEqual(data._importProposals, existing._importProposals);
    assert.equal(data._importSource, undefined);
    assert.equal(data._narrative, undefined);
    assert.equal(data._terapiaText, undefined);
    assert.equal((data._accepted as Json).therapy, true, 'therapy acceptance untouched');
  });

  test('keeps operator fields and creates a deduplicated pending proposal', () => {
    const first = letter({ anagrafica: { firstName: 'Marco', phone: '+39 333 2222222' } }).data;
    assert.equal(ana(first).firstName, 'Marco');
    assert.equal(ana(first).phone, '+39 333 2222222');
    assert.equal(ana(first).lastName, 'Rossi', 'blank neighbour still filled');
    const proposals = pending(first);
    assert.deepEqual(proposals.map((p) => p.path).sort(), [
      'anagrafica.firstName',
      'anagrafica.phone',
    ]);
    const firstName = proposals.find((p) => p.path === 'anagrafica.firstName')!;
    assert.equal(firstName.value, 'Mario');
    assert.equal(firstName.current, 'Marco');
    assert.match(String(firstName.id), /^[A-Za-z0-9_-]{1,100}$/);
    // The second letter proposes the same value: one proposal, both letters as sources.
    const second = letter(first, 'g2').data;
    const again = pending(second).filter((p) => p.path === 'anagrafica.firstName');
    assert.equal(again.length, 1);
    assert.deepEqual(again[0].groupIds, ['g1', 'g2']);
  });

  test('a kept or applied proposal is not raised again for the same value', () => {
    const first = letter({ anagrafica: { firstName: 'Marco' } }).data;
    const pid = String(pending(first)[0].id);
    const kept = merge.decideFieldProposal(first, pid, 'keep');
    const again = letter(kept).data;
    assert.equal(pending(again).length, 0);
    assert.equal((again._fieldProposals as Json[]).length, 1);
  });

  test('an AI-owned value is not replaced by another letter', () => {
    const first = letter({}).data;
    const otherRaw = { ...RAW, anagrafica: { ...RAW.anagrafica, telefono: '+39 333 9999999' } };
    const { data, changed } = letter(first, 'g2', otherRaw);
    assert.equal(ana(data).phone, '+39 333 1111111');
    assert.equal(
      pending(data).length,
      0,
      'letters disagreeing is the review conflict, not a proposal',
    );
    assert.equal(changed.anagrafica, false);
  });

  test('re-merging identical content changes nothing (list ids and timestamps ignored)', () => {
    const first = letter({ _accepted: { demographics: true } }).data;
    const reset = { ...first, _accepted: { demographics: true } };
    const { data, changed } = letter(reset);
    assert.deepEqual(changed, {
      anagrafica: false,
      anamnesi: false,
      diagnosi: false,
      allergie: false,
      therapy: false,
    });
    assert.equal(pending(data).length, 0);
    assert.equal((data._accepted as Json).demographics, true);
    assert.deepEqual(data.diagnosi, first.diagnosi);
  });

  test('the AI never blanks a field', () => {
    const empty = { anagrafica: { nome: 'Mario' }, cartella: {} };
    const { data } = letter({ anagrafica: { phone: '+39 333 2222222' } }, 'g1', empty, '');
    assert.equal(ana(data).phone, '+39 333 2222222');
    assert.equal(data.diagnosi, undefined);
  });

  test('an operator edit of an AI value makes the field the operator’s', () => {
    const first = letter({}).data;
    const edited = { ...first, anagrafica: { ...ana(first), phone: '+39 333 4444444' } };
    const otherRaw = { ...RAW, anagrafica: { ...RAW.anagrafica, telefono: '+39 333 9999999' } };
    const { data } = final(edited, otherRaw);
    assert.equal(ana(data).phone, '+39 333 4444444');
    assert.equal(pending(data)[0].path, 'anagrafica.phone');
  });
});

describe('mergeAiIntoDraft — final merge', () => {
  test('replaces AI values, keeps operator values and resets acceptances', () => {
    const otherRaw = {
      ...RAW,
      anagrafica: { ...RAW.anagrafica, telefono: '+39 333 9999999', nome: 'Mario' },
    };
    const first = letter({ anagrafica: { firstName: 'Marco' } }, 'g1', otherRaw).data;
    assert.equal(pending(first).length, 1);
    const accepted = { ...first, _accepted: { demographics: true, therapy: true } };
    const { data, changed } = final(accepted);
    assert.equal(ana(data).phone, '+39 333 1111111', 'AI-owned phone replaced by final result');
    assert.equal(ana(data).firstName, 'Marco', 'operator value kept');
    assert.equal(pending(data).length, 1);
    assert.equal(pending(data)[0].path, 'anagrafica.firstName');
    assert.equal((data._fieldOrigin as Record<string, Json>)['anagrafica.phone'].final, true);
    assert.equal(changed.anagrafica, true);
    assert.equal((data._accepted as Json).demographics, false);
    assert.equal((data._accepted as Json).therapy, false, 'rows imported → therapy reset');
  });

  test('final drops per-letter proposals it no longer supports', () => {
    const letterRaw = { ...RAW, anagrafica: { ...RAW.anagrafica, telefono: '+39 333 7777777' } };
    const first = letter({ anagrafica: { phone: '+39 333 2222222' } }, 'g1', letterRaw).data;
    assert.equal(pending(first)[0].value, '+39 333 7777777');
    const { data } = final(first);
    const phone = pending(data).filter((p) => p.path === 'anagrafica.phone');
    assert.equal(phone.length, 1);
    assert.equal(phone[0].value, '+39 333 1111111');
  });

  test('without operator therapy the imported rows go to terapiaImport', () => {
    const { data, changed } = final({});
    const rows = data.terapiaImport as Json[];
    assert.deepEqual(
      rows.map((r) => r.originalText),
      ['Ramipril 5 mg 1 cp ore 8', 'Furosemide 25 mg 1 cp ore 8'],
    );
    assert.deepEqual(data._importProposals, []);
    assert.equal((data._importSource as Json).manifestRevision, 3);
    assert.ok(data._narrative, 'narrative attached for confirmation');
    assert.equal(changed.therapy, true);
    assert.ok((data._importedFields as string[]).includes('terapiaImport'));
    assert.equal(
      (data._aiMerge as Json).final,
      (finalResult()._source as Json).resultHash as string,
    );
  });

  test('with operator therapy every AI row becomes an import proposal', () => {
    const operatorRow = { originalText: 'Bisoprololo 1,25 mg 1 cp', farmacoNome: 'BISOPROLOLO' };
    const { data } = final({ terapiaImport: [operatorRow] });
    assert.deepEqual(data.terapiaImport, [operatorRow], 'operator therapy untouched');
    const proposals = data._importProposals as Json[];
    assert.equal(proposals.length, 2);
    assert.ok(proposals.every((p) => p.status === 'pending'));
    assert.deepEqual(
      proposals.map((p) => (p.row as Json).originalText),
      ['Ramipril 5 mg 1 cp ore 8', 'Furosemide 25 mg 1 cp ore 8'],
    );
    assert.ok(data._importSource);
  });

  test('a manual therapy form also counts as operator therapy', () => {
    const { data } = final({ terapia: { farmaco: 'Paracetamolo' } });
    assert.deepEqual(data.terapiaImport, []);
    assert.equal((data._importProposals as Json[]).length, 2);
  });

  test('a repeated final merge refreshes like refresh-import (no duplicate rows)', () => {
    const first = final({}).data;
    const accepted = { ...first, _accepted: { therapy: true } };
    const { data, changed } = final(accepted);
    assert.equal((data.terapiaImport as Json[]).length, 2);
    assert.deepEqual(data._importProposals, []);
    assert.equal(changed.therapy, false);
    assert.equal((data._accepted as Json).therapy, true);
  });
});

describe('decideFieldProposal', () => {
  test('apply writes the value and makes the field operator-owned', () => {
    const first = letter({
      anagrafica: { firstName: 'Marco', codiceFiscale: 'AAAAAA00A00A000A' },
      _accepted: { demographics: true },
    }).data;
    const cf = pending(first).find((p) => p.path === 'anagrafica.codiceFiscale')!;
    const applied = merge.decideFieldProposal(first, String(cf.id), 'apply');
    assert.equal(ana(applied).codiceFiscale, 'RSSMRA50C02H501X');
    assert.equal(ana(applied).codiceFiscaleOrigine, 'import');
    assert.equal(
      (applied._fieldOrigin as Record<string, Json>)['anagrafica.codiceFiscale'].by,
      'operator',
    );
    assert.equal((applied._accepted as Json).demographics, false);
    assert.equal(
      (applied._fieldProposals as Json[]).find((p) => p.id === cf.id)!.status,
      'applied',
    );
    // A later final result with a different value can only propose it.
    const otherRaw = { ...RAW, cartella: { ...RAW.cartella, codiceFiscale: 'RSSMRA50C02H501Y' } };
    const { data } = final(applied, otherRaw);
    assert.equal(ana(data).codiceFiscale, 'RSSMRA50C02H501X');
    assert.ok(pending(data).some((p) => p.value === 'RSSMRA50C02H501Y'));
  });

  test('apply closes the other pending proposals on the same field', () => {
    const first = letter({ anagrafica: { phone: '+39 333 2222222' } }).data;
    const otherRaw = { ...RAW, anagrafica: { ...RAW.anagrafica, telefono: '+39 333 8888888' } };
    const both = letter(first, 'g2', otherRaw).data;
    const phones = pending(both).filter((p) => p.path === 'anagrafica.phone');
    assert.equal(phones.length, 2);
    const applied = merge.decideFieldProposal(both, String(phones[0].id), 'apply');
    assert.equal(merge.pendingFieldProposals(applied), pending(applied).length);
    assert.equal(pending(applied).filter((p) => p.path === 'anagrafica.phone').length, 0);
  });

  test('keep leaves the value and marks the proposal', () => {
    const first = letter({ anagrafica: { firstName: 'Marco' } }).data;
    const pid = String(pending(first)[0].id);
    const kept = merge.decideFieldProposal(first, pid, 'keep');
    assert.equal(ana(kept).firstName, 'Marco');
    assert.equal(merge.pendingFieldProposals(kept), 0);
  });

  test('rejects unknown, decided or malformed decisions', () => {
    const first = letter({ anagrafica: { firstName: 'Marco' } }).data;
    const pid = String(pending(first)[0].id);
    assert.throws(() => merge.decideFieldProposal(first, 'missing', 'apply'), {
      code: 'proposal_not_found',
    });
    assert.throws(() => merge.decideFieldProposal(first, pid, 'overwrite'), {
      code: 'invalid_input',
    });
    const kept = merge.decideFieldProposal(first, pid, 'keep');
    assert.throws(() => merge.decideFieldProposal(kept, pid, 'apply'), {
      code: 'proposal_decided',
    });
  });
});

describe('aiDraftFields', () => {
  test('maps only unambiguous allergy statuses to the intake vocabulary', () => {
    const raw = { anagrafica: { nome: 'Mario' }, cartella: {} };
    const statusFor = (allergyStatus: string) => {
      const g = group('g1', raw, '');
      g._narrative.allergyStatus = allergyStatus;
      g._narrative.allergiesText = 'Nessuna allergia nota';
      return merge.aiDraftFields(merge.letterResult(g));
    };
    const absent = statusFor('explicitly_absent');
    assert.equal(absent.allergieStatus, 'assenti');
    assert.equal(absent.allergie, undefined, 'never an allergy row for an absence');
    assert.equal(statusFor('conflicting').allergieStatus, undefined);
    assert.equal(statusFor('not_documented').allergieStatus, undefined);
  });
});

// ── QA fixes: operator-cleared fields (A1), final as reviewed truth (A5), allergy unit (B1) ──
const ctxLetter = (groupId = 'g1') => ({ groupIds: [groupId], groupId, inputHash: `h-${groupId}` });
const direct = (existing: Json, fields: Json, mode: 'letter' | 'final' = 'letter') =>
  merge.mergeAiIntoDraft(
    existing,
    mode === 'final' ? { fields, result: finalResult() } : { fields },
    mode,
    mode === 'final' ? { groupIds: ['g1'] } : ctxLetter(),
  ).data;
const ROWS = [{ id: 'r1', allergene: 'Penicillina', gravita: 'lieve' }];

describe('A1 — a field the operator emptied is the operator’s', () => {
  test('neither a letter nor the final merge rewrites it; one deduplicated proposal', () => {
    const first = letter({}).data;
    const emptied = { ...first, anagrafica: { ...ana(first), phone: '' } };
    const again = letter(emptied).data;
    assert.equal(ana(again).phone, '');
    const phone = pending(again).filter((p) => p.path === 'anagrafica.phone');
    assert.equal(phone.length, 1);
    assert.equal(phone[0].value, '+39 333 1111111');
    const fin = final(again).data;
    assert.equal(ana(fin).phone, '', 'final does not refill an emptied field');
    assert.equal(pending(fin).filter((p) => p.path === 'anagrafica.phone').length, 1);
  });

  test('an emptied list is not refilled either', () => {
    const first = letter({}).data;
    const again = letter({ ...first, diagnosi: [] }).data;
    assert.deepEqual(again.diagnosi, []);
    assert.equal(pending(again).filter((p) => p.path === 'diagnosi').length, 1);
  });
});

describe('A5 — the final result is the reviewed truth', () => {
  const noPhone = { ...RAW, anagrafica: { ...RAW.anagrafica, telefono: '' } };

  test('an untouched letter value the final does not carry is cleared with its origin', () => {
    const first = letter({}).data;
    assert.equal(ana(first).phone, '+39 333 1111111');
    const { data, changed } = final(first, noPhone);
    assert.equal(ana(data).phone, '');
    assert.equal((data._fieldOrigin as Json)['anagrafica.phone'], undefined);
    assert.equal(changed.anagrafica, true);
    assert.equal(ana(data).firstName, 'Mario', 'supported values stay');
  });

  test('an operator-edited value is never cleared', () => {
    const first = letter({}).data;
    const edited = { ...first, anagrafica: { ...ana(first), phone: '+39 333 5555555' } };
    assert.equal(ana(final(edited, noPhone).data).phone, '+39 333 5555555');
  });

  test('pending proposals without support in the final are dropped, even with no final value', () => {
    const first = letter({ anagrafica: { phone: '+39 333 2222222' } }).data;
    assert.equal(pending(first).filter((p) => p.path === 'anagrafica.phone').length, 1);
    const { data } = final(first, noPhone);
    assert.equal(pending(data).filter((p) => p.path === 'anagrafica.phone').length, 0);
    assert.equal(ana(data).phone, '+39 333 2222222');
  });

  test('a cleared fiscal code loses its import origin marker', () => {
    const first = letter({}).data;
    const noCf = { ...RAW, cartella: { ...RAW.cartella, codiceFiscale: '' } };
    const data = final(first, noCf).data;
    assert.equal(ana(data).codiceFiscale, '');
    assert.equal(ana(data).codiceFiscaleOrigine, undefined);
  });
});

describe('B1 — allergy rows and status are one unit', () => {
  test('operator rows: an AI "assenti" status is never written, it becomes a proposal', () => {
    for (const mode of ['letter', 'final'] as const) {
      const data = direct({ allergie: ROWS }, { allergieStatus: 'assenti' }, mode);
      assert.equal(data.allergieStatus, undefined, mode);
      const status = pending(data).filter((p) => p.path === 'allergieStatus');
      assert.equal(status.length, 1, mode);
      assert.equal(status[0].value, 'assenti');
    }
  });

  test('operator "assenti"/"paziente_nega": AI rows are not filled even into an empty list', () => {
    for (const status of ['assenti', 'paziente_nega']) {
      const data = direct({ allergieStatus: status, allergie: [] }, { allergie: ROWS });
      assert.deepEqual(data.allergie, [], status);
      assert.equal(data.allergieStatus, status);
      assert.equal(pending(data).filter((p) => p.path === 'allergie').length, 1, status);
      assert.equal((data._fieldOrigin as Json).allergie, undefined);
    }
  });

  test('an AI-written "assenti" does not let a later letter add rows beside it', () => {
    const first = direct({}, { allergieStatus: 'assenti' });
    assert.equal(first.allergieStatus, 'assenti');
    const second = direct(first, { allergie: ROWS, allergieStatus: 'presenti' });
    assert.equal(second.allergieStatus, 'assenti');
    assert.equal(second.allergie, undefined);
    assert.equal(pending(second).filter((p) => p.path === 'allergie').length, 1);
  });

  test('the final merge replaces an AI "assenti" with rows and "presenti" coherently', () => {
    const first = direct({}, { allergieStatus: 'assenti' });
    const fin = final(first).data;
    assert.equal(fin.allergieStatus, 'presenti');
    assert.equal((fin.allergie as Json[])[0].allergene, 'Penicillina');
    assert.equal(pending(fin).length, 0);
  });

  test('applying rows over a negative status turns the status into "presenti"', () => {
    const data = direct({ allergieStatus: 'assenti' }, { allergie: ROWS });
    const rows = pending(data).find((p) => p.path === 'allergie')!;
    const applied = merge.decideFieldProposal(data, String(rows.id), 'apply');
    assert.equal(applied.allergieStatus, 'presenti');
    assert.equal((applied.allergie as Json[]).length, 1);
    assert.equal((applied._fieldOrigin as Record<string, Json>).allergieStatus.by, 'operator');
  });

  test('applying "assenti" while rows exist is refused (409 proposal_inconsistent)', () => {
    const data = direct({ allergie: ROWS }, { allergieStatus: 'assenti' });
    const status = pending(data).find((p) => p.path === 'allergieStatus')!;
    assert.throws(() => merge.decideFieldProposal(data, String(status.id), 'apply'), {
      code: 'proposal_inconsistent',
      status: 409,
    });
    const kept = merge.decideFieldProposal(data, String(status.id), 'keep');
    assert.deepEqual(kept.allergie, ROWS);
  });

  test('applying rows closes a pending "assenti" proposal', () => {
    const withStatus = direct(
      { allergie: [], allergieStatus: 'paziente_nega' },
      { allergie: ROWS },
    );
    const rows = pending(withStatus).find((p) => p.path === 'allergie')!;
    const both = {
      ...withStatus,
      _fieldProposals: [
        ...(withStatus._fieldProposals as Json[]),
        { id: 's1', path: 'allergieStatus', value: 'assenti', status: 'pending', groupIds: [] },
      ],
    };
    const applied = merge.decideFieldProposal(both, String(rows.id), 'apply');
    assert.equal(merge.pendingFieldProposals(applied), 0);
  });
});
