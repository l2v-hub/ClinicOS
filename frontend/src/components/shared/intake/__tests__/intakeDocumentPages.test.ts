// Documento a fianco della scheda d'ingresso (ciclo 3a): chip di provenienza, schede, errori.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { job as baseJob } from '../../import/__tests__/fixtures';
import type { ImportJob, ImportPage } from '../../import/importSessionTypes';
import { ImportSourceError } from '../../import/importSourceCache';
import {
  initialTab,
  keepTab,
  letterNumber,
  originChip,
  pageErrorMessage,
  pageErrorRetryable,
  pageTabs,
  panelTitle,
  readFieldOrigin,
  tabKeyTarget,
} from '../intakeDocumentPages';

type Group = ImportJob['manifest']['groups'][number];
function page(id: string, groupId: string, sortOrder: number, patch: Partial<ImportPage> = {}) {
  return {
    id,
    documentId: `doc-${id}`,
    sourcePageNumber: 1,
    groupId,
    sortOrder,
    status: 'completed',
    canRetry: false,
    errorCode: null,
    error: null,
    ...patch,
  } as ImportPage;
}
/** Due lettere, g1 (prima) e g2; l'ordine nell'array è invertito apposta: conta sortOrder. */
function twoLetters(status = 'processing'): ImportJob {
  const base = baseJob(2);
  const g = (id: string, sortOrder: number): Group => ({
    ...base.manifest.groups[0],
    id,
    label: id,
    sortOrder,
  });
  return {
    ...base,
    status,
    manifest: {
      ...base.manifest,
      groups: [g('g2', 1), g('g1', 0)],
      pages: [
        page('p3', 'g1', 2, { status: 'running' }),
        page('p1', 'g1', 0),
        page('p2', 'g1', 1, { status: 'failed' }),
        page('q1', 'g2', 0, { status: 'pending' }),
      ],
    },
  };
}
const ai = (origin: Record<string, unknown>) => ({
  _fieldOrigin: { 'anagrafica.lastName': { by: 'ai', value: 'Galli', ...origin } },
});
const chipOf = (job: ImportJob | null, origin: Record<string, unknown>) =>
  originChip(job, [readFieldOrigin(ai(origin), 'anagrafica.lastName')]);

test('le lettere si numerano per sortOrder, non per posizione nel manifest', () => {
  const job = twoLetters();
  assert.equal(letterNumber(job, 'g1'), 1);
  assert.equal(letterNumber(job, 'g2'), 2);
  assert.equal(letterNumber(job, 'sparita'), 0);
});

test('AC1: chip "L1" dalla lettera g1, "L2" da g2, aprono la loro lettera', () => {
  const job = twoLetters();
  const one = chipOf(job, { groupIds: ['g1'] });
  assert.equal(one.label, 'L1');
  assert.deepEqual(one.target, { groupId: 'g1' });
  assert.equal(one.ariaLabel, 'Apri la lettera 1, da cui l’AI ha letto questo valore');
  const two = chipOf(job, { groupIds: ['g2'] });
  assert.equal(two.label, 'L2');
  assert.deepEqual(two.target, { groupId: 'g2' });
});

test('AC1: senza job collegato, senza lettere o con lettere sparite il chip resta "AI"', () => {
  for (const chip of [
    chipOf(null, { groupIds: ['g1'] }),
    chipOf(twoLetters(), {}),
    chipOf(twoLetters(), { groupIds: ['altra'] }),
    originChip(twoLetters(), [null]),
  ]) {
    assert.equal(chip.label, 'AI');
    assert.equal(chip.target, null);
    assert.equal(chip.ariaLabel, 'Valore letto dall’AI dai documenti');
  }
});

test('unione finale da più lettere: "L1 + L2", apre la prima', () => {
  const chip = chipOf(twoLetters(), { groupIds: ['g2', 'g1'], final: true });
  assert.equal(chip.label, 'L1 + L2');
  assert.deepEqual(chip.target, { groupId: 'g1' });
  assert.match(chip.ariaLabel, /^Apri la lettera 1: .*dalle lettere 1 e 2$/);
});

test('più campi (blocco clinico): le lettere si uniscono', () => {
  const data = {
    _fieldOrigin: {
      diagnosi: { by: 'ai', groupIds: ['g2'] },
      'anamnesi.patologicaRemota': { by: 'ai', groupIds: ['g1'] },
    },
  };
  const chip = originChip(twoLetters(), [
    readFieldOrigin(data, 'diagnosi'),
    readFieldOrigin(data, 'anamnesi.patologicaRemota'),
  ]);
  assert.equal(chip.label, 'L1 + L2');
});

test('ciclo 3c: con `pages` il chip mostra la pagina, solo se esiste ancora con lo stesso documento', () => {
  const job = twoLetters();
  const withPage = chipOf(job, {
    groupIds: ['g1'],
    pages: [{ groupId: 'g1', pageId: 'p2', documentId: 'doc-p2' }],
  });
  assert.equal(withPage.label, 'L1 · p. 2');
  assert.deepEqual(withPage.target, { groupId: 'g1', pageId: 'p2' });
  assert.equal(
    withPage.ariaLabel,
    'Apri la lettera 1, pagina 2, da cui l’AI ha letto questo valore',
  );
  // pagina sostituita (altro documento) o eliminata: niente numero di pagina, resta la lettera
  for (const pages of [
    [{ groupId: 'g1', pageId: 'p2', documentId: 'doc-vecchio' }],
    [{ groupId: 'g1', pageId: 'sparita', documentId: 'doc-p2' }],
    [{ groupId: 'g1', pageId: 'p2' }],
    'non-un-elenco',
  ]) {
    const chip = chipOf(job, { groupIds: ['g1'], pages });
    assert.equal(chip.label, 'L1');
    assert.deepEqual(chip.target, { groupId: 'g1' });
  }
  // la prima pagina valida della prima lettera
  const first = chipOf(job, {
    groupIds: ['g1', 'g2'],
    pages: [
      { groupId: 'g2', pageId: 'q1', documentId: 'doc-q1' },
      { groupId: 'g1', pageId: 'p3', documentId: 'doc-p3' },
      { groupId: 'g1', pageId: 'p1', documentId: 'doc-p1' },
    ],
  });
  assert.equal(first.label, 'L1 + L2');
  assert.deepEqual(first.target, { groupId: 'g1', pageId: 'p1' });
  assert.match(first.ariaLabel, /^Apri la lettera 1, pagina 1:/);
});

test('origine non AI o assente: nessuna provenienza', () => {
  assert.equal(readFieldOrigin({}, 'diagnosi'), null);
  assert.equal(
    readFieldOrigin({ _fieldOrigin: { diagnosi: { by: 'operator' } } }, 'diagnosi'),
    null,
  );
  assert.deepEqual(readFieldOrigin({ _fieldOrigin: { diagnosi: { by: 'ai' } } }, 'diagnosi'), {
    groupIds: [],
    pages: [],
  });
});

test('AC2: una scheda per pagina, lettera per lettera, con lo stato del manifest', () => {
  const tabs = pageTabs(twoLetters());
  assert.deepEqual(
    tabs.map((t) => [t.label, t.title, t.state, t.stateText]),
    [
      ['L1·p1', 'Lettera 1 · p. 1', 'done', 'letta'],
      ['L1·p2', 'Lettera 1 · p. 2', 'error', 'lettura non riuscita'],
      ['L1·p3', 'Lettera 1 · p. 3', 'reading', 'in lettura'],
      // job in lettura: la pagina in coda è "in lettura"
      ['L2·p1', 'Lettera 2 · p. 1', 'reading', 'in lettura'],
    ],
  );
  // job fermo: la pagina in coda è "da leggere"
  assert.equal(pageTabs(twoLetters('uploaded')).at(-1)?.state, 'waiting');
  assert.deepEqual(pageTabs(null), []);
});

test('pagina da aprire: quella indicata, poi la prima della lettera, poi la prima', () => {
  const tabs = pageTabs(twoLetters());
  assert.equal(initialTab(tabs, { groupId: 'g1', pageId: 'p2' }), 'p2');
  assert.equal(initialTab(tabs, { groupId: 'g2' }), 'q1');
  assert.equal(initialTab(tabs, { groupId: 'g2', pageId: 'sparita' }), 'q1');
  assert.equal(initialTab(tabs, null), 'p1');
  assert.equal(initialTab([], { groupId: 'g1' }), null);
  assert.equal(panelTitle(tabs[1]), 'Lettera 1 · p. 2');
  assert.equal(panelTitle(undefined), 'Documenti');
});

test('la scheda scelta resta finché esiste; altrimenti la prima', () => {
  const tabs = pageTabs(twoLetters());
  assert.equal(keepTab(tabs, 'q1'), 'q1');
  assert.equal(keepTab(tabs, 'sparita'), 'p1');
  assert.equal(keepTab([], 'q1'), null);
});

test('frecce, Home e Fine fra le schede, con giro', () => {
  assert.equal(tabKeyTarget('ArrowRight', 3, 4), 0);
  assert.equal(tabKeyTarget('ArrowLeft', 0, 4), 3);
  assert.equal(tabKeyTarget('ArrowDown', 1, 4), 2);
  assert.equal(tabKeyTarget('Home', 2, 4), 0);
  assert.equal(tabKeyTarget('End', 0, 4), 3);
  assert.equal(tabKeyTarget('Enter', 0, 4), null);
  assert.equal(tabKeyTarget('ArrowRight', 0, 0), null);
});

test('pagina spostata in un’altra lettera: lettera ed etichetta dalle pagine, non da groupIds', () => {
  const job = twoLetters();
  // p2 (letta come parte di g1) ora sta in g2, come seconda pagina
  job.manifest.pages = job.manifest.pages.map((p) =>
    p.id === 'p2' ? { ...p, groupId: 'g2', sortOrder: 1 } : p,
  );
  const chip = chipOf(job, {
    groupIds: ['g1'],
    pages: [{ groupId: 'g1', pageId: 'p2', documentId: 'doc-p2' }],
  });
  assert.equal(chip.label, 'L2 · p. 2');
  assert.deepEqual(chip.target, { groupId: 'g2', pageId: 'p2' });
  assert.equal(chip.ariaLabel, 'Apri la lettera 2, pagina 2, da cui l’AI ha letto questo valore');
  // pagina non più valida (altro documento): si torna a groupIds
  const stale = chipOf(job, {
    groupIds: ['g1'],
    pages: [{ groupId: 'g1', pageId: 'p2', documentId: 'doc-altro' }],
  });
  assert.equal(stale.label, 'L1');
  assert.deepEqual(stale.target, { groupId: 'g1' });
  // in un blocco, ogni campo usa le sue pagine se valide, altrimenti le sue lettere
  const data = {
    _fieldOrigin: {
      diagnosi: {
        by: 'ai',
        groupIds: ['g1'],
        pages: [{ groupId: 'g1', pageId: 'p2', documentId: 'doc-p2' }],
      },
      allergie: { by: 'ai', groupIds: ['g2'] },
    },
  };
  const block = originChip(job, [
    readFieldOrigin(data, 'diagnosi'),
    readFieldOrigin(data, 'allergie'),
  ]);
  assert.equal(block.label, 'L2 · p. 2');
});

test('AC4: originale illeggibile (422): messaggio dedicato e nessun "Riprova"', () => {
  const unreadable = new ImportSourceError(422);
  assert.equal(
    pageErrorMessage(unreadable),
    'Il file originale non è leggibile: rimuovilo e caricalo di nuovo.',
  );
  assert.equal(pageErrorRetryable(unreadable), false);
  assert.equal(pageErrorRetryable(new ImportSourceError(404)), false);
  assert.equal(pageErrorRetryable(new ImportSourceError(410)), false);
  // rete, server, sessione: riprovare ha senso
  assert.equal(pageErrorRetryable(new TypeError('Failed to fetch')), true);
  assert.equal(pageErrorRetryable(new ImportSourceError(503)), true);
  assert.equal(pageErrorRetryable(new ImportSourceError(401)), true);
  assert.equal(pageErrorRetryable(new Error('x')), true);
});

test('AC4: pagina non disponibile, messaggi chiari in italiano', () => {
  assert.match(pageErrorMessage(new ImportSourceError(404)), /non è più disponibile/);
  assert.match(pageErrorMessage(new ImportSourceError(410)), /sessione è scaduta/);
  assert.match(pageErrorMessage(new ImportSourceError(401)), /accedi di nuovo/);
  assert.match(pageErrorMessage(new ImportSourceError(503)), /non ha risposto/);
  assert.match(pageErrorMessage(new TypeError('Failed to fetch')), /Connessione assente/);
  assert.equal(pageErrorMessage(new Error('x')), 'Impossibile mostrare la pagina. Riprova.');
  assert.equal(pageErrorMessage(undefined), 'Impossibile mostrare la pagina. Riprova.');
});
