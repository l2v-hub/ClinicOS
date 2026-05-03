// Parametri Vitali — Vista modulo cartaceo (fedele al template 08)
// Griglia mensile: 31 righe, colonne PA/FC/SpO2/EVAC/CATET/DTX/TC/FIRMA

import type { CartellaPaziente, Paziente, VitaleItem } from '../../../types';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
}

const COLS = [
  { key: 'PA',    label: 'PA',    sub: 'mmHg' },
  { key: 'FC',    label: 'FC',    sub: 'bpm' },
  { key: 'SPO2',  label: 'SpO₂', sub: '%' },
  { key: 'TEMP',  label: 'TC°',   sub: '°C' },
  { key: 'GLICEMIA', label: 'DTX', sub: 'mg/dl' },
  { key: 'EVAC',  label: 'EVAC',  sub: '' },
  { key: 'CATET', label: 'CATET', sub: '' },
];

function keyForCol(colKey: string, etichetta: string): boolean {
  const e = etichetta.toLowerCase();
  if (colKey === 'PA') return e.includes('press') || e.includes('pa');
  if (colKey === 'FC') return e.includes('card') || e.includes('fc') || e.includes('freq');
  if (colKey === 'SPO2') return e.includes('spo') || e.includes('sat') || e.includes('ossig');
  if (colKey === 'TEMP') return e.includes('temp') || e.includes('febbre');
  if (colKey === 'GLICEMIA') return e.includes('glic') || e.includes('dtx') || e.includes('gluc');
  if (colKey === 'EVAC') return e.includes('evac') || e.includes('fec') || e.includes('intestin');
  if (colKey === 'CATET') return e.includes('catet') || e.includes('vescic');
  return false;
}

export function ParametriModuloView({ cartella, paziente }: Props) {
  // Group vitals by day
  const byDay: Record<string, VitaleItem[]> = {};
  for (const v of cartella.parametriVitali) {
    const d = v.rilevato.slice(0, 10);
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(v);
  }

  const sortedDays = Object.keys(byDay).sort();
  const today = new Date();
  const mese = today.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  function getVal(day: string, colKey: string): string {
    const items = byDay[day] ?? [];
    const match = items.find(v => keyForCol(colKey, v.etichetta));
    return match ? match.valore : '';
  }

  function getFirma(day: string): string {
    const items = byDay[day] ?? [];
    if (!items.length) return '';
    return items[0].rilevatoDa.split(' ').map(p => p[0]).join('.');
  }

  const allDays = sortedDays.length > 0 ? sortedDays : [];

  // For the month grid: always show rows (at least the days with data, or 31 empty rows)
  const gridRows: string[] = allDays.length > 0 ? allDays : Array.from({ length: 10 }, () => '');

  return (
    <div className="fm">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '12pt', textTransform: 'uppercase' }}>Parametri Vitali</div>
          <div style={{ fontSize: '10pt' }}>Cognome: <strong>{paziente.lastName}</strong> &nbsp; Nome: <strong>{paziente.firstName}</strong></div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '10pt' }}>
          <div>Mese/Anno: <strong style={{ textTransform: 'capitalize' }}>{mese}</strong></div>
          <div style={{ marginTop: 4, padding: '2px 8px', border: '1.5px solid #1A3357', display: 'inline-block', fontWeight: 700, fontSize: '9pt', background: '#1A3357', color: 'white' }}>FIRMA IP</div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="parametri-modulo-table">
          <thead>
            <tr>
              <th style={{ width: 24 }}>#</th>
              {COLS.map(c => (
                <th key={c.key} style={{ fontSize: '7.5pt' }}>
                  {c.label}
                  {c.sub && <><br /><span style={{ fontSize: '7pt', fontWeight: 400 }}>{c.sub}</span></>}
                </th>
              ))}
              {/* Time-based DTX cols */}
              <th className="hdr-firma" colSpan={2} style={{ fontSize: '7.5pt' }}>FIRMA IP<br /><span style={{ fontWeight: 400, fontSize: '7pt' }}>M / P</span></th>
            </tr>
          </thead>
          <tbody>
            {gridRows.map((day, idx) => {
              const hasData = !!day && !!byDay[day];
              return (
                <tr key={day || idx}>
                  <td className="col-day">{idx + 1}</td>
                  {COLS.map(c => {
                    const val = hasData ? getVal(day, c.key) : '';
                    return (
                      <td key={c.key} className={val ? 'has-value' : ''} style={{ minWidth: 44 }}>
                        {val}
                      </td>
                    );
                  })}
                  <td style={{ minWidth: 36, fontSize: '8pt' }}>{hasData ? getFirma(day) : ''}</td>
                  <td style={{ minWidth: 36 }}></td>
                </tr>
              );
            })}
            {/* Fill remaining rows to reach 31 */}
            {Array.from({ length: Math.max(0, 31 - gridRows.length) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="col-day">{gridRows.length + i + 1}</td>
                {COLS.map(c => <td key={c.key}></td>)}
                <td></td><td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
