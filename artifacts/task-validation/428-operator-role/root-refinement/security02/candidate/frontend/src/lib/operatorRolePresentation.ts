import type { RuoloOperatore } from '../types';

export const OPERATOR_ROLE_EXPLANATION =
  'Funzione dichiarata nel profilo, distinta dai permessi di accesso.';

export function operatorRolePresentation(value: unknown) {
  const labels: Record<string, string> = {
    medico: 'Medico',
    infermiere: 'Infermiere',
    coordinatore: 'Coordinatore',
    oss: 'OSS (legacy)',
    fisioterapista: 'Fisioterapista (legacy)',
    operatore: 'Operatore (legacy)',
    altro: 'Altro (legacy)',
    admin: 'Amministratore (legacy)',
    manager: 'Manager (legacy)',
  };
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return { label: 'Ruolo non disponibile', needsVerification: true };
  const key = raw.toLowerCase();
  return Object.hasOwn(labels, key)
    ? { label: labels[key], needsVerification: false }
    : { label: `${raw} (da verificare)`, needsVerification: true };
}

export function operatorProfileLabel(operator: { ruolo: unknown; qualifica?: unknown }) {
  const qualification = typeof operator.qualifica === 'string' ? operator.qualifica.trim() : '';
  return `${operatorRolePresentation(operator.ruolo).label}${qualification ? ` · Qualifica: ${qualification}` : ''}`;
}

export function isStandardOperatorRole(value: unknown): value is RuoloOperatore {
  return value === 'medico' || value === 'infermiere' || value === 'coordinatore';
}
