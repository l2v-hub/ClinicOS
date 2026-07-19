// REQ-041 screenshots: voice write-action flow. Drives the REAL built frontend; the backend
// /ai/voice/* contract is mocked at the network boundary (no DB writes — execution logic is covered
// by backend unit tests). Usage: node e2e/req041-voice-shots.mjs <frontendUrl> <outDir>
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:4173';
const out = process.argv[3] ?? '.';
mkdirSync(out, { recursive: true });

const PATIENT = {
  id: 'p1',
  medicalRecordNumber: 'M1',
  firstName: 'Mario',
  lastName: 'Rossi',
  dateOfBirth: '1950-01-01',
  sex: 'M',
  phone: '0612345678',
  email: 'm.rossi@example.it',
  address: 'Via Vecchia 3',
};

// /ai/voice/plan responses keyed by what the transcript contains.
function planFor(transcript) {
  const t = (transcript || '').toLowerCase();
  if (t.includes('per mario rossi') || t.includes('rossi'))
    return {
      plan: {
        actionType: 'create_vital_sign',
        patientId: null,
        idempotencyKey: 'idem-amb',
        sourceTranscript: transcript,
      },
      preview: {
        actionType: 'create_vital_sign',
        patientId: null,
        title: 'Aggiungi parametro',
        lines: [
          { label: 'Parametro', value: 'Pressione arteriosa' },
          { label: 'Valore', value: '130/80 mmHg' },
          { label: 'Orario', value: '09:00' },
        ],
        ambiguities: ['Paziente non identificato con certezza'],
        canExecute: false,
        warnings: [],
      },
    };
  if (t.includes('pressione'))
    return {
      plan: {
        actionType: 'create_vital_sign',
        patientId: 'p1',
        idempotencyKey: 'idem-vital',
        sourceTranscript: transcript,
      },
      preview: {
        actionType: 'create_vital_sign',
        patientId: 'p1',
        patientName: 'Rossi Mario',
        title: 'Aggiungi parametro',
        lines: [
          { label: 'Parametro', value: 'Pressione arteriosa' },
          { label: 'Valore', value: '130/80 mmHg' },
          { label: 'Orario', value: '09:00' },
        ],
        ambiguities: [],
        canExecute: true,
        warnings: [],
      },
    };
  if (t.includes('telefono'))
    return {
      plan: {
        actionType: 'update_patient_demographics',
        patientId: 'p1',
        idempotencyKey: 'idem-demo',
        sourceTranscript: transcript,
      },
      preview: {
        actionType: 'update_patient_demographics',
        patientId: 'p1',
        patientName: 'Rossi Mario',
        title: 'Modifica dato anagrafico',
        lines: [
          { label: 'Campo', value: 'Telefono' },
          { label: 'Valore attuale', value: '0612345678' },
          { label: 'Nuovo valore', value: '0698765432' },
        ],
        ambiguities: [],
        canExecute: true,
        warnings: [],
      },
    };
  if (t.includes('anamnesi'))
    return {
      plan: {
        actionType: 'update_narrative_section',
        patientId: 'p1',
        idempotencyKey: 'idem-narr',
        sourceTranscript: transcript,
      },
      preview: {
        actionType: 'update_narrative_section',
        patientId: 'p1',
        patientName: 'Rossi Mario',
        title: 'Aggiorna sezione narrativa',
        lines: [{ label: 'Sezione', value: 'ANAMNESIS' }],
        diff: {
          current: 'Ipertensione in trattamento.',
          proposed: 'paziente iperteso noto',
          resulting: 'Ipertensione in trattamento.\npaziente iperteso noto',
        },
        ambiguities: [],
        canExecute: true,
        warnings: [],
      },
    };
  // ambiguous: spoken patient but none in context
  return {
    plan: {
      actionType: 'create_vital_sign',
      patientId: null,
      idempotencyKey: 'idem-amb',
      sourceTranscript: transcript,
    },
    preview: {
      actionType: 'create_vital_sign',
      patientId: null,
      title: 'Aggiungi parametro',
      lines: [
        { label: 'Parametro', value: 'Pressione arteriosa' },
        { label: 'Valore', value: '130/80 mmHg' },
        { label: 'Orario', value: '09:00' },
      ],
      ambiguities: ['Paziente non identificato con certezza'],
      canExecute: false,
      warnings: [],
    },
  };
}

async function mock(p) {
  await p.route('**/*', async (r) => {
    const u = r.request().url(),
      m = r.request().method();
    const j = (x, s = 200) =>
      r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(x) });
    if (u.includes('/ai/voice/stt'))
      return j({
        available: false,
        model: null,
        degraded: true,
        reason: 'AI_STT_MODEL non configurato',
      });
    if (u.includes('/ai/voice/plan') && m === 'POST') {
      const body = JSON.parse(r.request().postData() || '{}');
      return j(planFor(body.transcript));
    }
    if (u.includes('/ai/voice/execute') && m === 'POST')
      return j({
        ok: true,
        actionType: 'create_vital_sign',
        recordId: 'rec-1',
        message: 'Parametro registrato.',
        deduped: false,
      });
    if (u.match(/\/patients(\?|$)/)) return j([PATIENT]);
    if (u.includes('/patients/settings')) return j({ allowDelete: false });
    return r.continue();
  });
}

async function openVoice(p) {
  await p.locator('.voice-fab').click();
  await p.waitForSelector('.voice-drawer', { timeout: 5000 });
}
async function typeAndVerify(p, text) {
  const ta = p.locator('#voice-transcript');
  await ta.fill(text);
  await p.getByRole('button', { name: 'Verifica comando' }).click();
  await p.waitForSelector('.voice-preview, .ai-asst__refusal', { timeout: 5000 });
  await p.waitForTimeout(250);
}
const shot = (p, name) => p.locator('.voice-drawer').screenshot({ path: resolve(out, name) });

const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
let fail = 0;
try {
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    permissions: ['microphone'],
  });
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.accept());
  await mock(p);
  await p.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(500);
  await p.getByText('Operatore', { exact: true }).click();
  await p.waitForTimeout(700);

  // 1) recording state (mic permission granted via fake device)
  await openVoice(p);
  await p.getByRole('button', { name: /Parla/ }).click();
  await p.waitForSelector('.voice-state--registrazione', { timeout: 2000 }).catch(() => {});
  await shot(p, 'voice-recording.png');

  // 2) transcription ready (transcript filled, awaiting verify)
  await p.locator('#voice-transcript').fill('Registra pressione 130 su 80 alle 9:00');
  await p.waitForTimeout(150);
  await shot(p, 'voice-transcription.png');

  // 3) vital sign preview
  await p.getByRole('button', { name: 'Verifica comando' }).click();
  await p.waitForSelector('.voice-preview', { timeout: 5000 });
  await p.waitForTimeout(250);
  await shot(p, 'voice-vital-sign-preview.png');

  // 4) confirmed
  await p.getByRole('button', { name: 'Conferma e salva' }).click();
  await p.waitForSelector('.voice-done', { timeout: 5000 });
  await p.waitForTimeout(200);
  await shot(p, 'voice-vital-sign-confirmed.png');

  // 5) demographic update preview
  await p.getByRole('button', { name: 'Annulla' }).click();
  await typeAndVerify(p, 'Modifica il numero di telefono del paziente con 0698765432');
  await shot(p, 'voice-demographic-update-preview.png');

  // 6) narrative update preview (current / added / resulting)
  await p.getByRole('button', { name: 'Annulla' }).click();
  await typeAndVerify(p, 'Aggiorna la sezione Anamnesi aggiungendo paziente iperteso noto');
  await shot(p, 'voice-narrative-update-preview.png');

  // 7) ambiguous patient (confirm disabled)
  await p.getByRole('button', { name: 'Annulla' }).click();
  await typeAndVerify(p, 'Registra pressione 130 su 80 alle 9:00 per Mario Rossi');
  await shot(p, 'voice-patient-ambiguous.png');
  const confirmDisabled = await p.getByRole('button', { name: 'Conferma e salva' }).isDisabled();
  console.log('ambiguous → confirm disabled:', confirmDisabled);
  if (!confirmDisabled) fail = 1;

  // 8) permission denied — a SEPARATE browser WITHOUT the fake-media flags, so the mic request is
  //    actually rejected (the launch-level fake-ui flag would otherwise auto-grant it).
  const browserNoMic = await chromium.launch();
  const ctx2 = await browserNoMic.newContext({ viewport: { width: 1366, height: 768 } });
  const p2 = await ctx2.newPage();
  await mock(p2);
  await p2.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await p2.waitForTimeout(500);
  await p2.getByText('Operatore', { exact: true }).click();
  await p2.waitForTimeout(500);
  await openVoice(p2);
  await p2.getByRole('button', { name: /Parla/ }).click();
  await p2.waitForSelector('.voice-state--permesso-negato', { timeout: 5000 }).catch(() => {});
  await p2.waitForTimeout(200);
  await p2
    .locator('.voice-drawer')
    .screenshot({ path: resolve(out, 'voice-permission-denied.png') });
  const deniedShown = await p2.locator('.voice-state--permesso-negato').count();
  console.log('permission-denied state shown:', deniedShown > 0);
  if (!deniedShown) fail = 1;
  await browserNoMic.close();

  // tablet viewport: vital preview
  const ctxT = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    permissions: ['microphone'],
  });
  const pt = await ctxT.newPage();
  await mock(pt);
  await pt.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await pt.waitForTimeout(500);
  await pt.getByText('Operatore', { exact: true }).click();
  await pt.waitForTimeout(500);
  await openVoice(pt);
  await pt.locator('#voice-transcript').fill('Registra pressione 130 su 80 alle 9:00');
  await pt.getByRole('button', { name: 'Verifica comando' }).click();
  await pt.waitForSelector('.voice-preview', { timeout: 5000 });
  await pt.waitForTimeout(250);
  await pt
    .locator('.voice-drawer')
    .screenshot({ path: resolve(out, 'voice-vital-sign-preview-tablet.png') });

  console.log('done');
} catch (e) {
  fail = 1;
  console.log('FAILED:', e.message);
} finally {
  await browser.close();
}
process.exit(fail);
