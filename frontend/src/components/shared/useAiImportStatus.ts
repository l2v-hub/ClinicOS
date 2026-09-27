import { useEffect, useState } from 'react';
import { API_URL } from '../../config';
import { cachedGetJson } from '../../lib/cachedFetch';

interface AiStatus {
  available: boolean;
  provider: string;
  model: string;
  errors: string[];
}

/** Stato del servizio AI di estrazione: condiviso dal pulsante "Importa dimissione" e dalla scelta
 *  "Nuovo paziente". `reason` spiega perché l'import non è disponibile. */
export function useAiImportStatus() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    cachedGetJson<AiStatus>(`${API_URL}/ai/extraction/status`)
      .then((s) => {
        if (alive) {
          setStatus(s);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) {
          setStatus(null);
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, []);
  const available = status?.available === true;
  const reason = `Servizio AI non disponibile${status?.errors?.length ? ': ' + status.errors.join('; ') : ''}`;
  return { loading, available, reason };
}
