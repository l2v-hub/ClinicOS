import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '../../../config';
import type { AssistantAnswer, AssistantNav } from '../AIAssistantButton';
import { operatorHeaders } from '../../../lib/operatorSession';
import { navigationScope, readActionNavigation, writeActionNavigation } from './agnosActionNavigation';
import { createAgnosRequestGate } from './agnosRequestGate';

export type AgnosChannel = 'testo' | 'voce';
export type AgnosAgent = 'facility' | 'clinical';
export interface AgnosPreview {
  title: string;
  patientName?: string;
  lines: Array<{ label: string; value: string }>;
  diff?: { current: string; proposed: string; resulting: string };
  warnings: string[];
  ambiguities: string[];
  canExecute: boolean;
  refusal?: string;
}
export interface AgnosPlan {
  actionType: string;
  kind?: string;
  patientId?: string | null;
  requiresConfirmation?: boolean;
  refusalReason?: string;
}
export type AgnosTurnStatus = 'attesa' | 'errore' | 'rifiuto' | 'in-conferma' | 'eseguito' | 'annullato' | 'successo';
export interface AgnosTurn {
  role: 'utente' | 'agnos';
  text?: string;
  channel?: AgnosChannel;
  read?: AssistantAnswer;
  preview?: AgnosPreview;
  plan?: AgnosPlan;
  status?: AgnosTurnStatus;
}
export interface AgnosPending {
  text: string;
  channel: AgnosChannel;
  patientId: string | null;
  idempotencyKey: string;
  turnIndex: number;
  actionType?: string;
  navigation: AssistantNav | null;
  navigationReady: boolean;
  canExecute: boolean;
  uncertain?: boolean;
}
export interface AgnosOperatorIdentity { operatorId?: string; operatorRole?: string; operatorName?: string }
export function buildAgnosHeaders(id: AgnosOperatorIdentity): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...operatorHeaders() };
  if (id.operatorId) h['X-Operator-Id'] = id.operatorId;
  if (id.operatorRole) h['X-Operator-Role'] = id.operatorRole;
  if (id.operatorName) h['X-Operator-Name'] = id.operatorName;
  return h;
}
export interface AgnosExecution { actionType?: string; patientId?: string | null }
interface UseAgnosChatOptions extends AgnosOperatorIdentity {
  currentPatientId?: string;
  navKey?: string;
  onExecuted?: (info: AgnosExecution) => void | Promise<void>;
  onNavigate?: (nav: AssistantNav, signal?: AbortSignal) => Promise<boolean>;
}
export type AgnosPhase = 'idle' | 'planning' | 'navigating' | 'approval' | 'executing' | 'success' | 'error';
interface ApiError { error?: { kind?: string; message?: string } }
const PRE_WRITE_DENIALS = new Set(['feature_disabled', 'writes_disabled', 'not_in_catalog', 'delete_forbidden',
  'not_executable', 'ambiguous', 'confirmation_required', 'slot_conflict', 'unauthorized', 'forbidden',
  'tenant_isolation', 'cross_patient_disabled', 'not_found', 'bad_request']);
export function isDefinitiveAgnosDenial(status: number, data: ApiError | null): boolean {
  return status >= 400 && status < 500 && PRE_WRITE_DENIALS.has(data?.error?.kind ?? '');
}
const ERROR_KIND_LABEL: Record<string, string> = {
  feature_disabled: 'Le azioni AI sono disabilitate.',
  not_in_catalog: 'Azione non prevista dal catalogo dell’assistente.',
  delete_forbidden: 'L’assistente non può eliminare dati: usa il comando nell’interfaccia.',
  not_executable: 'Comando non eseguibile.',
  ambiguous: 'Il comando è ambiguo: riformulalo con più dettagli.',
  confirmation_required: 'L’operazione richiede conferma esplicita.',
};
function errorMessage(data: ApiError | undefined, fallback: string): string {
  const kind = data?.error?.kind;
  return data?.error?.message || (kind && ERROR_KIND_LABEL[kind]) || fallback;
}
export function normalizeAgnosPreview(raw: Partial<AgnosPreview> & { lines?: unknown }): AgnosPreview {
  const lines = Array.isArray(raw.lines) ? raw.lines.map((line) => {
    if (Array.isArray(line)) return { label: String(line[0] ?? ''), value: String(line[1] ?? '') };
    const value = line as { label?: unknown; value?: unknown } | null;
    return { label: String(value?.label ?? ''), value: String(value?.value ?? '') };
  }) : [];
  const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
  const diff = raw.diff && ['current', 'proposed', 'resulting'].every((key) => typeof raw.diff?.[key as keyof typeof raw.diff] === 'string')
    ? raw.diff : undefined;
  const ambiguities = strings(raw.ambiguities);
  return { title: raw.title || 'Operazione proposta', patientName: raw.patientName, lines, diff,
    warnings: strings(raw.warnings), ambiguities,
    canExecute: raw.canExecute === true && ambiguities.length === 0 && (lines.length > 0 || !!diff?.proposed) };
}
const markCancelled = (turns: AgnosTurn[], index: number) => turns.map((turn, i) =>
  i === index && turn.status === 'in-conferma' ? { ...turn, status: 'annullato' as const } : turn);
const contextKey = (options: Pick<UseAgnosChatOptions, 'operatorId' | 'operatorRole' | 'currentPatientId' | 'navKey'>) =>
  JSON.stringify([options.operatorId, options.operatorRole, options.currentPatientId, options.navKey]);

export function useAgnosChat(options: UseAgnosChatOptions) {
  const [turns, setTurns] = useState<AgnosTurn[]>([]);
  const [pending, setPending] = useState<AgnosPending | null>(null);
  const [phase, setPhase] = useState<AgnosPhase>('idle');
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const gate = useRef(createAgnosRequestGate());
  const live = useRef(options);
  live.current = options;
  const turnsRef = useRef(turns); turnsRef.current = turns;
  const pendingRef = useRef(pending); pendingRef.current = pending;
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const currentContext = contextKey(options);
  const previousContext = useRef(currentContext);
  const previousActor = useRef(JSON.stringify([options.operatorId, options.operatorRole]));
  const expectedContext = useRef<string | null>(null);
  const setProposal = (value: AgnosPending | null) => { pendingRef.current = value; setPending(value); };
  const setStage = (value: AgnosPhase, text: string) => { phaseRef.current = value; setPhase(value); setStatusText(text); };
  const patchTurn = (index: number, patch: Partial<AgnosTurn>) =>
    setTurns((list) => list.map((turn, i) => i === index ? { ...turn, ...patch } : turn));

  useEffect(() => {
    if (previousContext.current === currentContext) return;
    previousContext.current = currentContext;
    if (expectedContext.current === currentContext) { expectedContext.current = null; return; }
    const wasSaving = phaseRef.current === 'executing';
    gate.current.cancel(); expectedContext.current = null;
    const proposal = pendingRef.current;
    setTurns((list) => (proposal ? markCancelled(list, proposal.turnIndex) : list).map((turn) =>
      turn.status === 'attesa' ? { ...turn, status: 'annullato', text: 'Richiesta annullata: contesto cambiato.' } : turn));
    setProposal(null);
    const actor = JSON.stringify([options.operatorId, options.operatorRole]);
    if (previousActor.current !== actor) { setTurns([]); previousActor.current = actor; }
    setError(null);
    setStage(wasSaving ? 'error' : 'idle', wasSaving
      ? 'Contesto cambiato durante il salvataggio. Verifica l’esito nella pagina del paziente.'
      : 'Contesto cambiato. Le proposte precedenti sono state annullate.');
  }, [currentContext, options.operatorId, options.operatorRole]);
  useEffect(() => () => gate.current.cancel(), []);

  async function navigateTo(nav: AssistantNav, request: { token: number; signal: AbortSignal }) {
    const { token, signal } = request;
    const snapshot = live.current;
    const expected = contextKey({ ...snapshot, ...navigationScope(nav, snapshot.operatorRole) });
    expectedContext.current = expected;
    setStage('navigating', `Apro ${nav.label}…`);
    try {
      signal.throwIfAborted();
      const opened = await snapshot.onNavigate?.(nav, signal);
      signal.throwIfAborted();
      if (!gate.current.current(token)) return false;
      if (!opened) throw new Error('Pagina non disponibile');
      return true;
    } catch {
      if (gate.current.current(token)) {
        expectedContext.current = null;
        setStage('error', 'Non riesco ad aprire la pagina richiesta. Riprova prima di confermare.');
      }
      return false;
    }
  }

  const cancelPending = useCallback(() => {
    if (gate.current.busy) return;
    const proposal = pendingRef.current;
    if (!proposal) return;
    setTurns((list) => [...markCancelled(list, proposal.turnIndex),
      { role: 'agnos', text: proposal.uncertain
        ? 'Conferma chiusa. Verifica nella pagina del paziente l’esito del tentativo precedente.'
        : 'Operazione annullata. Nessun dato è stato salvato.' }]);
    setProposal(null); setError(null); setStage('idle', 'Proposta annullata.');
  }, []);

  async function sendCommand(rawText: string, channel: AgnosChannel = 'testo') {
    const text = rawText.trim();
    if (!text) return;
    if (pendingRef.current?.uncertain) {
      setStage('error', 'Verifica prima l’esito riprovando la conferma della stessa richiesta.'); return;
    }
    const request = gate.current.begin();
    if (!request) return;
    const snapshot = live.current;
    setStage('planning', 'Sto interpretando la richiesta…'); setError(null);
    const old = pendingRef.current;
    const base = old ? markCancelled(turnsRef.current, old.turnIndex) : turnsRef.current;
    setProposal(null);
    const index = base.length + 1;
    setTurns([...base, { role: 'utente', text, channel }, { role: 'agnos', status: 'attesa' }]);
    try {
      const res = await fetch(`${API_URL}/ai/actions/plan`, {
        method: 'POST', headers: buildAgnosHeaders(snapshot), signal: request.signal,
        body: JSON.stringify({ text, channel, currentPatientId: snapshot.currentPatientId, navKey: snapshot.navKey }),
      });
      const data = await res.json() as ApiError & { plan?: AgnosPlan; preview?: AgnosPreview; read?: AssistantAnswer };
      request.signal.throwIfAborted();
      if (!gate.current.current(request.token)) return;
      if (!res.ok) throw new Error(errorMessage(data, 'Comando non interpretabile.'));
      const plan = data.plan;
      if (data.preview?.refusal || plan?.actionType.startsWith('refus')) {
        patchTurn(index, { status: 'rifiuto', plan, text: data.preview?.refusal || plan?.refusalReason || 'Azione non consentita.' });
        setStage('idle', 'Questa operazione non può essere eseguita dall’assistente.'); return;
      }
      if (data.read) {
        patchTurn(index, { status: undefined, read: data.read, plan });
        const nav = readActionNavigation(text, data.read);
        if (nav && !await navigateTo(nav, request)) return;
        if (gate.current.current(request.token)) setStage('success', nav ? `Pagina aperta: ${nav.label}.` : 'Risposta pronta.');
        return;
      }
      if (!data.preview) throw new Error('Risposta non riconosciuta dal servizio assistente.');
      const preview = normalizeAgnosPreview(data.preview);
      if (plan?.actionType === 'update_narrative_section' && !preview.diff?.proposed.trim()) preview.canExecute = false;
      const navigation = writeActionNavigation(plan);
      patchTurn(index, { status: 'in-conferma', preview, plan });
      const proposal: AgnosPending = {
        text, channel, patientId: plan?.patientId ?? null, idempotencyKey: crypto.randomUUID(), turnIndex: index,
        actionType: plan?.actionType, navigation, navigationReady: false, canExecute: preview.canExecute,
      };
      setProposal(proposal);
      if (!navigation) { setStage('error', 'Destinazione non disponibile. Modifica la richiesta prima di confermare.'); return; }
      if (!preview.canExecute) { setStage('approval', 'Completa o correggi i dati della proposta. Nessun dato salvato.'); return; }
      if (await navigateTo(navigation, request) && gate.current.current(request.token)) {
        setProposal({ ...proposal, navigationReady: true });
        setStage('approval', `Pagina aperta: ${navigation.label}. Controlla i dati e conferma per salvarli.`);
      }
    } catch (cause) {
      if (!gate.current.current(request.token)) return;
      const message = request.signal.aborted ? 'La risposta tarda ad arrivare. Riprova la richiesta.'
        : cause instanceof Error ? cause.message : 'Non riesco a interpretare la richiesta. Riprova.';
      patchTurn(index, { status: 'errore', text: message }); setError(message); setStage('error', message);
    } finally { gate.current.finish(request.token); }
  }

  async function retryNavigation() {
    const proposal = pendingRef.current;
    if (!proposal?.navigation) return false;
    const request = gate.current.begin(); if (!request) return false;
    setProposal({ ...proposal, navigationReady: false });
    let opened = false;
    if (await navigateTo(proposal.navigation, request) && gate.current.current(request.token)) {
      setProposal({ ...proposal, navigationReady: true });
      setStage('approval', `Pagina aperta: ${proposal.navigation.label}. Controlla i dati e conferma per salvarli.`);
      opened = true;
    }
    gate.current.finish(request.token);
    return opened;
  }

  async function confirmPending() {
    const proposal = pendingRef.current;
    if (!proposal?.canExecute || !proposal.navigationReady || !proposal.navigation) return;
    const snapshot = live.current;
    const destination = navigationScope(proposal.navigation, snapshot.operatorRole);
    if (snapshot.currentPatientId !== destination.currentPatientId || snapshot.navKey !== destination.navKey) {
      setProposal({ ...proposal, navigationReady: false });
      setStage('error', 'Riapri la pagina della proposta prima di confermare.'); return;
    }
    const request = gate.current.begin(45_000); if (!request) return;
    // The operator may have changed tabs within the same chart while reviewing.
    // Reopen the exact section before sending the approved write.
    if (!await navigateTo(proposal.navigation, request)) {
      if (gate.current.current(request.token)) setProposal({ ...proposal, navigationReady: false });
      gate.current.finish(request.token); return;
    }
    setStage('executing', 'Sto salvando i dati approvati…'); setError(null);
    const { text, channel, patientId, idempotencyKey, turnIndex } = proposal;
    let saved = false;
    try {
      // Original text + target + same retry identity. The server still derives/authorizes the plan.
      const res = await fetch(`${API_URL}/ai/actions/execute`, {
        method: 'POST', headers: buildAgnosHeaders(snapshot), signal: request.signal,
        body: JSON.stringify({ text, channel, patientId, navKey: snapshot.navKey, idempotencyKey, confirmed: true }),
      });
      const data = await res.json() as ApiError & { ok?: boolean; message?: string; deduped?: boolean; actionType?: string };
      request.signal.throwIfAborted();
      if (!gate.current.current(request.token)) return;
      if (!res.ok || data?.ok !== true) {
        // A server/proxy failure can arrive after the write committed. Only a
        // recognized pre-write denial is evidence that this attempt did not save.
        if (!isDefinitiveAgnosDenial(res.status, data)) throw new Error('Uncertain write result');
        const message = errorMessage(data, 'Operazione non completata. Controlla la proposta.');
        setTurns((list) => [...list, { role: 'agnos', status: 'errore', text: message }]);
        setError(message); setStage('error', message); return;
      }
      saved = true;
      patchTurn(turnIndex, { status: 'eseguito' }); setProposal(null);
      const message = data.deduped ? 'Operazione già registrata, senza duplicati.' : data.message || 'Dati salvati.';
      setTurns((list) => [...list, { role: 'agnos', status: 'successo', text: message }]);
      setStage('executing', 'Dati salvati. Aggiorno la pagina…');
      await snapshot.onExecuted?.({ actionType: data.actionType ?? proposal.actionType, patientId });
      if (gate.current.current(request.token)) setStage('success', 'Dati salvati. Puoi controllare il risultato nella pagina aperta.');
    } catch {
      if (!gate.current.current(request.token)) return;
      if (!saved) setProposal({ ...proposal, uncertain: true });
      const message = saved ? 'Dati salvati. Aggiorna la pagina per verificare il risultato.'
        : 'Non riesco a verificare l’esito del salvataggio. Riprova la conferma della stessa richiesta e verifica il risultato.';
      setTurns((list) => [...list, { role: 'agnos', status: 'errore', text: message }]);
      setError(message); setStage('error', message);
    } finally { gate.current.finish(request.token); }
  }

  const dismissPendingForEdit = useCallback((): { text: string; channel: AgnosChannel } | null => {
    if (gate.current.busy) return null;
    const proposal = pendingRef.current; if (!proposal) return null;
    if (proposal.uncertain) {
      setStage('error', 'Verifica prima l’esito riprovando la conferma della stessa richiesta.');
      return null;
    }
    setTurns((list) => markCancelled(list, proposal.turnIndex));
    setProposal(null); setError(null); setStage('idle', 'Modifica la richiesta e inviala di nuovo.');
    return { text: proposal.text, channel: proposal.channel };
  }, []);

  return { turns, pending, phase, statusText, busy: ['planning', 'navigating', 'executing'].includes(phase), error,
    sendCommand, confirmPending, cancelPending, dismissPendingForEdit, retryNavigation };
}
