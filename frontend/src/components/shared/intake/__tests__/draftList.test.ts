import assert from 'node:assert/strict';
import test from 'node:test';
import {
  draftPatientName,
  draftResumePath,
  draftUpdatedLabel,
  groupDrafts,
  isBlankDraft,
} from '../draftList';
import type { DraftResponse } from '../intakeDraftApi';
import { abandonDraft, createDraft } from '../intakeDraftApi';
import { clearManualDraft, openManualDraft } from '../intakeDraftSession';

const draft = (id: string, extra: Partial<DraftResponse> = {}): DraftResponse => ({
  id,
  source: 'import',
  importJobId: `job-${id}`,
  data: { anagrafica: { lastName: 'Rossi', firstName: 'Mario' } },
  duplicateOfId: null,
  ...extra,
});

test('una voce per paziente: la bozza più recente è principale, le precedenti sotto di lei', () => {
  const groups = groupDrafts([
    draft('new'),
    draft('other', { data: { anagrafica: { lastName: 'Verdi', firstName: 'Anna' } } }),
    draft('old-1', { duplicateOfId: 'new' }),
    draft('old-2', { duplicateOfId: 'new' }),
  ]);
  assert.deepEqual(
    groups.map((group) => [group.primary.id, group.older.map((item) => item.id)]),
    [
      ['new', ['old-1', 'old-2']],
      ['other', []],
    ],
  );
});

test('nessuna bozza sparisce: un doppione senza principale visibile resta una voce a sé', () => {
  const groups = groupDrafts([draft('orphan', { duplicateOfId: 'not-in-list' })]);
  assert.deepEqual(
    groups.map((group) => group.primary.id),
    ['orphan'],
  );
});

test('le bozze manuali vuote non sono ingressi in corso; quelle con dati e quelle da import sì', () => {
  const blank = draft('blank', { source: 'manual', importJobId: null, data: {} });
  const emptyFields = draft('empty-fields', {
    source: 'manual',
    importJobId: null,
    data: { anagrafica: { firstName: ' ', lastName: '' }, allergie: [], _server: { x: 1 } },
  });
  const manual = draft('manual', { source: 'manual', importJobId: null });
  const importedBlank = draft('import-blank', { data: {} });
  // Data e ora di presa in carico le scrive la scheda da sola all'apertura: non sono dati inseriti.
  const untouched = draft('untouched', {
    source: 'manual',
    importJobId: null,
    data: {
      ingresso: { dataPresa: '2026-11-15', oraPresa: '17:26' },
      _accepted: { demographics: false },
    },
  });
  const provenance = draft('provenance', {
    source: 'manual',
    importJobId: null,
    data: { ingresso: { dataPresa: '2026-11-15', oraPresa: '17:26', provenienza: 'Ospedale' } },
  });
  assert.equal(isBlankDraft(untouched), true);
  assert.equal(isBlankDraft(provenance), false);
  assert.equal(isBlankDraft(blank), true);
  assert.equal(isBlankDraft(emptyFields), true);
  assert.equal(isBlankDraft(manual), false);
  assert.deepEqual(
    groupDrafts([blank, emptyFields, manual, importedBlank]).map((group) => group.primary.id),
    ['manual', 'import-blank'],
  );
});

test('nome, percorso di ripresa e data di aggiornamento', () => {
  assert.equal(draftPatientName(draft('a')), 'Rossi Mario');
  assert.equal(draftPatientName(draft('b', { data: {} })), 'Identità da completare');
  assert.equal(draftResumePath(draft('c')), 'documenti');
  assert.equal(draftResumePath(draft('d', { source: 'manual', importJobId: null })), 'manuale');
  // Bozza manuale con documenti collegati: si riprende dalla scheda manuale (card Documenti).
  assert.equal(draftResumePath(draft('e', { source: 'manual' })), 'manuale');
  const now = new Date(2026, 10, 15, 18, 0);
  assert.match(
    draftUpdatedLabel(draft('f', { updatedAt: new Date(2026, 10, 15, 9, 5).toISOString() }), now),
    /^oggi alle 09:05$/,
  );
  assert.match(
    draftUpdatedLabel(draft('g', { updatedAt: new Date(2026, 10, 3, 9, 5).toISOString() }), now),
    /^il 3 novembre alle 09:05$/,
  );
  assert.equal(draftUpdatedLabel(draft('h')), '');
});

test('API: «a mano» crea la propria bozza; «Elimina bozza» archivia via PATCH', async () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; method?: string; body?: string }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method, body: init.body as string });
    return {
      ok: true,
      json: async () =>
        init.method === 'PATCH'
          ? { id: 'draft-1', status: 'abandoned' }
          : { id: 'draft-1', data: {} },
    } as Response;
  }) as typeof fetch;
  try {
    // Nessun riuso lato server di bozze vuote: ogni scheda ha la propria bozza.
    await createDraft('manual');
    assert.deepEqual(JSON.parse(calls[0].body!), { source: 'manual' });
    await abandonDraft('draft-1');
    assert.equal(calls[1].method, 'PATCH');
    assert.match(calls[1].url, /\/intake\/drafts\/draft-1$/);
    assert.deepEqual(JSON.parse(calls[1].body!), { status: 'abandoned' });
    globalThis.fetch = (async () =>
      ({
        ok: false,
        status: 400,
        json: async () => ({ error: 'La bozza è già confermata' }),
      }) as Response) as typeof fetch;
    await assert.rejects(abandonDraft('draft-1'), /già confermata/);
    // Backend non aggiornato: 200 con la bozza ancora aperta non è un'eliminazione riuscita.
    globalThis.fetch = (async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ id: 'draft-1', status: 'draft' }),
      }) as Response) as typeof fetch;
    await assert.rejects(abandonDraft('draft-1'), /non ancora disponibile/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('«Riprendi bozza» a mano apre proprio quella bozza e la ricorda per la scheda', async () => {
  const values = new Map<string, string>();
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  Object.assign(globalThis, {
    window: {
      sessionStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    },
  });
  const calls: { method?: string; url: string }[] = [];
  const actor = { operatorId: 'synthetic-operator-resume', operatorRole: 'nurse' };
  try {
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ method: init.method, url });
      return {
        ok: true,
        json: async () => ({
          id: url.split('/').at(-1) === 'drafts' ? 'fresh' : 'listed',
          data: {},
        }),
      } as Response;
    }) as typeof fetch;
    const resumed = await openManualDraft(actor, 'listed');
    assert.equal(resumed.id, 'listed');
    assert.equal(calls[0].method, 'GET');
    assert.match(calls[0].url, /\/intake\/drafts\/listed$/);
    // Ricordata: un ricaricamento della scheda riapre la stessa bozza.
    assert.equal((await openManualDraft(actor)).id, 'listed');
    // Dopo «Salva bozza e chiudi» la scheda la dimentica: il prossimo ingresso parte da una nuova.
    clearManualDraft(actor);
    assert.equal((await openManualDraft(actor)).id, 'fresh');
    assert.equal(calls.at(-1)?.method, 'POST');
  } finally {
    globalThis.fetch = originalFetch;
    Object.assign(globalThis, { window: originalWindow });
  }
});
