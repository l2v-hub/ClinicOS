// REQ-041: build the human-readable, source-grounded preview shown before confirmation. Pure:
// the route fetches any current values (narrative text, current demographic) and passes them in.

import type { ActionPlan, ActionPreview } from './types.js';
import { isWriteAction } from './types.js';

const DEMO_LABELS: Record<string, string> = {
  phone: 'Telefono', email: 'Email', address: 'Indirizzo',
  emergencyContactName: 'Contatto di emergenza', emergencyContactPhone: 'Telefono di emergenza',
};

export interface PreviewContext {
  patientName?: string;
  currentNarrativeText?: string;   // for update_narrative_section diff
  currentDemographicValue?: string;// for update_patient_demographics diff
}

export function buildPreview(plan: ActionPlan, pctx: PreviewContext = {}): ActionPreview {
  const warnings = Array.isArray((plan.fields as Record<string, unknown>).warnings)
    ? ((plan.fields as Record<string, unknown>).warnings as string[]) : [];
  const base: ActionPreview = {
    actionType: plan.actionType,
    patientId: plan.patientId,
    patientName: pctx.patientName,
    title: '',
    lines: [],
    ambiguities: plan.ambiguities,
    canExecute: isWriteAction(plan.actionType) && plan.ambiguities.length === 0 && !!plan.patientId,
    warnings,
  };

  switch (plan.actionType) {
    case 'create_vital_sign': {
      const f = plan.fields;
      base.title = 'Aggiungi parametro';
      base.lines = [
        { label: 'Parametro', value: String(f.label ?? f.etichetta ?? '') },
        { label: 'Valore', value: `${f.valore ?? ''} ${f.unita ?? ''}`.trim() },
        { label: 'Orario', value: String(f.timeHHMM ?? '—') },
      ];
      return base;
    }
    case 'update_patient_demographics': {
      const f = plan.fields;
      base.title = 'Modifica dato anagrafico';
      base.lines = [
        { label: 'Campo', value: DEMO_LABELS[String(f.field)] ?? String(f.field) },
        { label: 'Valore attuale', value: pctx.currentDemographicValue ?? '—' },
        { label: 'Nuovo valore', value: String(f.value ?? '') },
      ];
      return base;
    }
    case 'update_narrative_section': {
      const current = pctx.currentNarrativeText ?? '';
      const added = String(plan.fields.addedText ?? '');
      const resulting = current.trim() ? `${current}\n${added}` : added;
      base.title = 'Aggiorna sezione narrativa';
      base.lines = [{ label: 'Sezione', value: String(plan.sectionKey ?? '') }];
      base.diff = { current, proposed: added, resulting };
      return base;
    }
    case 'add_diary_note': {
      base.title = 'Aggiungi nota al diario';
      base.lines = [{ label: 'Nota', value: String(plan.fields.content ?? '') }];
      return base;
    }
    default: {
      base.title = plan.actionType === 'refuse_clinical' || plan.actionType === 'refuse_forbidden'
        ? 'Azione non consentita' : 'Comando';
      base.lines = plan.refusalReason ? [{ label: 'Motivo', value: plan.refusalReason }] : [];
      return base;
    }
  }
}
