import type { StatoDocumento } from '../../../types';

export const DOCUMENT_STATUS_LABELS: Record<StatoDocumento, string> = {
  ricevuto: 'Ricevuto',
  mancante: 'Mancante',
  da_verificare: 'Da verificare',
  firmato: 'Firmato',
  scaduto: 'Scaduto',
};
