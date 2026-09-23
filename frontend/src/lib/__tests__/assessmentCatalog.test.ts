import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ASSESSMENT_VERSIONS } from '../assessments/assessmentTypes';
import { CATALOG_TYPES, CLINICAL_MODULES, parseAssessmentCatalog, createAssessmentCatalogReader, legacyModuleDate, legacyModuleCount, type AssessmentCatalogData } from '../assessments/assessmentCatalog';
import { assessmentCatalogEntry, legacyEntryTransition } from '../assessments/assessmentEntry';
import { createAssessmentDraftStore } from '../assessments/assessmentDraftStore';
import { assessmentPatientTab, patientTabGroup, resolvePatientTab } from '../../components/operator/tabGroups';
import type { CartellaPaziente } from '../../types';

const empty = (): AssessmentCatalogData => ({ items: CATALOG_TYPES.map(type => ({ type, formVersion: ASSESSMENT_VERSIONS[type], latestFinal: null, ownDraftCount: 0, latestOwnDraft: null })) });
const instant = '2026-09-23T07:00:00.000Z';
test('legacy edit to catalog-new transition blocks implicit updates and preserves work until explicit resume or discard', () => {
  const form = { note: 'Modifica non salvata', sede: 'Braccio' };
  const editing = { editId: 'existing-record', form };
  let created = 0;
  const empty = () => { created++; return { note: '', sede: '' }; };
  const requested = legacyEntryTransition('request', editing, empty);
  assert.equal(requested.showForm, false);
  assert.equal(requested.blocked, true);
  assert.equal(requested.editId, 'existing-record');
  assert.equal(requested.form, form);
  assert.equal(created, 0);
  const resumed = legacyEntryTransition('resume', requested, empty);
  assert.equal(resumed.showForm, true);
  assert.equal(resumed.editId, 'existing-record');
  assert.equal(resumed.form, form);
  const fresh = legacyEntryTransition('discard', requested, empty);
  assert.equal(fresh.editId, null);
  assert.equal(fresh.blocked, false);
  assert.equal(fresh.showForm, true);
  assert.deepEqual(fresh.form, { note: '', sede: '' });
  assert.equal(created, 1);
  assert.deepEqual(editing, { editId: 'existing-record', form: { note: 'Modifica non salvata', sede: 'Braccio' } });
  assert.equal(legacyEntryTransition('request', fresh, empty).form, fresh.form);
});
test('catalog DTO accepts five exact types and own-draft metadata, rejecting inconsistent or clinical payloads', () => {
  const data = empty();
  const row = data.items[4];
  row.latestFinal = { id: 'final-gds', formVersion: row.formVersion, assessedAt: instant, createdAt: instant, finalizedAt: instant };
  row.ownDraftCount = 201;
  row.latestOwnDraft = { id: 'draft-gds', formVersion: row.formVersion, assessedAt: instant, createdAt: instant, updatedAt: instant };
  assert.deepEqual(parseAssessmentCatalog(data), data);
  for (const bad of [
    null, {}, { ...data, answers: {} }, { items: data.items.slice(1) }, { items: [...data.items].reverse() },
    { items: data.items.map(item => ({ ...item, answers: {} })) },
    ...[-1, .5, Number.MAX_SAFE_INTEGER + 1, '1', null].map(ownDraftCount => ({ items: [{ ...empty().items[0], ownDraftCount }, ...empty().items.slice(1)] })),
    { items: [{ ...empty().items[0], ownDraftCount: 1 }, ...empty().items.slice(1)] },
    { items: [{ ...empty().items[0], latestOwnDraft: row.latestOwnDraft }, ...empty().items.slice(1)] },
    { items: data.items.map(item => ({ ...item, formVersion: 'future-version' })) },
    { items: [...data.items.slice(0, 4), { ...row, latestFinal: { ...row.latestFinal, assessedAt: '2026-02-31T07:00:00.000Z' } }] },
    { items: [...data.items.slice(0, 4), { ...row, latestFinal: { ...row.latestFinal, finalizedAt: null } }] },
  ]) assert.throws(() => parseAssessmentCatalog(bad));
});

test('catalog makes one bounded metadata request with patient encoding, abort signal and no-store', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const request: typeof fetch = async (url, init) => { calls.push({ url: String(url), init }); return new Response(JSON.stringify(empty()), { status: 200 }); };
  const controller = new AbortController();
  const result = await createAssessmentCatalogReader('http://unit.test', 'patient /a', { 'x-operator-id': 'operator-a' }, request)(controller.signal);
  assert.equal(result.items.length, 5);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://unit.test/patients/patient%20%2Fa/assessments/catalog');
  assert.equal(calls[0].init?.cache, 'no-store');
  assert.equal(calls[0].init?.signal, controller.signal);
  assert.equal(calls[0].init?.body, undefined);
  await assert.rejects(createAssessmentCatalogReader('http://unit.test', 'a', {}, async () => new Response('', { status: 503 }))(controller.signal));
});

test('legacy metadata uses correct clinical fields, latest valid dates and distinguishes empty from undated rows', () => {
  const cartella = { medicazioniFerite: [{ data: '2026-02-04', followUps: [{ data: '2026-09-23' }] }, { data: '2026-03-01' }, { data: '2026-02-31' }], contenzioni: [{ dataInizio: '2026-01-09', createdAt: '2026-09-23' }], valutazioniBraden: [{ data: '' }] } as unknown as CartellaPaziente;
  assert.equal(legacyModuleDate(cartella, 'medicazioni'), '2026-03-01');
  assert.equal(legacyModuleDate(cartella, 'contenzioni'), '2026-01-09');
  assert.equal(legacyModuleDate(cartella, 'braden'), null);
  assert.equal(legacyModuleCount(cartella, 'braden'), 1);
  assert.equal(legacyModuleCount({} as CartellaPaziente, 'braden'), 0);
  assert.equal(legacyModuleCount({ valutazioniBraden: null } as unknown as CartellaPaziente, 'braden'), null);
});

test('all eight catalog routes and five local new/resume intents preserve existing drafts and typed destinations', () => {
  assert.equal(CLINICAL_MODULES.length, 8);
  const store = createAssessmentDraftStore();
  for (const module of CLINICAL_MODULES) {
    assert.equal(patientTabGroup(module.tab), 'moduli');
    assert.equal(resolvePatientTab(module.tab), module.tab);
    if (!module.type) continue;
    assert.equal(assessmentPatientTab(module.type), module.tab);
    const first = assessmentCatalogEntry('patient-a', module.type, 'new', store);
    const draft = store.get(first.localKey!)!;
    assert.equal(draft.record, null);
    assert.equal(draft.patientId, 'patient-a');
    assert.equal(draft.type, module.type);
    assert.equal(draft.pending, null);
    assert.equal(assessmentCatalogEntry('patient-a', module.type, 'new', store).localKey, first.localKey);
    assert.equal(assessmentCatalogEntry('patient-a', module.type, 'resume', store).localKey, first.localKey);
    const other = assessmentCatalogEntry('patient-b', module.type, 'new', store);
    assert.notEqual(other.localKey, first.localKey);
    assert.equal(store.get(first.localKey!), draft);
  }
  const item = empty().items[0];
  item.latestFinal = { id: 'final-a', formVersion: item.formVersion, assessedAt: instant, createdAt: instant, finalizedAt: instant };
  item.ownDraftCount = 1;
  item.latestOwnDraft = { id: 'saved-draft', formVersion: item.formVersion, assessedAt: instant, createdAt: instant, updatedAt: instant };
  assert.equal(assessmentCatalogEntry('patient-a', 'painad', 'open', store, item).id, 'final-a');
  assert.equal(assessmentCatalogEntry('patient-c', 'painad', 'resume', store, item).id, 'saved-draft');
  assert.throws(() => assessmentCatalogEntry('patient-a', 'mna', 'open', store, item));
  assert.equal(patientTabGroup('moduli'), 'moduli');
  assert.equal(patientTabGroup('nrs'), 'moduli');
  store.clear();
  assert.equal(store.list('patient-a', 'painad').length, 0);
});
