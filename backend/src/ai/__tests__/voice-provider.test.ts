// Issue #201: deterministic STT provider tests using the fake — no live credentials, no network.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeVoiceSttProvider, probeSttStatus } from '../voice/provider.js';
import { REQUIRED_STT_CAPABILITIES, loadVoiceConfig, type VoiceConfig } from '../voice/config.js';

const cfgWithModel: VoiceConfig = { ...loadVoiceConfig({} as NodeJS.ProcessEnv), sttModel: 'fake:stt-it' };
const cfgNoModel: VoiceConfig = { ...loadVoiceConfig({} as NodeJS.ProcessEnv), sttModel: null };

// ── AC1/AC3: everything below uses only the fake — no env, no secrets, no network ────────────────

test('#201 success: fake advertising required capabilities → available, not degraded', async () => {
  const provider = new FakeVoiceSttProvider({ mode: 'success' });
  const status = await probeSttStatus(provider, cfgWithModel, { timeoutMs: 50 });
  assert.equal(status.available, true);
  assert.equal(status.degraded, false);
  assert.equal(status.model, 'fake:stt-it');
});

test('#201 failure: fake rejecting → degraded with provider reason, never throws', async () => {
  const provider = new FakeVoiceSttProvider({ mode: 'failure', error: new Error('401 unauthorized') });
  const status = await probeSttStatus(provider, cfgWithModel, { timeoutMs: 50 });
  assert.equal(status.available, false);
  assert.equal(status.degraded, true);
  assert.match(status.reason ?? '', /provider STT non disponibile/i);
  assert.match(status.reason ?? '', /401 unauthorized/);
});

test('#201 timeout: fake that never resolves → degraded with timeout reason', async () => {
  const provider = new FakeVoiceSttProvider({ mode: 'timeout' });
  const status = await probeSttStatus(provider, cfgWithModel, { timeoutMs: 10 });
  assert.equal(status.available, false);
  assert.equal(status.degraded, true);
  assert.match(status.reason ?? '', /timeout STT/i);
});

test('#201 missing capabilities: success but incomplete set → degraded listing what is missing', async () => {
  const provider = new FakeVoiceSttProvider({ mode: 'success', capabilities: ['audio_input'] });
  const status = await probeSttStatus(provider, cfgWithModel, { timeoutMs: 50 });
  assert.equal(status.available, false);
  assert.equal(status.degraded, true);
  assert.match(status.reason ?? '', /capability mancanti/i);
  // the two missing required capabilities are named
  for (const c of REQUIRED_STT_CAPABILITIES.filter((x) => x !== 'audio_input')) {
    assert.match(status.reason ?? '', new RegExp(c));
  }
});

test('#201 no model configured: degraded regardless of provider (no probe attempted)', async () => {
  // A provider that would throw if probed proves probeSttStatus short-circuits on missing config.
  const provider = new FakeVoiceSttProvider({ mode: 'failure', error: new Error('should not be called') });
  const status = await probeSttStatus(provider, cfgNoModel, { timeoutMs: 50 });
  assert.equal(status.available, false);
  assert.equal(status.degraded, true);
  assert.match(status.reason ?? '', /AI_STT_MODEL non configurato/);
});
