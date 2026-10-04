import assert from 'node:assert/strict';
import { test } from 'node:test';
import { interpretedPreviewSpeech, speakFeedback, stopSpeaking } from '../spokenStatus';
import type { AssistantPreview } from '../../assistantApi';
const preview: AssistantPreview = {
  previewId: 'synthetic-preview', skillId: 'vitals.record', action: 'Registra i parametri',
  patient: { id: 'synthetic-patient', label: 'Paziente Test' }, values: { Campo: 'Valore sintetico' },
  notes: [], warnings: ['Controlla i dati'], origin: 'ai', tool: 'parameters.create_reading',
  confirmationClass: 'SENSITIVE_WRITE', actor: { name: 'Operatore Test', role: 'nurse' },
  confirmable: true, editable: ['values'],
};
test('readback names the exact server action and values, asks explicit confirmation', () => {
  const text = interpretedPreviewSpeech(preview);
  assert.match(text, /Registra i parametri/);
  assert.match(text, /Campo: Valore sintetico/);
  assert.match(text, /Confermi il comando che ho interpretato\?/);
  assert.match(text, /Premi Conferma/);
});
test('blocked preview explains missing information and never asks to execute', () => {
  const text = interpretedPreviewSpeech({ ...preview, confirmable: false, blockedReason: 'Completa il campo richiesto' });
  assert.match(text, /Completa il campo richiesto/);
  assert.match(text, /Nessuna azione è stata eseguita/);
  assert.doesNotMatch(text, /Confermi|Premi Conferma/);
});
test('TTS prefers available local Italian voice, softer rate, cancellable; performs no request', () => {
  const spoken: Array<{ text: string; rate: number; voice: unknown }> = [];
  let cancelled = 0;
  const italian = { lang: 'it-IT', localService: true, name: 'Elsa Natural' };
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalUtterance = Object.getOwnPropertyDescriptor(globalThis, 'SpeechSynthesisUtterance');
  Object.assign(globalThis, { window: { speechSynthesis: {
    cancel() { cancelled++; }, getVoices() { return [{ lang: 'en-US', name: 'English' }, italian]; },
    speak(value: typeof spoken[number]) { spoken.push(value); },
  } }, SpeechSynthesisUtterance: class { constructor(public text: string) {} } });
  try {
    speakFeedback(interpretedPreviewSpeech(preview));
    assert.equal(spoken.length, 1); assert.equal(spoken[0].voice, italian); assert.equal(spoken[0].rate, .92);
    stopSpeaking(); assert.equal(cancelled, 2);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (originalUtterance) Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', originalUtterance); else Reflect.deleteProperty(globalThis, 'SpeechSynthesisUtterance');
  }
});
