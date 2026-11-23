import { PatientParameterTrendChart } from '../../operator/PatientParameterTrendChart';
import '../../operator/PatientParameterTrends.css';
import type { PatientParameterReading } from '../../../lib/patientParameterReadings';
import { TREND_PARAMETERS, type TrendParameter } from '../../../lib/patientParameterTrends';
import { MILO_OPEN_ASSISTANT_EVENT } from '../../../lib/miloEvents';

// Milo fase 3: blocchi visivi sotto la risposta. Arrivano già costruiti dal backend con i dati
// letti (mai dal modello): qui si disegnano soltanto, come testo (nessun HTML grezzo).

export type MiloBlockTone = 'ok' | 'info' | 'warning' | 'alarm' | 'neutral';
export interface MiloKpiItem {
  label: string;
  value: string;
  unit?: string;
  tone?: MiloBlockTone;
  note?: string;
}
export type MiloBlock =
  | { type: 'kpi'; title: string; items: MiloKpiItem[]; source?: string }
  | {
      type: 'parameter_trend';
      title: string;
      patientId: string;
      period: { start: string; end: string };
      params: string[];
      readings: Array<{
        id: string;
        measuredAt: string;
        values: Record<string, string>;
        source: string;
        author?: string;
      }>;
    }
  | {
      type: 'table';
      title: string;
      columns: Array<{ key: string; label: string }>;
      rows: Array<Record<string, string>>;
      truncated?: boolean;
    }
  // Passaggio a un altro flusso dell'app con il testo già pronto: Milo non esegue, apre soltanto.
  | { type: 'handoff'; title: string; label: string; target: 'prescription'; message: string };

const TREND_KEYS = new Set<string>(TREND_PARAMETERS.map((p) => p.key));

function KpiBlock({ block }: { block: Extract<MiloBlock, { type: 'kpi' }> }) {
  return (
    <section className="milo-block milo-block--kpi" aria-label={block.title}>
      <h4 className="milo-block__title">{block.title}</h4>
      <div className="milo-kpi">
        {block.items.map((item, i) => (
          <div key={i} className={`milo-kpi__item milo-kpi__item--${item.tone ?? 'neutral'}`}>
            <span className="milo-kpi__label">{item.label}</span>
            <span
              className={`milo-kpi__value${item.value.length > 12 ? ' milo-kpi__value--text' : ''}`}
            >
              {item.value}
              {item.unit ? <small> {item.unit}</small> : null}
            </span>
            {item.note ? <span className="milo-kpi__note">{item.note}</span> : null}
          </div>
        ))}
      </div>
      {block.source ? <p className="milo-block__source">Fonte: {block.source}</p> : null}
    </section>
  );
}

function TableBlock({ block }: { block: Extract<MiloBlock, { type: 'table' }> }) {
  return (
    <section className="milo-block milo-block--table" aria-label={block.title}>
      <h4 className="milo-block__title">{block.title}</h4>
      <div className="milo-table-wrap">
        <table className="milo-table">
          <thead>
            <tr>
              {block.columns.map((c) => (
                <th key={c.key} scope="col">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i}>
                {block.columns.map((c) => (
                  <td key={c.key}>{row[c.key] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.truncated ? (
        <p className="milo-block__source">Mostrate le prime {block.rows.length} righe.</p>
      ) : null}
    </section>
  );
}

function HandoffBlock({ block }: { block: Extract<MiloBlock, { type: 'handoff' }> }) {
  return (
    <section className="milo-block milo-block--handoff" aria-label={block.title}>
      <h4 className="milo-block__title">{block.title}</h4>
      <p className="milo-handoff__text">{block.message}</p>
      <button
        type="button"
        className="btn-primary btn-sm"
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent(MILO_OPEN_ASSISTANT_EVENT, { detail: { message: block.message } }),
          )
        }
      >
        {block.label}
      </button>
    </section>
  );
}

function TrendBlock({ block }: { block: Extract<MiloBlock, { type: 'parameter_trend' }> }) {
  const selected = block.params.filter((p): p is TrendParameter => TREND_KEYS.has(p));
  if (!selected.length) return null;
  const readings = block.readings.map(
    (r) =>
      ({
        id: r.id,
        patientId: block.patientId,
        requestId: r.id,
        measuredAt: r.measuredAt,
        values: r.values,
        authorOperatorId: '',
        authorName: r.author ?? (r.source === 'cartella' ? 'Cartella clinica' : ''),
        createdAt: r.measuredAt,
      }) as PatientParameterReading,
  );
  return (
    <section className="milo-block milo-block--trend" aria-label={block.title}>
      <h4 className="milo-block__title">{block.title}</h4>
      <PatientParameterTrendChart readings={readings} selected={selected} period={block.period} />
    </section>
  );
}

export function MiloBlocks({ blocks }: { blocks?: MiloBlock[] }) {
  if (!blocks?.length) return null;
  return (
    <div className="milo-blocks" data-testid="milo-blocks">
      {blocks.map((block, i) => {
        if (block.type === 'kpi') return <KpiBlock key={i} block={block} />;
        if (block.type === 'table') return <TableBlock key={i} block={block} />;
        if (block.type === 'parameter_trend') return <TrendBlock key={i} block={block} />;
        if (block.type === 'handoff') return <HandoffBlock key={i} block={block} />;
        return null;
      })}
    </div>
  );
}
