// Backend implementations of the ExtractionAgent's tools (REQ-021).
// Real, DB-backed primitives the agent calls during its loop. The agent never
// touches the DB directly — it calls these read-only lookups; writes happen only
// after human confirmation (REQ-018).

import { prisma } from '../../lib/prisma.js';
import { MERGE_VERSION, type MergedField, type MergedList, type MergedProposal, type Provenance } from '../merge.js';
import type { AgentProposalInput, AgentProposal, ExistingPatientMatch } from './types.js';

/** Tool: find existing patients by name + date of birth (and codice fiscale if given). */
export async function findExistingPatient(args: {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  codiceFiscale?: string;
}): Promise<ExistingPatientMatch[]> {
  const where: Record<string, unknown> = {};
  if (args.firstName) where.firstName = { equals: args.firstName.trim(), mode: 'insensitive' };
  if (args.lastName) where.lastName = { equals: args.lastName.trim(), mode: 'insensitive' };
  if (args.dateOfBirth) {
    const d = new Date(args.dateOfBirth);
    if (!Number.isNaN(d.getTime())) where.dateOfBirth = d;
  }
  let matches: { id: string; firstName: string; lastName: string; dateOfBirth: Date; medicalRecordNumber: string }[] = [];
  if (Object.keys(where).length > 0) {
    matches = await prisma.patient.findMany({ where, take: 5, select: { id: true, firstName: true, lastName: true, dateOfBirth: true, medicalRecordNumber: true } });
  }
  // Codice fiscale lives in Cartella.data — match it if provided and no name/dob hit.
  if (matches.length === 0 && args.codiceFiscale?.trim()) {
    const cf = args.codiceFiscale.trim().toUpperCase();
    const carts = await prisma.cartella.findMany({ take: 50, select: { patientId: true, data: true } });
    const hitIds = carts.filter((c) => String((c.data as { codiceFiscale?: string })?.codiceFiscale ?? '').toUpperCase() === cf).map((c) => c.patientId);
    if (hitIds.length) {
      matches = await prisma.patient.findMany({ where: { id: { in: hitIds.slice(0, 5) } }, select: { id: true, firstName: true, lastName: true, dateOfBirth: true, medicalRecordNumber: true } });
    }
  }
  return matches.map((m) => ({
    id: m.id, firstName: m.firstName, lastName: m.lastName,
    dateOfBirth: m.dateOfBirth.toISOString().slice(0, 10), medicalRecordNumber: m.medicalRecordNumber,
  }));
}

/** Tool: get an existing patient's cartella so the agent can append/merge sensibly. */
export async function getPatientCartella(patientId: string): Promise<{ found: boolean; data: unknown }> {
  const cartella = await prisma.cartella.findUnique({ where: { patientId } });
  return { found: !!cartella, data: cartella?.data ?? null };
}

// ── Proposal adapter: model output → review-UI shape (MergedProposal) ─────────

const ANAG_KEYS = ['nome', 'cognome', 'dataNascita', 'sesso', 'email', 'telefono', 'indirizzo', 'contattoEmergenzaNome', 'contattoEmergenzaTel'];
const CART_SCALARS = ['statoRicovero', 'codiceFiscale', 'dataRicovero', 'patologiaIngresso', 'noteGenerali', 'medicoCurante'];
const LIST_KEYS = ['diagnosi', 'allergie', 'farmaci', 'terapie', 'parametriVitali', 'noteClinica'] as const;

function field(value: unknown, model: string, filename: string): MergedField {
  const empty = value == null || (typeof value === 'string' && value.trim() === '');
  if (empty) return { status: 'missing', value: '', sources: [] };
  return { status: 'extracted', value, sources: [{ docId: 'agent', filename, model }] };
}

function listFor(items: Record<string, unknown>[] | undefined, model: string, filename: string): MergedList {
  const arr = (items ?? []).filter((i) => i && typeof i === 'object');
  if (arr.length === 0) return { status: 'missing', items: [], duplicatesRemoved: 0 };
  return {
    status: 'extracted',
    duplicatesRemoved: 0,
    items: arr.map((value, idx) => ({ key: `a${idx}`, value, status: 'extracted', sources: [{ docId: 'agent', filename, model }] })),
  };
}

/** Convert the agent's submitted proposal into the stored review proposal. */
export function buildAgentProposal(input: AgentProposalInput, model: string, docFilenames: string[]): AgentProposal {
  const fn = docFilenames[0] ?? 'documento';
  const anagrafica: Record<string, MergedField> = {};
  for (const k of ANAG_KEYS) anagrafica[k] = field(input.patient?.[k], model, fn);

  const cartella: Record<string, MergedField | MergedList> = {};
  for (const k of CART_SCALARS) cartella[k] = field(input.patient?.[k], model, fn);
  cartella.diagnosi = listFor(input.clinical?.diagnosi, model, fn);
  cartella.allergie = listFor(input.clinical?.allergie, model, fn);
  cartella.farmaci = listFor(input.clinical?.farmaci, model, fn);
  cartella.terapie = listFor(input.clinical?.terapie, model, fn);
  cartella.parametriVitali = listFor(input.clinical?.parametriVitali, model, fn);
  cartella.noteClinica = listFor(input.clinical?.noteClinica, model, fn);

  // Apply agent-reported conflicts (never auto-resolved).
  let conflictCount = 0;
  for (const c of input.conflicts ?? []) {
    const seg = c.path.split('.');
    const target = seg[0] === 'anagrafica' ? anagrafica : cartella;
    const key = seg[1] ?? seg[0];
    const candidates = c.candidates.map((cand) => ({
      value: cand.value,
      sources: [{ docId: 'agent', filename: cand.source ?? fn, model } as Provenance],
    }));
    if (target[key] && !('items' in target[key])) {
      (target[key] as MergedField) = { status: 'conflict', value: undefined, candidates, sources: candidates.flatMap((x) => x.sources) };
      conflictCount++;
    }
  }

  // Report counts.
  let filled = 0, missing = 0;
  const tally = (mf: MergedField) => { mf.status === 'missing' ? missing++ : mf.status === 'conflict' ? 0 : filled++; };
  Object.values(anagrafica).forEach(tally);
  for (const v of Object.values(cartella)) {
    if ('items' in v) { v.status === 'missing' ? missing++ : filled++; }
    else tally(v);
  }

  const proposal: AgentProposal = {
    _merge: {
      version: MERGE_VERSION,
      report: { filled, missing, conflict: conflictCount, duplicate: 0 },
      documents: docFilenames.map((filename) => ({ docId: 'agent', filename, model } as Provenance)),
    },
    anagrafica,
    cartella,
    _target: {
      mode: input.mode === 'existing' ? 'existing' : 'new',
      patientId: input.mode === 'existing' ? input.patientId : undefined,
      reason: input.reason,
    },
  };
  return proposal;
}

// Re-export for the validator to assert the proposal is a valid extraction shape.
export function proposalToExtractionData(input: AgentProposalInput): { anagrafica: Record<string, unknown>; cartella: Record<string, unknown> } {
  return {
    anagrafica: input.patient ?? {},
    cartella: {
      ...Object.fromEntries(CART_SCALARS.map((k) => [k, input.patient?.[k] ?? ''])),
      ...Object.fromEntries(LIST_KEYS.map((k) => [k, input.clinical?.[k as keyof typeof input.clinical] ?? []])),
    },
  };
}
