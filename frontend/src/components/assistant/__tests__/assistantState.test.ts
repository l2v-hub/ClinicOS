import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDiaryTherapyText } from '../../../../../backend/src/therapies/diary-therapy-parse';
import type { AssistantPreview, AssistantSession, ConverseResponse } from '../assistantApi';
import {
  assistantReducer,
  canConfirm,
  canRetry,
  initialAssistantState,
  isActive,
  prescriptionPayload,
} from '../assistantState';

const session: AssistantSession = {
  identity: { id: 'SIM-NURSE-1', name: 'Infermiere 1' },
  role: { id: 'nurse', label: 'Infermiere' },
  residentScope: 'registered_by_me',
  confirmationPolicyVersion: 2,
  resident: { id: 'p1', label: 'Rossi Mario' },
  residentDenied: false,
  skills: [],
  starters: [{ skillId: 'vitals.record', label: 'Registra i parametri di questo ospite' }],
};

function preview(patch: Partial<AssistantPreview> = {}): AssistantPreview {
  return {
    previewId: '11111111-1111-4111-8111-111111111111',
    skillId: 'vitals.record',
    action: 'Registrazione parametri vitali',
    patient: { id: 'p1', label: 'Rossi Mario' },
    values: { Pressione: '120/80' },
    notes: [],
    warnings: [],
    origin: 'ai',
    tool: 'parameters.create_reading',
    confirmationClass: 'SENSITIVE_WRITE',
    actor: { name: 'Infermiere 1', role: 'nurse' },
    confirmable: true,
    editable: ['values'],
    ...patch,
  };
}

function response(patch: Partial<ConverseResponse> = {}): ConverseResponse {
  return {
    workflowId: 'wf-1',
    status: 'NEEDS_CONFIRMATION',
    skillId: 'vitals.record',
    reply: 'Anteprima',
    preview: preview(),
    ...patch,
  };
}

test('session: resident from the server, denied resident explained', () => {
  const s = assistantReducer(initialAssistantState, { type: 'session_loaded', session });
  assert.equal(s.resident?.label, 'Rossi Mario');
  const denied = assistantReducer(initialAssistantState, {
    type: 'session_loaded',
    session: { ...session, resident: null, residentDenied: true },
  });
  assert.equal(denied.resident, null);
  assert.match(denied.notice!.text, /non rientra/);
});

test('Conferma only for a confirmable preview, never while a request is in flight', () => {
  let s = assistantReducer(initialAssistantState, { type: 'response', response: response() });
  assert.equal(canConfirm(s), true);
  s = assistantReducer(s, { type: 'request_started', confirming: preview().previewId });
  assert.equal(s.busy, true);
  assert.equal(canConfirm(s), false, 'no double submit');
  const blocked = assistantReducer(initialAssistantState, {
    type: 'response',
    response: response({
      preview: preview({ confirmable: false, blockedReason: 'Mancano gli orari' }),
    }),
  });
  assert.equal(canConfirm(blocked), false, 'policy/backend says no → no Conferma');
  const clarifying = assistantReducer(initialAssistantState, {
    type: 'response',
    response: response({ status: 'NEEDS_CLARIFICATION', preview: null }),
  });
  assert.equal(canConfirm(clarifying), false);
});

test('results, not claims: lastVerified only on COMPLETED', () => {
  let s = assistantReducer(initialAssistantState, { type: 'response', response: response() });
  assert.equal(s.lastVerified, null);
  s = assistantReducer(s, {
    type: 'response',
    response: response({
      status: 'FAILED',
      preview: null,
      reply: 'Operazione NON eseguita: x. Puoi riprovare con «Riprova»: …',
    }),
  });
  assert.equal(s.lastVerified, null, 'a failure is never a result');
  assert.equal(canRetry(s.workflow), true);
  s = assistantReducer(s, {
    type: 'response',
    response: response({
      status: 'COMPLETED',
      preview: null,
      reply: 'Parametri registrati',
      result: { readingId: 'r1' },
    }),
  });
  assert.equal(s.lastVerified?.reply, 'Parametri registrati');
  assert.equal(isActive(s.workflow), false);
});

test('transport error → readable notice, busy released', () => {
  let s = assistantReducer(initialAssistantState, { type: 'request_started', userText: 'ciao' });
  s = assistantReducer(s, { type: 'request_failed', message: 'Servizio non raggiungibile' });
  assert.equal(s.busy, false);
  assert.equal(s.notice?.tone, 'error');
  assert.equal(s.transcript.at(-1)?.who, 'system');
});

test('resident change during an active workflow is announced', () => {
  let s = assistantReducer(initialAssistantState, { type: 'session_loaded', session });
  s = assistantReducer(s, { type: 'response', response: response() });
  s = assistantReducer(s, { type: 'resident_set', resident: { id: 'p2', label: 'Bianchi Anna' } });
  assert.match(s.notice!.text, /Ospite cambiato/);
  assert.equal(s.resident?.id, 'p2');
});

test('prescription payload uses the classic Terapia mapper; incomplete drafts are not confirmable', () => {
  const entryDateTime = '2026-09-30T10:00';
  const complete = {
    ...parseDiaryTherapyText('Paracetamolo 1000 mg 1 compressa per os alle 8 e alle 20', '2026-09-30'),
    source: 'deterministic',
  };
  const ok = prescriptionPayload(
    preview({
      skillId: 'therapy.prescribe',
      confirmationClass: 'HIGH_RISK',
      therapyDraft: { preview: complete as unknown as Record<string, unknown>, entryDateTime },
    }),
  );
  assert.deepEqual(ok.issues, []);
  assert.match(String(ok.therapy!.farmacoNome), /paracetamolo/i);
  assert.deepEqual(
    (ok.therapy!.schedules as { time: string }[]).map((s) => s.time),
    ['08:00', '20:00'],
  );
  const missing = prescriptionPayload(
    preview({
      skillId: 'therapy.prescribe',
      therapyDraft: {
        preview: {
          ...parseDiaryTherapyText('iniziare paracetamolo', '2026-09-30'),
          source: 'deterministic',
        } as unknown as Record<string, unknown>,
        entryDateTime,
      },
    }),
  );
  assert.equal(missing.therapy, null);
  assert.ok(missing.issues.length > 0);
});

test('QA H1/M1: context resident kept; prescription confirmable only once the payload is bound', async () => {
  const { therapyAttachment } = await import('../assistantState');
  let s = assistantReducer(initialAssistantState, { type: 'session_loaded', session: { ...session, resident: null } });
  s = assistantReducer(s, {
    type: 'response',
    response: response({ resident: { id: 'p9', label: 'Conti Nino' } }),
  });
  assert.equal(s.resident, null, 'the workflow target never becomes the context resident');
  const draftPreview = preview({
    skillId: 'therapy.prescribe',
    confirmationClass: 'HIGH_RISK',
    therapyBound: false,
    therapyDraft: {
      preview: {
        ...parseDiaryTherapyText('Paracetamolo 1000 mg 1 compressa per os alle 8 e alle 20', '2026-09-30'),
        source: 'deterministic',
      } as unknown as Record<string, unknown>,
      entryDateTime: '2026-09-30T10:00',
    },
  });
  const draft = assistantReducer(initialAssistantState, { type: 'response', response: response({ preview: draftPreview }) });
  assert.equal(canConfirm(draft), false, 'unbound prescription draft: no Conferma');
  assert.ok(therapyAttachment(response({ preview: draftPreview })), 'payload to attach');
  const boundPreview = { ...draftPreview, therapyBound: true };
  const bound = assistantReducer(initialAssistantState, { type: 'response', response: response({ preview: boundPreview }) });
  assert.equal(canConfirm(bound), true);
  assert.equal(therapyAttachment(response({ preview: boundPreview })), null, 'never re-attached');
});

test('Phase 5: a spoken/typed «conferma» on the same preview shows the server hint, not a new preview', () => {
  let s = assistantReducer(initialAssistantState, { type: 'response', response: response() });
  assert.match(s.transcript.at(-1)!.text, /^Anteprima pronta/);
  s = assistantReducer(s, { type: 'request_started', userText: 'Conferma.', source: 'voice' });
  assert.equal(s.transcript.at(-1)!.source, 'voice');
  s = assistantReducer(s, {
    type: 'response',
    response: response({ reply: 'Per confermare premi «Conferma» sull’anteprima.' }),
  });
  assert.equal(s.transcript.at(-1)!.text, 'Per confermare premi «Conferma» sull’anteprima.');
  const edited = assistantReducer(s, {
    type: 'response',
    response: response({ preview: preview({ previewId: '22222222-2222-4222-8222-222222222222' }) }),
  });
  assert.match(edited.transcript.at(-1)!.text, /^Anteprima pronta/, 'a new preview is announced');
});
