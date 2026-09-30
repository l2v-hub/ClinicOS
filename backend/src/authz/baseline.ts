// Proactive baseline policy (version 0) — a development/demo starting point that Administrator can
// edit, NOT a normative truth. Built from the real capability registry by semantic clustering:
// domain + type + sensitivity + the legacy admin gates. Doubtful cells carry a `review` note that the
// Administrator UI highlights. Sensitive clinical writes are prudent (DENIED or with confirmation).
//
// Legacy roles keep today's behaviour for identities without an explicit assignment:
//   legacy_admin = everything (as admin|manager today); operator = everything except the
//   capabilities whose route is gated by requireRole('admin','manager').

import { governedCapabilities } from './registry.js';
import type { CapabilityEntry, Effect, PolicyDocument, RoleDefinition } from './types.js';

export const ROLE_IDS = {
  administrator: 'administrator',
  supervisor: 'supervisor',
  doctor: 'doctor',
  nurse: 'nurse',
  oss: 'oss',
  operator: 'operator',
  legacyAdmin: 'legacy_admin',
} as const;

export const BASELINE_ROLES: RoleDefinition[] = [
  {
    id: 'administrator',
    label: 'Amministratore',
    description:
      'Amministratore tecnico: ruoli e permessi, operatori, struttura (camere/letti), configurazione. Nessuna scrittura clinica.',
    legacyRole: 'admin',
    uiShell: 'admin',
  },
  {
    id: 'supervisor',
    label: 'Supervisore',
    description:
      'Coordinatore operativo: supervisione di reparto, agenda multi-operatore, consegne, turni, posti letto. Letture cliniche complete, nessuna prescrizione.',
    legacyRole: 'manager',
    uiShell: 'admin',
  },
  {
    id: 'doctor',
    label: 'Medico',
    description:
      'Medico: cartella clinica, anamnesi, prescrizioni (con conferma), diario, valutazioni.',
    legacyRole: 'operatore',
    uiShell: 'operator',
  },
  {
    id: 'nurse',
    label: 'Infermiere',
    description:
      'Infermiere: somministrazioni, parametri, diario, scale di valutazione, consegne. Nessuna prescrizione.',
    legacyRole: 'operatore',
    uiShell: 'operator',
  },
  {
    id: 'oss',
    label: 'OSS',
    description:
      'Operatore socio-sanitario: assistenza di base, parametri, diario assistenziale, consegne. Nessun accesso a farmaci e documenti clinici.',
    legacyRole: 'operatore',
    uiShell: 'operator',
  },
  {
    id: 'operator',
    label: 'Operatore (legacy)',
    description:
      'Ruolo storico "Operatore": mantenuto per le identità non ancora migrate. Stessi permessi di oggi.',
    legacy: true,
    legacyRole: 'operatore',
    uiShell: 'operator',
  },
  {
    id: 'legacy_admin',
    label: 'Amministratore (legacy)',
    description:
      'Ruolo storico "Amministratore/Manager": mantenuto per le identità non ancora migrate. Stessi permessi di oggi (tutto).',
    legacy: true,
    legacyRole: 'admin',
    uiShell: 'admin',
  },
];

/** Server-owned simulated identities (Role Simulator) and their baseline assignment. */
export const SIMULATED_ASSIGNMENTS: Record<string, string> = {
  'SIM-ADMIN': 'administrator',
  'SIM-SUPERVISOR-1': 'supervisor',
  'SIM-DOCTOR-1': 'doctor',
  'SIM-NURSE-1': 'nurse',
  'SIM-OSS-1': 'oss',
};

type Rule = { effect: Effect; review?: string };

const ADMIN_ONLY = (cap: CapabilityEntry) => cap.legacyRoles.length > 0;
const isRead = (cap: CapabilityEntry) => cap.type === 'read';

// Technical administration capabilities (structure, users, policy, platform).
const TECHNICAL = new Set([
  'authz.view_policy',
  'authz.manage_policy',
  'operators.create',
  'operators.update',
  'operators.list',
  'operators.page',
  'operators.directory',
  'operators.directory_page',
  'operators.schedules',
  'operators.directory_schedules',
  'operators.set_schedule',
  'rooms.create',
  'rooms.update',
  'rooms.delete',
  'rooms.add_bed',
  'rooms.update_bed',
  'rooms.delete_bed',
  'rooms.get',
  'rooms.list',
  'rooms.list_beds',
  'rooms.available_beds',
  'rooms.occupancy',
  'roster.list_contexts',
  'roster.set_context_default',
  'ai.audit.list',
  'import_jobs.sweep',
]);

// Operational overview reads the Administrator dashboard needs (no clinical detail).
const ADMIN_OVERVIEW_READS = new Set([
  'patients.list_page',
  'patients.search',
  'patients.clinical_overview',
  'patients.clinical_summary',
  'patients.settings',
  'consegne.overview',
  'consegne.list',
  'consegne.patient_summary',
  'appointments.list',
  'administration.list_slots',
  'administration.list_slots_page',
  'room_assignments.list',
  'rooms.patient_room_options',
  'notes.list',
  'roster.get_my_order',
]);

function administrator(cap: CapabilityEntry): Rule {
  if (cap.domain === 'dev')
    return { effect: 'DENIED', review: 'Solo sviluppo: non serve in esercizio.' };
  if (cap.id.startsWith('intake.legacy_'))
    return { effect: 'DENIED', review: 'Endpoint deprecato del vecchio import.' };
  if (cap.id === 'drugs.reload')
    return {
      effect: 'ALLOWED_WITH_CONFIRMATION',
      review: 'Scarica ~82 MB da AIFA e sostituisce l’anagrafica.',
    };
  if (cap.id === 'drugs.status') return { effect: 'ALLOWED' };
  if (TECHNICAL.has(cap.id)) return { effect: 'ALLOWED' };
  if (ADMIN_OVERVIEW_READS.has(cap.id)) return { effect: 'READ_ONLY' };
  if (cap.domain === 'room_assignments') {
    if (cap.id === 'room_assignments.delete') return { effect: 'ALLOWED_WITH_CONFIRMATION' };
    return { effect: 'ALLOWED', review: 'Gestione posti letto: tecnica o di coordinamento?' };
  }
  if (cap.domain === 'notes') return { effect: 'ALLOWED' };
  if (cap.id === 'roster.set_my_order') return { effect: 'ALLOWED' };
  if (cap.domain === 'appointments')
    return {
      effect: 'DENIED',
      review: 'In passato l’amministratore gestiva l’agenda globale: ora è compito del Supervisor.',
    };
  if (['assistant', 'agnos', 'voice'].includes(cap.domain))
    return {
      effect: 'DENIED',
      review: 'L’assistente legge dati clinici: minimo privilegio per l’amministratore tecnico.',
    };
  if (cap.domain === 'consegne')
    return {
      effect: 'DENIED',
      review: 'Consegne cliniche: di norma non competono all’amministratore tecnico.',
    };
  // Clinical record and every other clinical capability: least privilege.
  return { effect: 'DENIED' };
}

function supervisor(cap: CapabilityEntry): Rule {
  if (cap.domain === 'dev' || cap.id.startsWith('intake.legacy_')) return { effect: 'DENIED' };
  if (cap.id === 'authz.manage_policy') return { effect: 'DENIED' };
  if (cap.id === 'authz.view_policy') return { effect: 'READ_ONLY' };
  if (cap.id === 'drugs.reload' || cap.id === 'import_jobs.sweep') return { effect: 'DENIED' };
  if (isRead(cap)) return { effect: 'ALLOWED' };
  if (cap.id === 'operators.create' || cap.id === 'operators.update')
    return { effect: 'DENIED', review: 'Anagrafica utenti = amministrazione tecnica.' };
  if (cap.id === 'operators.set_schedule') return { effect: 'ALLOWED' };
  if (cap.domain === 'rooms') {
    if (cap.id === 'rooms.update_bed')
      return { effect: 'ALLOWED', review: 'Manutenzione letto: operativa o tecnica?' };
    return { effect: 'DENIED', review: 'Struttura camere/letti = amministrazione tecnica.' };
  }
  if (cap.id === 'room_assignments.delete')
    return {
      effect: 'DENIED',
      review: 'Cancellazione definitiva: preferire la chiusura del ricovero.',
    };
  if (['consegne', 'appointments', 'notes', 'roster', 'room_assignments'].includes(cap.domain)) {
    return cap.id.endsWith('.delete')
      ? { effect: 'ALLOWED_WITH_CONFIRMATION' }
      : { effect: 'ALLOWED' };
  }
  if (
    ['therapy.create', 'therapy.update', 'therapy.delete', 'diary.create_with_therapy'].includes(
      cap.id,
    )
  )
    return { effect: 'DENIED', review: 'Prescrizione = atto medico.' };
  if (cap.domain === 'administration')
    return {
      effect: 'ALLOWED_WITH_CONFIRMATION',
      review: 'Il coordinatore è spesso infermiere: somministrazione ammessa con conferma?',
    };
  if (['narrative.save', 'clinical_record.save'].includes(cap.id))
    return { effect: 'DENIED', review: 'Anamnesi/cartella: redazione medica.' };
  if (cap.domain === 'assessments')
    return { effect: 'DENIED', review: 'Scale di valutazione compilate da medico/infermiere.' };
  if (cap.id === 'diary.delete_entry' || cap.id === 'patients.delete') return { effect: 'DENIED' };
  if (cap.id === 'diary.update_entry')
    return { effect: 'DENIED', review: 'La modifica voce diario non verifica l’autore (GAP).' };
  return { effect: 'ALLOWED' };
}

function doctor(cap: CapabilityEntry): Rule {
  if (ADMIN_ONLY(cap) || cap.domain === 'dev') return { effect: 'DENIED' };
  if (isRead(cap)) return { effect: 'ALLOWED' };
  if (['therapy.create', 'therapy.update', 'diary.create_with_therapy'].includes(cap.id))
    return { effect: 'ALLOWED_WITH_CONFIRMATION' };
  if (cap.id === 'therapy.delete')
    return {
      effect: 'ALLOWED_WITH_CONFIRMATION',
      review: 'Cancellazione definitiva della prescrizione.',
    };
  if (cap.domain === 'administration')
    return {
      effect: 'DENIED',
      review: 'Somministrazione = atto infermieristico; il medico può averne bisogno in urgenza.',
    };
  if (cap.id === 'diary.delete_entry')
    return { effect: 'DENIED', review: 'Hard delete senza controllo autore.' };
  if (cap.id === 'diary.update_entry')
    return { effect: 'ALLOWED', review: 'La modifica voce diario non verifica l’autore (GAP).' };
  if (cap.id === 'patients.delete') return { effect: 'DENIED' };
  if (cap.id === 'intake.confirm_draft' || cap.id === 'import_jobs.confirm')
    return { effect: 'ALLOWED_WITH_CONFIRMATION' };
  if (cap.domain === 'room_assignments')
    return { effect: 'DENIED', review: 'Assegnazione letto: di solito il coordinatore.' };
  if (cap.id.endsWith('.delete')) return { effect: 'ALLOWED_WITH_CONFIRMATION' };
  return { effect: 'ALLOWED' };
}

function nurse(cap: CapabilityEntry): Rule {
  if (ADMIN_ONLY(cap) || cap.domain === 'dev') return { effect: 'DENIED' };
  if (isRead(cap)) return { effect: 'ALLOWED' };
  if (['therapy.create', 'therapy.update', 'therapy.delete'].includes(cap.id))
    return { effect: 'DENIED' };
  if (cap.id === 'diary.create_with_therapy')
    return { effect: 'DENIED', review: 'Crea una prescrizione dal diario: atto medico.' };
  if (cap.id === 'narrative.save')
    return { effect: 'READ_ONLY', review: 'Anamnesi e sezioni narrative: redazione medica.' };
  if (cap.id === 'clinical_record.save')
    return {
      effect: 'ALLOWED',
      review:
        'Il salvataggio cartella copre sezioni infermieristiche e mediche insieme (da separare).',
    };
  if (cap.id === 'diary.delete_entry' || cap.id === 'patients.delete') return { effect: 'DENIED' };
  if (cap.id === 'diary.update_entry')
    return { effect: 'ALLOWED', review: 'La modifica voce diario non verifica l’autore (GAP).' };
  if (cap.id === 'patients.create')
    return { effect: 'DENIED', review: 'I pazienti nascono dall’ingresso (bozza confermata).' };
  if (cap.id === 'intake.confirm_draft' || cap.id === 'import_jobs.confirm')
    return {
      effect: 'ALLOWED_WITH_CONFIRMATION',
      review: 'Conferma ingresso da parte dell’infermiere?',
    };
  if (cap.domain === 'room_assignments')
    return { effect: 'DENIED', review: 'Assegnazione letto: di solito il coordinatore.' };
  if (cap.id.endsWith('.delete')) return { effect: 'ALLOWED_WITH_CONFIRMATION' };
  return { effect: 'ALLOWED' };
}

const OSS_READS = new Set([
  'patients.list_page',
  'patients.search',
  'patients.get',
  'patients.clinical_summary',
  'patients.clinical_overview',
  'patients.settings',
  'diary.list',
  'diary.get_entry',
  'parameters.list_page',
  'parameters.list_readings',
  'consegne.list',
  'consegne.overview',
  'consegne.patient_summary',
  'appointments.list',
  'notes.list',
  'room_assignments.list',
  'rooms.patient_room_options',
  'roster.get_my_order',
  'operators.directory',
  'operators.directory_page',
  'assistant.query',
  'agnos.catalog',
  'voice.stt_status',
  'assessments.catalog',
  'assessments.list',
  'assessments.get',
  'assessments.current',
]);

function oss(cap: CapabilityEntry): Rule {
  if (ADMIN_ONLY(cap) || cap.domain === 'dev') return { effect: 'DENIED' };
  if (OSS_READS.has(cap.id)) {
    if (cap.id === 'assistant.query')
      return {
        effect: 'ALLOWED',
        review: 'Le letture AI restano filtrate dai permessi dei singoli dati.',
      };
    if (cap.domain === 'assessments')
      return {
        effect: 'READ_ONLY',
        review: 'Consultazione delle scale; compilazione a medico/infermiere.',
      };
    return { effect: 'ALLOWED' };
  }
  if (cap.id === 'clinical_record.get')
    return {
      effect: 'READ_ONLY',
      review: 'Cartella completa (diagnosi, allergie): utile per l’assistenza?',
    };
  if (cap.id === 'diary.create')
    return { effect: 'ALLOWED', review: 'Diario assistenziale OSS (tipo autore "oss").' };
  if (cap.id === 'parameters.create_reading' || cap.id === 'parameters.save_month')
    return { effect: 'ALLOWED', review: 'Rilevazione parametri da parte dell’OSS.' };
  if (cap.id === 'consegne.create' || cap.id === 'consegne.update') return { effect: 'ALLOWED' };
  if (cap.domain === 'notes')
    return cap.id === 'notes.delete' ? { effect: 'DENIED' } : { effect: 'ALLOWED' };
  if (cap.id === 'roster.set_my_order') return { effect: 'ALLOWED' };
  if (
    ['agnos.plan_command', 'agnos.execute_command', 'voice.plan', 'voice.execute'].includes(cap.id)
  )
    return {
      effect: 'ALLOWED',
      review: 'Le azioni AI restano filtrate dal permesso funzionale sottostante.',
    };
  if (cap.domain === 'therapy' || cap.domain === 'administration')
    return {
      effect: 'DENIED',
      review: isRead(cap) ? 'Informazioni su farmaci e somministrazioni.' : undefined,
    };
  return { effect: 'DENIED' };
}

function operatorLegacy(cap: CapabilityEntry): Rule {
  return ADMIN_ONLY(cap) ? { effect: 'DENIED' } : { effect: 'ALLOWED' };
}

const RULES: Record<string, (cap: CapabilityEntry) => Rule> = {
  administrator,
  supervisor,
  doctor,
  nurse,
  oss,
  operator: operatorLegacy,
  legacy_admin: () => ({ effect: 'ALLOWED' }),
};

export function buildBaselinePolicy(): PolicyDocument {
  const grants: PolicyDocument['grants'] = {};
  const review: Record<string, string> = {};
  for (const role of BASELINE_ROLES) {
    const rule = RULES[role.id];
    grants[role.id] = {};
    for (const cap of governedCapabilities()) {
      const decided = rule(cap);
      grants[role.id][cap.id] = decided.effect;
      if (decided.review) review[`${role.id}:${cap.id}`] = decided.review;
    }
  }
  return {
    schema: 'clinicos.authz-policy/v1',
    defaultEffect: 'DENIED',
    roles: BASELINE_ROLES.map((role) => ({ ...role })),
    grants,
    assignments: { ...SIMULATED_ASSIGNMENTS },
    review,
  };
}
