import type { Consegna, NewConsegnaInput } from '../../types';
import type { ConsegnaCreateRequest, ConsegnaCreateResult } from '../consegnaCreation';
export const input: NewConsegnaInput = {
  pazienteId: 'synthetic-a',
  tipo: 'Monitoraggio',
  priorita: 'normale',
  note: 'Nota sintetica',
  scadenza: '2026-09-23',
  oraScadenza: '14:20',
  operatoreAssegnatoId: 'synthetic-colleague',
};
export function record(request: ConsegnaCreateRequest): Consegna {
  return {
    ...request,
    id: 'synthetic-consegna',
    pazienteNome: 'Sintetico, Ada',
    stato: 'aperta',
    operatoreAssegnato: 'Collega',
    creatoDA: 'Autore',
    createdAt: '2026-09-23T10:00:00Z',
  };
}
export function saved(
  request: ConsegnaCreateRequest,
): Extract<ConsegnaCreateResult, { kind: 'saved' }> {
  return { kind: 'saved', requestId: request.requestId, record: record(request), replayed: false };
}
