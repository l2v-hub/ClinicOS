// Phase 7 — Event / Signal catalog (data, not logic). Every event type is a REAL application fact
// already stored by the existing services; this module only declares how it may become a signal.
//
//   Event  = application fact (a row written by the existing services)
//   Signal = deterministic projection of one or more eligible events for one person's attention
//   Summary = optional AI wording of signals (never stored as an event, never a clinical fact)
//
// Who may see an event type is NOT decided here: `capabilities` names the existing read
// capabilities that already govern the same data in the GUI / Tool Layer, evaluated against the
// ACTIVE policy for the identity on every request (configurable in «Ruoli e permessi"; a revocation
// is effective at the next refresh). Resident-bearing events are additionally filtered by the
// Resident Access Scope inside the query (never after loading, never by the LLM).

export type SignalType =
  | 'NEW_INFORMATION'
  | 'PENDING_ACTIVITY'
  | 'OVERDUE_ACTIVITY'
  | 'HANDOVER_ITEM'
  | 'STATE_CHANGE'
  | 'FOLLOW_UP'
  | 'DOCUMENT_AVAILABLE'
  | 'ATTENTION_REQUIRED';

export type EventType =
  | 'vitals.recorded'
  | 'diary.entry_created'
  | 'handover.open'
  | 'therapy.prescribed'
  | 'therapy.changed'
  | 'administration.recorded'
  | 'administration.due'
  | 'document.added'
  | 'room.changed'
  | 'note.received'
  | 'workflow.pending'
  | 'policy.applied'
  | 'access.denied_summary';

export type Audience = 'care' | 'personal' | 'technical';

export interface EventTypeDef {
  type: EventType;
  domain: string;
  /** Table / service the fact comes from. */
  source: string;
  /** Existing read capabilities required (ALL of them) — same ids as the Tool Layer / routes. */
  capabilities: string[];
  /**
   * care = resident-bearing clinical/care facts: Resident Access Scope applied in the query and a
   * clinical read capability required (Prompt 7 §6: no implicit clinical feed for administrators);
   * personal = addressed to this operator (mailbox / own workflows);
   * technical = facility/administration facts without resident data.
   */
  audience: Audience;
  sensitivity: 'low' | 'medium' | 'high';
  signal: SignalType;
  /** Where the priority comes from (business rule / source field / config) — never the LLM. */
  priority: string;
  /** Existing Skill the signal proposes (read skills, or a write skill that still needs preview + button). */
  skillId: string | null;
  /** Starter text of that Skill, sent as a normal Assistant message (same interpretation path). */
  starter: string | null;
  /** Classic screen fallback when no Skill exists. */
  classicScreen?: string;
  status: 'integrated';
}

/** Clinical read capability that every care role holds and the administrator does not. */
export const CARE_FEED_CAPABILITY = 'diary.list';

export const EVENT_CATALOG: EventTypeDef[] = [
  {
    type: 'vitals.recorded',
    domain: 'parameters',
    source: 'PatientParameterReading (immutable rows, createdAt)',
    capabilities: ['parameters.list_readings', CARE_FEED_CAPABILITY],
    audience: 'care',
    sensitivity: 'high',
    signal: 'NEW_INFORMATION',
    priority: 'normale (no clinical scoring in this phase)',
    skillId: 'vitals.recent',
    starter: 'Mostrami gli ultimi parametri di questo ospite',
    status: 'integrated',
  },
  {
    type: 'diary.entry_created',
    domain: 'diary',
    source: 'PatientDiaryEntry (createdAt, authorType, priority set by the author)',
    capabilities: ['diary.list'],
    audience: 'care',
    sensitivity: 'high',
    signal: 'NEW_INFORMATION',
    priority: 'source field PatientDiaryEntry.priority (normale | importante→alta | urgente)',
    skillId: 'diary.recent',
    starter: 'Mostrami il diario di questo ospite',
    status: 'integrated',
  },
  {
    type: 'handover.open',
    domain: 'consegne',
    source:
      'Consegna via consegne/read-service.loadConsegnaFeed (existing visibility rule), urgency=active only (UX2 W8: until the first «Ho capito» by a non-author)',
    capabilities: ['consegne.list'],
    audience: 'care',
    sensitivity: 'medium',
    signal: 'HANDOVER_ITEM',
    priority:
      'source field Consegna.priorita set by a human / handover.create rule (default normale)',
    skillId: 'handover.overview',
    starter: 'Come sono le consegne?',
    status: 'integrated',
  },
  {
    type: 'therapy.prescribed',
    domain: 'therapy',
    source: 'PatientTherapy (createdAt)',
    capabilities: ['administration.list_slots', CARE_FEED_CAPABILITY],
    audience: 'care',
    sensitivity: 'high',
    signal: 'STATE_CHANGE',
    priority: 'normale',
    skillId: 'patient.overview',
    starter: 'Dimmi tutto su questo ospite',
    status: 'integrated',
  },
  {
    type: 'therapy.changed',
    domain: 'therapy',
    source: 'PatientTherapy (updatedAt > createdAt, stato)',
    capabilities: ['administration.list_slots', CARE_FEED_CAPABILITY],
    audience: 'care',
    sensitivity: 'high',
    signal: 'STATE_CHANGE',
    priority: 'normale',
    skillId: 'patient.overview',
    starter: 'Dimmi tutto su questo ospite',
    status: 'integrated',
  },
  {
    type: 'administration.recorded',
    domain: 'administration',
    source: 'MedicationAdministration (confirmedAt, stato erogata | non_erogata)',
    capabilities: ['administration.list_slots'],
    audience: 'care',
    sensitivity: 'high',
    signal: 'STATE_CHANGE',
    priority: 'rule: non_erogata → FOLLOW_UP (normale); erogata → STATE_CHANGE (normale)',
    skillId: 'therapy.due_administrations',
    starter: 'Quali somministrazioni ci sono oggi?',
    status: 'integrated',
  },
  {
    type: 'administration.due',
    domain: 'administration',
    source: 'therapies/therapy-slots.buildTherapySlots(today) — pending slots',
    capabilities: ['administration.list_slots'],
    audience: 'care',
    sensitivity: 'high',
    signal: 'PENDING_ACTIVITY',
    priority:
      'time rule (config PROACTIVE_OVERDUE_GRACE_MIN, default 30): pending past slot time → OVERDUE_ACTIVITY alta; within PROACTIVE_DUE_AHEAD_MIN (60) → PENDING_ACTIVITY normale',
    skillId: 'therapy.due_administrations',
    starter: 'Quali somministrazioni ci sono oggi?',
    status: 'integrated',
  },
  {
    type: 'document.added',
    domain: 'documents',
    source: 'PatientDocument (createdAt)',
    capabilities: ['documents.list', CARE_FEED_CAPABILITY],
    audience: 'care',
    sensitivity: 'medium',
    signal: 'DOCUMENT_AVAILABLE',
    priority: 'normale',
    skillId: 'patient.overview',
    starter: 'Dimmi tutto su questo ospite',
    status: 'integrated',
  },
  {
    type: 'room.changed',
    domain: 'rooms',
    source: 'PatientRoomAssignment (createdAt)',
    capabilities: ['room_assignments.list', CARE_FEED_CAPABILITY],
    audience: 'care',
    sensitivity: 'low',
    signal: 'STATE_CHANGE',
    priority: 'normale',
    skillId: 'patient.overview',
    starter: 'Dimmi tutto su questo ospite',
    status: 'integrated',
  },
  {
    type: 'note.received',
    domain: 'notes',
    source: 'Nota unread for this mailbox (routes/note.ts unreadNotesWhere)',
    capabilities: ['notes.list'],
    audience: 'personal',
    sensitivity: 'medium',
    signal: 'NEW_INFORMATION',
    priority: 'source field Nota.priorita set by the author',
    skillId: null,
    starter: null,
    classicScreen: 'note',
    status: 'integrated',
  },
  {
    type: 'workflow.pending',
    domain: 'assistant',
    source: 'Skills workflow store: own workflows in NEEDS_CONFIRMATION',
    capabilities: [],
    audience: 'personal',
    sensitivity: 'medium',
    signal: 'PENDING_ACTIVITY',
    priority: 'normale',
    skillId: null,
    starter: null,
    status: 'integrated',
  },
  {
    type: 'policy.applied',
    domain: 'authz',
    source: 'AuthzPolicyVersion (appliedAt)',
    capabilities: ['authz.view_policy'],
    audience: 'technical',
    sensitivity: 'low',
    signal: 'STATE_CHANGE',
    priority: 'normale',
    skillId: null,
    starter: null,
    classicScreen: 'ruoli-permessi',
    status: 'integrated',
  },
  {
    type: 'access.denied_summary',
    domain: 'audit',
    source: 'AiAuditEvent outcome=denied, aggregated by action (no resident data)',
    capabilities: ['ai.audit.list'],
    audience: 'technical',
    sensitivity: 'low',
    signal: 'ATTENTION_REQUIRED',
    priority:
      'threshold rule PROACTIVE_DENIED_THRESHOLD (default 10 per window) → alta; below → normale',
    skillId: null,
    starter: null,
    status: 'integrated',
  },
];

export const SIGNAL_TYPES: { type: SignalType; meaning: string }[] = [
  {
    type: 'NEW_INFORMATION',
    meaning: 'Nuovo fatto registrato da qualcun altro (parametri, diario, nota).',
  },
  {
    type: 'PENDING_ACTIVITY',
    meaning: 'Attività prevista a breve o in attesa di una tua conferma.',
  },
  {
    type: 'OVERDUE_ACTIVITY',
    meaning: 'Attività prevista con orario superato e non ancora registrata.',
  },
  {
    type: 'HANDOVER_ITEM',
    meaning:
      'Urgenza da prendere in carico: consegna urgente che ti riguarda (assegnata a te, o di reparto se supervisore) non ancora presa in carico da nessuno.',
  },
  {
    type: 'STATE_CHANGE',
    meaning: 'Cambio di stato registrato (prescrizione, somministrazione, stanza, policy).',
  },
  {
    type: 'FOLLOW_UP',
    meaning:
      'Fatto registrato che di solito richiede una verifica (es. somministrazione non erogata).',
  },
  { type: 'DOCUMENT_AVAILABLE', meaning: 'Nuovo documento nella scheda di un ospite.' },
  {
    type: 'ATTENTION_REQUIRED',
    meaning: 'Soglia tecnica superata (es. accessi negati) — mai una deduzione clinica.',
  },
];

export function eventDef(type: EventType): EventTypeDef {
  const def = EVENT_CATALOG.find((d) => d.type === type);
  if (!def) throw new Error(`unknown event type ${type}`);
  return def;
}

/** Event types disabled by configuration (PROACTIVE_DISABLED_EVENTS=a,b). */
export function disabledEventTypes(env: NodeJS.ProcessEnv = process.env): Set<string> {
  return new Set(
    (env.PROACTIVE_DISABLED_EVENTS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}
