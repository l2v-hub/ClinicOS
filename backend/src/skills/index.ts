// Default Skill layer wiring: the real Tool Registry, the in-process workflow store and the Agno
// interpreter (deterministic fallback when the runtime is not configured or unavailable).

import { defaultToolRegistry } from '../tools/index.js';
import type { SpeechToTextProvider } from '../voice/stt.js';
import type { SkillEngineDeps } from './engine.js';
import type { SkillInvoke } from './executors.js';
import { createAgnoInterpreter } from './interpreter.js';
import { createMemoryWorkflowStore } from './store.js';

let invokeWrapper: ((invoke: SkillInvoke) => SkillInvoke) | null = null;
let sttProvider: SpeechToTextProvider | null = null;

/**
 * Test sandbox hook (like setAuditPersistence): wraps the REAL Tool Layer invoker to simulate a
 * backend failure. Authorization, validation and business logic still run for every call that
 * the wrapper lets through. Pass null to restore.
 */
export function setSkillInvokeWrapper(wrapper: ((invoke: SkillInvoke) => SkillInvoke) | null) {
  invokeWrapper = wrapper;
}

/**
 * Test sandbox hook: replace the speech-to-text provider (fake transcripts, provider outage).
 * Pass null to restore the AI runtime provider.
 */
export function setSttProvider(provider: SpeechToTextProvider | null) {
  sttProvider = provider;
}

export const defaultSkillDeps: SkillEngineDeps = {
  registry: defaultToolRegistry,
  store: createMemoryWorkflowStore(),
  interpreter: createAgnoInterpreter(),
  get wrapInvoke() {
    return invokeWrapper ?? undefined;
  },
  get stt() {
    return sttProvider ?? undefined;
  },
};
