// SPEC-015 (Agnos unificato): allowlist deny-by-default delle azioni AI.
//
// Il tipo AgnosActionKind NON contempla 'delete': un'azione di cancellazione non è rappresentabile
// per costruzione (livello 3 della difesa in profondità, decisione D3). L'executor esegue SOLO
// azioni presenti in questo catalogo e abilitate; tutto il resto è rifiutato (D4). Singole azioni
// possono essere spente senza deploy via env AI_DISABLED_ACTIONS="nome1,nome2".

export type AgnosActionKind = 'read' | 'create' | 'update';

export interface AgnosCatalogEntry {
  name: string;
  kind: AgnosActionKind;
  entity: string;
  enabled: boolean;
  description: string;
}

export const AGNOS_ACTION_CATALOG: Record<string, AgnosCatalogEntry> = {
  read: {
    name: 'read',
    kind: 'read',
    entity: 'query',
    enabled: true,
    description: 'Interroga i dati clinici esistenti (sola lettura, risposte sempre con fonte).',
  },
  create_vital_sign: {
    name: 'create_vital_sign',
    kind: 'create',
    entity: 'vital_sign',
    enabled: true,
    description: 'Registra un parametro vitale (pressione, temperatura, saturazione…) con orario esplicito.',
  },
  update_patient_demographics: {
    name: 'update_patient_demographics',
    kind: 'update',
    entity: 'patient',
    enabled: true,
    description: 'Aggiorna un dato anagrafico non clinico (telefono, email, indirizzo, contatto di emergenza).',
  },
  update_narrative_section: {
    name: 'update_narrative_section',
    kind: 'update',
    entity: 'narrative_section',
    enabled: true,
    description: 'Aggiunge testo a una sezione narrativa della cartella (solo append, mai sovrascrittura).',
  },
  add_diary_note: {
    name: 'add_diary_note',
    kind: 'create',
    entity: 'diary_entry',
    enabled: true,
    description: 'Aggiunge una nota al diario del paziente.',
  },
  // SPEC-015 US4: agenda appointments — create/update ONLY. delete_appointment does not exist and
  // must never be added: la cancellazione appuntamenti è riservata al pulsante della UI (FR-010).
  create_appointment: {
    name: 'create_appointment',
    kind: 'create',
    entity: 'appointment',
    enabled: true,
    description: 'Crea un appuntamento in agenda (paziente, data, ora, tipologia) con controllo conflitti slot.',
  },
  update_appointment: {
    name: 'update_appointment',
    kind: 'update',
    entity: 'appointment',
    enabled: true,
    description: 'Sposta o aggiorna un appuntamento esistente in agenda (nuovo orario) con controllo conflitti slot.',
  },
};

function envDisabledNames(env: NodeJS.ProcessEnv): Set<string> {
  return new Set(
    (env.AI_DISABLED_ACTIONS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/** Deny-by-default: false when the action is not in the catalog, disabled, or turned off via env. */
export function isActionAllowed(name: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const entry = AGNOS_ACTION_CATALOG[name];
  if (!entry || !entry.enabled) return false;
  return !envDisabledNames(env).has(name);
}

/** Inspectable catalog for GET /ai/actions/catalog (proof: zero delete actions). */
export function listCatalog(env: NodeJS.ProcessEnv = process.env): AgnosCatalogEntry[] {
  const off = envDisabledNames(env);
  return Object.values(AGNOS_ACTION_CATALOG).map((e) => ({ ...e, enabled: e.enabled && !off.has(e.name) }));
}
