import type { CartellaPaziente, TemporaryPsExit, UscitaLog } from '../types';
import { API_URL } from '../config';
import { operatorHeaders, getCurrentOperator } from './operatorSession';

export const TEMPORARY_PS_EXIT_CHANGED = 'clinicos:temporary-ps-exit-changed';
export type TemporaryPsExitCommand =
  | {
      action: 'depart';
      decision: 'pause' | 'continue';
      reason: string;
      requestId: string;
      confirmed: true;
    }
  | { action: 'return'; exitId: string; requestId: string; confirmed: true };
export function parseTemporaryPsExit(value: unknown): TemporaryPsExit | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || Array.isArray(value))
    throw new Error('Stato uscita PS non valido.');
  const data = value as Record<string, unknown>;
  if (
    Object.keys(data).some((key) => !['exitId', 'decision', 'departedAt'].includes(key)) ||
    typeof data.exitId !== 'string' ||
    !data.exitId ||
    !['pause', 'continue'].includes(String(data.decision)) ||
    typeof data.departedAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      data.departedAt,
    ) ||
    !Number.isFinite(Date.parse(data.departedAt))
  )
    throw new Error('Stato uscita PS non valido.');
  return {
    exitId: data.exitId,
    decision: data.decision as 'pause' | 'continue',
    departedAt: data.departedAt,
  };
}
export async function saveTemporaryPsExit(
  patientId: string,
  command: TemporaryPsExitCommand,
): Promise<CartellaPaziente> {
  const actorId = getCurrentOperator()?.id;
  if (!actorId) throw new Error('Sessione non verificata.');
  let response: Response;
  try {
    response = await fetch(`${API_URL}/patients/${encodeURIComponent(patientId)}/cartella`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
      body: JSON.stringify({ temporaryPsExit: command }),
    });
  } catch {
    throw new Error(
      'Esito non verificato. Riprova la stessa decisione per recuperarne la conferma.',
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(body?.error || 'Registrazione non verificata. Riprova la stessa decisione.');
  if (
    body?.patientId !== patientId ||
    !body.data ||
    typeof body.data !== 'object' ||
    Array.isArray(body.data)
  )
    throw new Error('Conferma incompleta. Riprova la stessa decisione.');
  parseTemporaryPsExit(body.data.liberatoria?.temporaryPsExit);
  const chart = { ...body.data, pazienteId: patientId } as CartellaPaziente;
  verifyTemporaryPsExitReceipt(chart, patientId, actorId, command);
  return chart;
}

export function verifyTemporaryPsExitReceipt(
  chart: CartellaPaziente,
  patientId: string,
  actorId: string,
  command: TemporaryPsExitCommand,
): UscitaLog {
  const rows = chart.pazienteId === patientId && chart.liberatoria?.usciteLog;
  const entry =
    Array.isArray(rows) &&
    rows.find((row) =>
      command.action === 'depart'
        ? row.psExit?.requestId === command.requestId &&
          row.psExit.actorId === actorId &&
          row.psExit.decision === command.decision &&
          row.note === command.reason
        : row.id === command.exitId &&
          row.psExit?.returnRequestId === command.requestId &&
          row.psExit.returnActorId === actorId,
    );
  const at =
    entry && (command.action === 'depart' ? entry.psExit?.departedAt : entry.psExit?.returnedAt);
  if (!entry || !at || !Number.isFinite(Date.parse(at)))
    throw new Error('Conferma della decisione incompleta. Riprova la stessa registrazione.');
  return entry;
}
