import { useEffect, useState } from 'react';
import { API_URL } from '../../../config';
import type { FarmacoTrovato } from './farmacoDocumento';
import { loadExactDrugPackage } from './medicationSearch';

export function SelectedDrugPackage({
  aic,
  selected,
}: {
  aic: string;
  selected?: FarmacoTrovato | null;
}) {
  const [loaded, setLoaded] = useState<FarmacoTrovato | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const immediate = selected?.aic === aic ? selected : null;
  const product = immediate ?? (loaded?.aic === aic ? loaded : null);
  useEffect(() => {
    if (immediate) return;
    const controller = new AbortController();
    setFailed(false);
    setLoaded(null);
    void loadExactDrugPackage(API_URL, aic, controller.signal)
      .then((exact) => {
        if (!controller.signal.aborted) setLoaded(exact);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [aic, immediate, attempt]);
  return (
    <div className="campo-farmaco__confezione">
      <p className="campo-farmaco__stato">Confezione selezionata · AIC {aic}</p>
      {product ? (
        <>
          <p className="campo-farmaco__dettagli">
            {product.descrizione || 'Descrizione non disponibile'}
          </p>
          <p className="campo-farmaco__dettagli">
            Formulazione: {product.forma || 'non disponibile'}
          </p>
          <p className="campo-farmaco__nota">
            Il dosaggio della confezione è distinto dalla quantità da somministrare.
          </p>
        </>
      ) : failed ? (
        <p className="campo-farmaco__nota">
          Dettagli della confezione non disponibili. L’AIC selezionato è conservato.{' '}
          <button
            type="button"
            className="campo-farmaco__cambia"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Riprova
          </button>
        </p>
      ) : (
        <p className="campo-farmaco__nota" role="status">
          Caricamento della confezione…
        </p>
      )}
    </div>
  );
}
