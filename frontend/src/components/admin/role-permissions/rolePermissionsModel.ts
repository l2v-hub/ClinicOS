// Logica pura della pagina "Ruoli e permessi": raggruppamento, filtri, bozza locale e differenze.
// Nessuna dipendenza da React o dal DOM: testata con node:test.

import type {
  AssignmentChange,
  CapabilityType,
  DerivedCapability,
  Effect,
  GrantChange,
  PolicyCapability,
  PolicyDocument,
  PolicyIdentity,
  RoleDefinition,
  Sensitivity,
} from '../../../lib/authzPolicyApi';

export const EFFECT_OPTIONS: readonly Effect[] = [
  'ALLOWED',
  'ALLOWED_WITH_CONFIRMATION',
  'READ_ONLY',
  'DENIED',
];

export const EFFECT_LABEL: Record<Effect, string> = {
  ALLOWED: 'Consentito',
  ALLOWED_WITH_CONFIRMATION: 'Con conferma',
  READ_ONLY: 'Sola lettura',
  DENIED: 'Negato',
};

export const TYPE_LABEL: Record<CapabilityType, string> = {
  read: 'Lettura',
  write: 'Scrittura',
  action: 'Azione',
};

export const SENSITIVITY_LABEL: Record<Sensitivity, string> = {
  low: 'Bassa',
  medium: 'Media',
  high: 'Alta',
  critical: 'Critica',
};

const DOMAIN_LABELS: Record<string, string> = {
  administration: 'Amministrazione',
  agnos: 'Agnos (azioni)',
  ai_audit: 'Audit IA',
  ai_extraction: 'Estrazione IA',
  ai_read: 'Letture IA',
  appointments: 'Appuntamenti',
  assessments: 'Scale e valutazioni',
  assistant: 'Assistente',
  authz: 'Ruoli e permessi',
  clinical_record: 'Cartella clinica',
  config: 'Configurazione',
  consegne: 'Consegne',
  dev: 'Sviluppo',
  diary: 'Diario',
  documents: 'Documenti',
  drugs: 'Farmaci',
  identity: 'Identità',
  import_jobs: 'Import documenti',
  import_pages: 'Import pagine',
  infra: 'Infrastruttura',
  intake: 'Ingresso',
  internal_ai: 'IA interna',
  narrative: 'Narrativa',
  notes: 'Note',
  operators: 'Operatori',
  parameters: 'Parametri vitali',
  patients: 'Pazienti',
  room_assignments: 'Assegnazione camere',
  rooms: 'Camere',
  roster: 'Turni',
  therapy: 'Terapia',
  voice: 'Voce',
};

export function domainLabel(domain: string): string {
  return DOMAIN_LABELS[domain] ?? domain.replace(/_/g, ' ');
}

export function cellKey(roleId: string, capabilityId: string): string {
  return `${roleId}:${capabilityId}`;
}

/** Effetto dichiarato per ruolo × capability (assente = effetto di default del documento). */
export function effectOf(doc: PolicyDocument, roleId: string, capabilityId: string): Effect {
  return doc.grants[roleId]?.[capabilityId] ?? doc.defaultEffect;
}

/**
 * Significato reale di un effetto: READ_ONLY su una capability non di lettura equivale a negato
 * (stessa regola di `decide()` sul backend).
 */
export function isEffectivelyAllowed(effect: Effect, type: CapabilityType): boolean {
  if (effect === 'ALLOWED' || effect === 'ALLOWED_WITH_CONFIRMATION') return true;
  if (effect === 'READ_ONLY') return type === 'read';
  return false;
}

export function cloneDocument(doc: PolicyDocument): PolicyDocument {
  return JSON.parse(JSON.stringify(doc)) as PolicyDocument;
}

/** Nuovo documento con un solo permesso cambiato (copia superficiale: il resto resta condiviso). */
export function withGrant(
  doc: PolicyDocument,
  roleId: string,
  capabilityId: string,
  effect: Effect,
): PolicyDocument {
  return {
    ...doc,
    grants: { ...doc.grants, [roleId]: { ...(doc.grants[roleId] ?? {}), [capabilityId]: effect } },
  };
}

/** Nuovo documento con l'assegnazione cambiata; `null` = torna al ripiego legacy. */
export function withAssignment(
  doc: PolicyDocument,
  operatorId: string,
  roleId: string | null,
): PolicyDocument {
  const assignments = { ...doc.assignments };
  if (roleId) assignments[operatorId] = roleId;
  else delete assignments[operatorId];
  return { ...doc, assignments };
}

export interface DraftDiff {
  grants: GrantChange[];
  assignments: AssignmentChange[];
  total: number;
  /** Chiavi `roleId:capabilityId` modificate. */
  changedCells: Set<string>;
  /** Capability con almeno una cella modificata. */
  changedCapabilities: Set<string>;
  changedIdentities: Set<string>;
}

/** Differenze della bozza rispetto alla base, sugli effetti effettivi (come `diffPolicies`). */
export function diffDraft(
  base: PolicyDocument,
  draft: PolicyDocument,
  capabilities: readonly PolicyCapability[],
): DraftDiff {
  const grants: GrantChange[] = [];
  const changedCells = new Set<string>();
  const changedCapabilities = new Set<string>();
  for (const role of draft.roles) {
    for (const cap of capabilities) {
      const before = effectOf(base, role.id, cap.id);
      const after = effectOf(draft, role.id, cap.id);
      if (before !== after) {
        grants.push({ roleId: role.id, capabilityId: cap.id, before, after });
        changedCells.add(cellKey(role.id, cap.id));
        changedCapabilities.add(cap.id);
      }
    }
  }
  const assignments: AssignmentChange[] = [];
  const changedIdentities = new Set<string>();
  for (const operatorId of new Set([
    ...Object.keys(base.assignments),
    ...Object.keys(draft.assignments),
  ])) {
    const before = base.assignments[operatorId] ?? null;
    const after = draft.assignments[operatorId] ?? null;
    if (before !== after) {
      assignments.push({ operatorId, before, after });
      changedIdentities.add(operatorId);
    }
  }
  return {
    grants,
    assignments,
    total: grants.length + assignments.length,
    changedCells,
    changedCapabilities,
    changedIdentities,
  };
}

export interface CapabilityFilters {
  text: string;
  type: CapabilityType | 'all';
  sensitivity: Sensitivity | 'all';
  onlyDoubtful: boolean;
  onlyModified: boolean;
}

export const EMPTY_FILTERS: CapabilityFilters = {
  text: '',
  type: 'all',
  sensitivity: 'all',
  onlyDoubtful: false,
  onlyModified: false,
};

export function filtersActive(filters: CapabilityFilters): boolean {
  return (
    filters.text.trim() !== '' ||
    filters.type !== 'all' ||
    filters.sensitivity !== 'all' ||
    filters.onlyDoubtful ||
    filters.onlyModified
  );
}

/** Capability con almeno una nota di dubbio (`review` è indicizzato `roleId:capabilityId`). */
export function doubtfulCapabilities(review: Record<string, string> | undefined): Set<string> {
  const result = new Set<string>();
  for (const key of Object.keys(review ?? {})) {
    const at = key.indexOf(':');
    if (at > 0) result.add(key.slice(at + 1));
  }
  return result;
}

export function filterCapabilities(
  capabilities: readonly PolicyCapability[],
  filters: CapabilityFilters,
  context: { doubtful: Set<string>; modified: Set<string> },
): PolicyCapability[] {
  const needle = filters.text.trim().toLowerCase();
  return capabilities.filter((cap) => {
    if (filters.type !== 'all' && cap.type !== filters.type) return false;
    if (filters.sensitivity !== 'all' && cap.sensitivity !== filters.sensitivity) return false;
    if (filters.onlyDoubtful && !context.doubtful.has(cap.id)) return false;
    if (filters.onlyModified && !context.modified.has(cap.id)) return false;
    if (!needle) return true;
    return (
      cap.id.toLowerCase().includes(needle) ||
      cap.name.toLowerCase().includes(needle) ||
      cap.domain.toLowerCase().includes(needle) ||
      domainLabel(cap.domain).toLowerCase().includes(needle)
    );
  });
}

export interface DomainGroup {
  domain: string;
  label: string;
  capabilities: PolicyCapability[];
}

/** Gruppi per dominio, ordinati per etichetta; capability ordinate per nome. */
export function groupByDomain(capabilities: readonly PolicyCapability[]): DomainGroup[] {
  const byDomain = new Map<string, PolicyCapability[]>();
  for (const cap of capabilities) {
    const list = byDomain.get(cap.domain);
    if (list) list.push(cap);
    else byDomain.set(cap.domain, [cap]);
  }
  return [...byDomain.entries()]
    .map(([domain, caps]) => ({
      domain,
      label: domainLabel(domain),
      capabilities: [...caps].sort((a, b) => a.name.localeCompare(b.name, 'it')),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'it'));
}

/** Conteggio effetti di un ruolo sull'insieme di capability indicato. */
export function effectCounts(
  doc: PolicyDocument,
  roleId: string,
  capabilities: readonly PolicyCapability[],
): Record<Effect, number> {
  const counts: Record<Effect, number> = {
    ALLOWED: 0,
    ALLOWED_WITH_CONFIRMATION: 0,
    READ_ONLY: 0,
    DENIED: 0,
  };
  for (const cap of capabilities) counts[effectOf(doc, roleId, cap.id)] += 1;
  return counts;
}

/** Capability derivate (canali/alias, es. azioni Agnos) che seguono la capability indicata. */
export function followersOf(
  capabilityId: string,
  derived: readonly DerivedCapability[],
): DerivedCapability[] {
  return derived.filter((item) => item.governedBy === capabilityId);
}

/** Ruolo legacy di ripiego per una stringa di ruolo storica (specchio di `legacyRoleIdFor`). */
export function legacyRoleIdFor(legacyRole: string): string {
  return ['admin', 'manager'].includes(legacyRole.trim().toLowerCase())
    ? 'legacy_admin'
    : 'operator';
}

export interface ResolvedIdentityRole {
  roleId: string;
  source: 'assignment' | 'legacy';
}

/** Ruolo di un'identità: assegnazione esplicita valida, altrimenti ripiego legacy. */
export function identityRole(doc: PolicyDocument, identity: PolicyIdentity): ResolvedIdentityRole {
  const assigned = doc.assignments[identity.id];
  if (assigned && doc.roles.some((role) => role.id === assigned)) {
    return { roleId: assigned, source: 'assignment' };
  }
  return { roleId: legacyRoleIdFor(identity.legacyRole), source: 'legacy' };
}

export function identitiesOfRole(
  doc: PolicyDocument,
  identities: readonly PolicyIdentity[],
  roleId: string,
): { identity: PolicyIdentity; source: 'assignment' | 'legacy' }[] {
  return identities.flatMap((identity) => {
    const resolved = identityRole(doc, identity);
    return resolved.roleId === roleId ? [{ identity, source: resolved.source }] : [];
  });
}

export function roleLabel(roles: readonly RoleDefinition[], roleId: string | null): string {
  if (!roleId) return '—';
  return roles.find((role) => role.id === roleId)?.label ?? roleId;
}

export interface ErrorNotice {
  message: string;
  /** La policy attiva è cambiata: serve ricaricare (le modifiche locali vanno rifatte). */
  needsReload: boolean;
}

/** Messaggio per l'utente a partire dall'errore (status + code) della Policy API. */
export function describePolicyError(error: unknown): ErrorNotice {
  const status = (error as { status?: unknown })?.status;
  const code = (error as { code?: unknown })?.code;
  const message = error instanceof Error ? error.message : '';
  if (code === 'policy_version_conflict') {
    return {
      message:
        'Un altro amministratore ha applicato una nuova versione nel frattempo. Ricarica la policy e ripeti le modifiche.',
      needsReload: true,
    };
  }
  if (code === 'stale_draft') {
    return {
      message: 'La bozza è basata su una versione non più attiva: ricarica e crea una nuova bozza.',
      needsReload: true,
    };
  }
  if (code === 'policy_unchanged') {
    return { message: 'Nessuna modifica rispetto alla versione attiva.', needsReload: false };
  }
  if (code === 'invalid_policy' || code === 'invalid_body') {
    return {
      message: `Policy non valida: ${message || 'controlla le modifiche'}`,
      needsReload: false,
    };
  }
  if (status === 401) return { message: 'Sessione scaduta: accedi di nuovo.', needsReload: false };
  if (status === 403) {
    return {
      message: 'Non hai il permesso per questa operazione sui ruoli e permessi.',
      needsReload: false,
    };
  }
  if (code === 'network_error') {
    return { message: 'Server non raggiungibile. Riprova tra poco.', needsReload: false };
  }
  return { message: message || 'Operazione non riuscita.', needsReload: false };
}
