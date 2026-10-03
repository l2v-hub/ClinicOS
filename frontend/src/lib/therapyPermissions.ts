// Chi può registrare una somministrazione dalla GUI (la decisione vera resta al server).
import { useCan, useCapabilityDecided } from './capabilities';
import { getCurrentOperator } from './operatorSession';

/**
 * Chi può registrare: entrambe le capability della somministrazione. Con la policy attiva decide
 * la mappa delle capability (il supervisore, che ha la shell gestionale, somministra «con
 * conferma»; l'amministratore tecnico ha la capability negata). Senza mappa (backend senza policy)
 * resta la regola storica: mai la vista gestionale dell'admin.
 */
export function useCanAdministerTherapy(): boolean {
  const canConfirm = useCan('administration.confirm');
  const canRecordNot = useCan('administration.record_not_administered');
  const decided = useCapabilityDecided('administration.confirm');
  return canConfirm && canRecordNot && (decided || getCurrentOperator()?.role !== 'admin');
}
