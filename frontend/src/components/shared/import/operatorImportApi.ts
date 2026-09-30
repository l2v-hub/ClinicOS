// ImportSessionApi dell'operatore connesso: stesse intestazioni e stesso controllo di identità per
// il flusso "Nuovo ingresso → Documenti" e per la card Documenti della scheda d'ingresso.
import { API_URL } from '../../../config';
import {
  getCurrentOperator,
  operatorHeaders,
  isSimulatorSession,
} from '../../../lib/operatorSession';
import { ImportSessionApi } from './importSessionApi';
import type { ImportActor } from './importSessionTypes';

export function operatorImportApi(actor: ImportActor) {
  const actorRequired = getCurrentOperator() !== null;
  return new ImportSessionApi(async (path, options = {}) => {
    const current = getCurrentOperator();
    if (
      (actorRequired && !current) ||
      (current && (current.id !== actor.operatorId || current.role !== actor.operatorRole))
    )
      throw new Error('Operatore cambiato. Riapri la sessione con il tuo accesso.');
    const headers = operatorHeaders();
    // Role Simulator: the signed session is the only credential, never self-declared headers.
    if (isSimulatorSession())
      return fetch(path, { ...options, headers: { ...headers, ...options.headers } });
    if (actor.operatorId && !headers['X-Operator-Id']) headers['X-Operator-Id'] = actor.operatorId;
    if (actor.operatorRole && !headers['X-Operator-Role'])
      headers['X-Operator-Role'] = actor.operatorRole;
    return fetch(path, { ...options, headers: { ...headers, ...options.headers } });
  }, `${API_URL}/ai/extraction/jobs`);
}
