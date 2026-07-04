import { useCallback, useState } from 'react';
import { API_URL } from '../../../config';
import type { AssistantAnswer } from '../AIAssistantButton';

// 015 AGNOS — unified chatbot (read + CRU write actions, delete escluso).
// Contract: specs/015-agnos-unified-cru/contracts/agnos-api.md
//   POST /ai/actions/plan    { text, channel:'testo'|'voce', currentPatientId }
//   POST /ai/actions/execute { text, channel:'testo'|'voce', patientId, idempotencyKey, confirmed:true }
// The plan is ALWAYS re-derived server-side from the text; the client only
// carries the original text + a client-generated idempotencyKey (created at
// preview time, so retrying "Conferma" never duplicates the write).
// US3: a dictated command flows through the SAME path with channel:'voce';
// the channel is captured at plan time and re-sent unchanged at execute time.

export type AgnosChannel = 'testo' | 'voce';

export interface AgnosPreview {
  title: string;
  patientName?: string;
  lines: Array<{ label: string; value: string }>;
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
  read?: AssistantAnswer;
  preview?: AgnosPreview;
  plan?: AgnosPlan;
  status?: AgnosTurnStatus;
}

export interface AgnosPending {
  /** Original command text — re-sent to /execute (plan re-derived server-side). */
  text: string;
  /** Canale di origine del comando ('voce' se dettato): riusato invariato all'execute. */
  channel: AgnosChannel;
  patientId: string | null;
  /** Generated at preview time so a retried confirm is deduped server-side. */
  idempotencyKey: string;
  /** Index of the agnos turn holding the preview card. */
  turnIndex: number;
}

interface UseAgnosChatOptions {
  operatorId?: string;
  operatorRole?: string;
  operatorName?: string;
  currentPatientId?: string;
  /** SPEC-015 US4: receives the executed actionType so the app can refresh the right data
   *  (cartella for clinical writes, agenda for create/update_appointment). */
  onExecuted?: (info: { actionType?: string }) => void;
}

interface ApiError { error?: { kind?: string; message?: string } }

const ERROR_KIND_LABEL: Record<string, string> = {
  feature_disabled: 'Le azioni AI sono disabilitate.',
  not_in_catalog: 'Azione non prevista dal catalogo Agnos.',
  delete_forbidden: 'Agnos non può eliminare dati: usa il comando nell’interfaccia.',
  not_executable: 'Comando non eseguibile.',
  ambiguous: 'Il comando è ambiguo: riformulalo con più dettagli.',
  confirmation_required: 'L’operazione richiede conferma esplicita.',
};

/** Contract sends lines as [label, value] tuples; be tolerant of {label,value} too. */
function normalizeLines(raw: unknown): Array<{ label: string; value: string }> {
  if (!Array.isArray(raw)) return [];
  return raw.map((l) => {
    if (Array.isArray(l)) return { label: String(l[0] ?? ''), value: String(l[1] ?? '') };
    const o = l as { label?: unknown; value?: unknown };
    return { label: String(o?.label ?? ''), value: String(o?.value ?? '') };
  });
}

function errorMessage(data: ApiError | undefined, fallback: string): string {
  const kind = data?.error?.kind;
  return data?.error?.message || (kind && ERROR_KIND_LABEL[kind]) || fallback;
}

function markCancelled(t: AgnosTurn[], index: number): AgnosTurn[] {
  return t.map((x, i) => (i === index && x.status === 'in-conferma' ? { ...x, status: 'annullato' as const } : x));
}

export function useAgnosChat({ operatorId, operatorRole, operatorName, currentPatientId, onExecuted }: UseAgnosChatOptions) {
  const [turns, setTurns] = useState<AgnosTurn[]>([]);
  const [pending, setPending] = useState<AgnosPending | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (operatorId) h['X-Operator-Id'] = operatorId;
    if (operatorRole) h['X-Operator-Role'] = operatorRole;
    if (operatorName) h['X-Operator-Name'] = operatorName;
    return h;
  }, [operatorId, operatorRole, operatorName]);

  /** Patch the agnos turn at `index` (used to resolve the loading placeholder). */
  const patchTurn = useCallback((index: number, patch: Partial<AgnosTurn>) => {
    setTurns((t) => t.map((x, i) => (i === index ? { ...x, ...patch } : x)));
  }, []);

  const cancelPending = useCallback(() => {
    if (!pending) return;
    const idx = pending.turnIndex;
    setTurns((t) => [...markCancelled(t, idx), { role: 'agnos', text: 'Operazione annullata. Nessun dato è stato salvato.' }]);
    setPending(null);
    setError(null);
  }, [pending]);

  const sendCommand = useCallback(async (rawText: string, channel: AgnosChannel = 'testo') => {
    const text = rawText.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    // A new command supersedes any preview still waiting for confirmation.
    // `busy` guards concurrency, so the closure state is the current state.
    const base = pending ? markCancelled(turns, pending.turnIndex) : turns;
    if (pending) setPending(null);
    const agnosIndex = base.length + 1;
    setTurns([...base, { role: 'utente', text }, { role: 'agnos', status: 'attesa' }]);
    try {
      const res = await fetch(`${API_URL}/ai/actions/plan`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ text, channel, currentPatientId }),
      });
      const data = await res.json() as ApiError & {
        plan?: AgnosPlan;
        preview?: (Omit<AgnosPreview, 'lines'> & { lines?: unknown }) | null;
        read?: AssistantAnswer | null;
      };
      if (!res.ok) {
        const msg = errorMessage(data, 'Comando non interpretabile.');
        setError(msg);
        patchTurn(agnosIndex, { status: 'errore', text: msg });
        return;
      }
      const plan = data.plan;
      const refused = !!plan && (plan.actionType === 'refused_delete' || plan.actionType === 'refused_forbidden' || plan.actionType.startsWith('refuse'));
      const refusalText = data.preview?.refusal || (refused ? plan?.refusalReason : undefined);
      if (refusalText || refused) {
        patchTurn(agnosIndex, {
          status: 'rifiuto',
          plan,
          text: refusalText || 'Agnos non può eseguire questa operazione: usa il comando nell’interfaccia.',
        });
        return;
      }
      if (data.read) {
        patchTurn(agnosIndex, { status: undefined, read: data.read, plan });
        return;
      }
      if (data.preview) {
        const preview: AgnosPreview = {
          title: data.preview.title,
          patientName: data.preview.patientName,
          lines: normalizeLines(data.preview.lines),
          warnings: data.preview.warnings ?? [],
          ambiguities: data.preview.ambiguities ?? [],
          canExecute: data.preview.canExecute === true,
        };
        patchTurn(agnosIndex, { status: 'in-conferma', preview, plan });
        setPending({
          text,
          channel,
          patientId: plan?.patientId ?? currentPatientId ?? null,
          idempotencyKey: crypto.randomUUID(),
          turnIndex: agnosIndex,
        });
        return;
      }
      const msg = 'Risposta non riconosciuta dal servizio Agnos.';
      setError(msg);
      patchTurn(agnosIndex, { status: 'errore', text: msg });
    } catch {
      const msg = 'Errore di rete: comando non inviato.';
      setError(msg);
      patchTurn(agnosIndex, { status: 'errore', text: msg });
    } finally {
      setBusy(false);
    }
  }, [busy, turns, pending, currentPatientId, headers, patchTurn]);

  const confirmPending = useCallback(async () => {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    const { text, channel, patientId, idempotencyKey, turnIndex } = pending;
    try {
      const res = await fetch(`${API_URL}/ai/actions/execute`, {
        method: 'POST',
        headers: headers(),
        // L'esecuzione confermata di un comando dettato resta channel:'voce'.
        body: JSON.stringify({ text, channel, patientId, idempotencyKey, confirmed: true }),
      });
      const data = await res.json() as ApiError & { ok?: boolean; message?: string; deduped?: boolean; actionType?: string };
      if (!res.ok || !data.ok) {
        const msg = errorMessage(data, 'Operazione non salvata.');
        setError(msg);
        setTurns((t) => [...t, { role: 'agnos', status: 'errore', text: msg }]);
        return;
      }
      setTurns((t) => [
        ...t.map((x, i) => (i === turnIndex ? { ...x, status: 'eseguito' as const } : x)),
        {
          role: 'agnos',
          status: 'successo',
          text: data.deduped ? 'Operazione già registrata (nessun duplicato).' : (data.message || 'Salvato.'),
        },
      ]);
      setPending(null);
      onExecuted?.({ actionType: data.actionType });
    } catch {
      const msg = 'Errore di rete: l’operazione non è stata salvata.';
      setError(msg);
      setTurns((t) => [...t, { role: 'agnos', status: 'errore', text: msg }]);
    } finally {
      setBusy(false);
    }
  }, [pending, busy, headers, onExecuted]);

  /** "Modifica": drop the pending preview without the cancel message; caller refills the input. */
  const dismissPendingForEdit = useCallback((): { text: string; channel: AgnosChannel } | null => {
    if (!pending) return null;
    const { text, channel, turnIndex } = pending;
    setTurns((t) => markCancelled(t, turnIndex));
    setPending(null);
    setError(null);
    return { text, channel };
  }, [pending]);

  return { turns, pending, busy, error, sendCommand, confirmPending, cancelPending, dismissPendingForEdit };
}
