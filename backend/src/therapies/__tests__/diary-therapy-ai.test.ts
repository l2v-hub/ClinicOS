import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  diaryTherapyAiEnabled,
  diaryTherapyAiPrompt,
  mergeAiProposal,
  needsAiFallback,
  normalizeTime,
  parseAiProposal,
  type AiTherapyProposal,
  type DiaryTherapyAiProposer,
} from '../diary-therapy-ai.js';
import { parseDiaryTherapyText } from '../diary-therapy-parse.js';
import { previewDiaryTherapy } from '../../patients/diary-write-service.js';

const USER_TEXT = 'Terapia techipirina 1000mg ogni 8ore parte dalle 8.00';
const DAY = '2026-09-30';

const proposal = (over: Partial<AiTherapyProposal> = {}): AiTherapyProposal => ({
  farmacoNome: 'TACHIPIRINA',
  dosaggio: '1000 mg',
  viaSomministrazione: '',
  forma: '',
  orari: ['00:00', '08:00', '16:00'],
  quantita: '',
  dataInizio: '',
  correzioni: ['techipirina → TACHIPIRINA'],
  dubbi: [],
  ...over,
});

function spy(answer: AiTherapyProposal | null | Error) {
  const calls: string[] = [];
  const fn: DiaryTherapyAiProposer = async (text) => {
    calls.push(text);
    if (answer instanceof Error) throw answer;
    return answer;
  };
  return { fn, calls };
}

test('AC1: the user text gets drug, dose and times from the AI, flagged as proposals', async () => {
  const { fn, calls } = spy(proposal());
  const r = await previewDiaryTherapy({ text: USER_TEXT, entryDateTime: DAY }, fn);
  assert.equal(calls.length, 1);
  assert.equal(r.source, 'deterministic+ai');
  assert.equal(r.row.farmacoNome, 'TACHIPIRINA');
  assert.equal(r.row.dosaggio, '1000 mg');
  assert.deepEqual(r.row.orari, ['00:00', '08:00', '16:00']);
  assert.equal(r.row.stato, 'da_verificare');
  assert.ok(r.aiFields?.includes('farmacoNome'));
  assert.ok(r.aiFields?.includes('orari'));
  assert.ok(r.warnings.includes('proposta_ai'));
  assert.ok(!r.warnings.includes('testo_non_classificato'));
  assert.deepEqual(r.aiNotes, ['techipirina → TACHIPIRINA']);
});

test('AC2: deterministic fields are never overwritten by the AI', () => {
  const parsed = parseDiaryTherapyText('Ramipril 5 mg ore 8', DAY);
  const merged = mergeAiProposal(
    { ...parsed, row: { ...parsed.row, orari: [] } },
    proposal({ farmacoNome: 'ALTRO', dosaggio: '99 mg', orari: ['12:00'] }),
  );
  assert.equal(merged.row.farmacoNome, parsed.row.farmacoNome);
  assert.equal(merged.row.dosaggio, parsed.row.dosaggio);
  assert.deepEqual(merged.row.orari, ['12:00']);
  assert.deepEqual(merged.aiFields, ['orari']);
});

test('AC2: invalid AI values are discarded', () => {
  const p = parseAiProposal({
    farmacoNome: 'tachipirina',
    dosaggio: '1000 mg',
    viaSomministrazione: 'bocca',
    orari: ['8', '16.00', '24:00', '25:00', 'mattina', 8],
    dataInizio: 'domani',
    correzioni: 'non una lista',
  });
  assert.ok(p);
  assert.equal(p.farmacoNome, 'TACHIPIRINA');
  assert.equal(p.viaSomministrazione, '');
  assert.deepEqual(p.orari, ['00:00', '08:00', '16:00']);
  assert.equal(p.dataInizio, '');
  assert.deepEqual(p.correzioni, []);
  assert.equal(parseAiProposal(null), null);
  assert.equal(parseAiProposal(['x']), null);
  assert.equal(normalizeTime('7:5'), null);
});

test('AC3: AI failure or no answer → deterministic preview + ai_non_disponibile', async () => {
  for (const answer of [null, new Error('runtime down')]) {
    const r = await previewDiaryTherapy({ text: USER_TEXT, entryDateTime: DAY }, spy(answer).fn);
    assert.equal(r.source, 'deterministic');
    assert.ok(r.warnings.includes('ai_non_disponibile'));
    assert.equal(r.aiFields, undefined);
  }
});

test('AC4: blocking intents and fully parsed texts do not call the AI', async () => {
  for (const text of ['Sospendere Ramipril 5 mg', 'Somministrata tachipirina 1000 mg alle 8']) {
    const { fn, calls } = spy(proposal());
    const r = await previewDiaryTherapy({ text, entryDateTime: DAY }, fn);
    assert.equal(calls.length, 0, text);
    assert.equal(r.source, 'deterministic');
  }
  const full = parseDiaryTherapyText('Ramipril 5 mg ore 8', DAY);
  assert.equal(needsAiFallback(full), false);
  const { fn, calls } = spy(proposal());
  await previewDiaryTherapy({ text: 'Ramipril 5 mg ore 8', entryDateTime: DAY }, fn);
  assert.equal(calls.length, 0);
});

test('envelope errors still throw before any AI call', async () => {
  const { fn, calls } = spy(proposal());
  await assert.rejects(previewDiaryTherapy({ text: '' }, fn), /text obbligatorio/);
  await assert.rejects(previewDiaryTherapy({ text: 'x', extra: 1 }, fn), /Campo non consentito/);
  assert.equal(calls.length, 0);
});

test('fascia conflicts are recomputed on AI-proposed times', async () => {
  const { fn } = spy(proposal({ orari: ['08:00', '08:30'] }));
  const r = await previewDiaryTherapy({ text: USER_TEXT, entryDateTime: DAY }, fn);
  assert.deepEqual(r.row.orari, ['08:00', '08:30']);
  assert.ok(r.fasciaConflicts.length > 0);
});

test('prompt asks for JSON, forbids invention and carries the text; kill switch works', () => {
  const prompt = diaryTherapyAiPrompt(USER_TEXT, DAY);
  assert.match(prompt, /JSON/);
  assert.match(prompt, /Non inventare/);
  assert.ok(prompt.includes(USER_TEXT));
  const env = { AI_RUNTIME_URL: 'http://x', AI_RUNTIME_SERVICE_TOKEN: 't' };
  assert.equal(diaryTherapyAiEnabled(env), true);
  assert.equal(diaryTherapyAiEnabled({ ...env, DIARY_THERAPY_AI: 'off' }), false);
  assert.equal(diaryTherapyAiEnabled({}), false);
});
