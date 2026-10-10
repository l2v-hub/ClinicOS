import type { Appuntamento } from '../../types';
import { STATI_APPUNTAMENTO, STATO_LABEL, type FiltroStatoAppuntamento } from './agendaStato';

interface AgendaStatoFilterRowProps {
  filtro: FiltroStatoAppuntamento;
  onChange: (filtro: FiltroStatoAppuntamento) => void;
  /** Appuntamenti del range visualizzato: alimenta i conteggi mostrati nei chip. */
  appuntamenti: Appuntamento[];
}

export function AgendaStatoFilterRow({
  filtro,
  onChange,
  appuntamenti,
}: AgendaStatoFilterRowProps) {
  return (
    <div className="ds-chip-group" role="group" aria-label="Filtra per stato">
      <button
        type="button"
        className="ds-chip"
        aria-pressed={filtro === 'tutti'}
        onClick={() => onChange('tutti')}
      >
        Tutti gli stati <span className="ds-chip__count">{appuntamenti.length}</span>
      </button>
      {STATI_APPUNTAMENTO.map((s) => {
        const n = appuntamenti.filter((a) => a.stato === s).length;
        return (
          <button
            type="button"
            key={s}
            className="ds-chip"
            aria-pressed={filtro === s}
            onClick={() => onChange(filtro === s ? 'tutti' : s)}
          >
            {STATO_LABEL[s]}
            {n > 0 && <span className="ds-chip__count">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}
