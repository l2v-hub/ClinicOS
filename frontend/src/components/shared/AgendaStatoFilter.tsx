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
    <div className="agt-filter-row">
      <button
        className={`agt-filter-chip${filtro === 'tutti' ? ' active' : ''}`}
        onClick={() => onChange('tutti')}
      >
        Tutti gli stati ({appuntamenti.length})
      </button>
      {STATI_APPUNTAMENTO.map((s) => {
        const n = appuntamenti.filter((a) => a.stato === s).length;
        return (
          <button
            key={s}
            className={`agt-filter-chip${filtro === s ? ' active' : ''}`}
            onClick={() => onChange(filtro === s ? 'tutti' : s)}
          >
            {STATO_LABEL[s]}
            {n > 0 ? ` (${n})` : ''}
          </button>
        );
      })}
    </div>
  );
}
