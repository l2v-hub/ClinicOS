// Parametri Vitali — Template 08
// Griglia mensile A4 orizzontale: 31 righe × 12 colonne

import type { CartellaPaziente, Paziente, VitaleItem } from '../../../types';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
}

const COLS = [
  { key: 'PA1',    label: 'PA',              sub: '1ª rilev.',  width: 52 },
  { key: 'FC',     label: 'FC',              sub: 'bpm',        width: 40 },
  { key: 'SPO2',   label: 'SpO₂',           sub: '%',          width: 40 },
  { key: 'PA2',    label: 'PA',              sub: '2ª rilev.',  width: 52 },
  { key: 'EVAC',   label: 'Evacuaz.',        sub: '',           width: 44 },
  { key: 'CATET',  label: 'Catet.',          sub: '',           width: 44 },
  { key: 'DTX8',   label: 'DTX',            sub: '08:00',      width: 44 },
  { key: 'DTX12',  label: 'DTX',            sub: '12:00',      width: 44 },
  { key: 'DTX18',  label: 'DTX',            sub: '18:00',      width: 44 },
  { key: 'TEMP',   label: 'TC°',            sub: '°C',         width: 40 },
  { key: 'FIRMA_M', label: 'Firma IP',      sub: 'Mattina',    width: 56 },
  { key: 'FIRMA_P', label: 'Firma IP',      sub: 'Pomeriggio', width: 56 },
];

function matchCol(colKey: string, etichetta: string): boolean {
  const e = etichetta.toLowerCase();
  switch (colKey) {
    case 'PA1':   return (e.includes('press') || e.includes(' pa') || e.startsWith('pa')) && !e.includes('2') && !e.includes('second');
    case 'PA2':   return (e.includes('press') || e.includes('pa')) && (e.includes('2') || e.includes('second'));
    case 'FC':    return e.includes('card') || e.includes('fc') || e.includes('freq');
    case 'SPO2':  return e.includes('spo') || e.includes('sat') || e.includes('ossig');
    case 'TEMP':  return e.includes('temp') || e.includes('febbre');
    case 'DTX8':  return (e.includes('glic') || e.includes('dtx') || e.includes('gluc')) && e.includes('08');
    case 'DTX12': return (e.includes('glic') || e.includes('dtx') || e.includes('gluc')) && e.includes('12');
    case 'DTX18': return (e.includes('glic') || e.includes('dtx') || e.includes('gluc')) && e.includes('18');
    case 'EVAC':  return e.includes('evac') || e.includes('fec') || e.includes('intestin');
    case 'CATET': return e.includes('catet') || e.includes('vescic');
    default:      return false;
  }
}

function getVal(items: VitaleItem[], colKey: string): string {
  // For DTX without time tag, fall back to any DTX match
  if (['DTX8','DTX12','DTX18'].includes(colKey)) {
    const exact = items.find(v => matchCol(colKey, v.etichetta));
    if (exact) return exact.valore;
    // fallback: any DTX — split across slots
    const dtxAll = items.filter(v => {
      const e = v.etichetta.toLowerCase();
      return e.includes('glic') || e.includes('dtx') || e.includes('gluc');
    });
    if (colKey === 'DTX8' && dtxAll[0]) return dtxAll[0].valore;
    if (colKey === 'DTX12' && dtxAll[1]) return dtxAll[1].valore;
    if (colKey === 'DTX18' && dtxAll[2]) return dtxAll[2].valore;
    return '';
  }
  const match = items.find(v => matchCol(colKey, v.etichetta));
  return match ? match.valore : '';
}

function initials(name: string): string {
  return name.split(' ').map(p => p[0]).join('.') + '.';
}

export function ParametriModuloView({ cartella, paziente }: Props) {
  const byDay: Record<string, VitaleItem[]> = {};
  for (const v of cartella.parametriVitali) {
    const d = v.rilevato.slice(0, 10);
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(v);
  }

  const sortedDays = Object.keys(byDay).sort();
  const today = new Date();
  const mese = today.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  // Build 31-row grid
  const gridRows: (string | null)[] = Array.from({ length: 31 }, (_, i) => {
    if (sortedDays[i]) return sortedDays[i];
    return null;
  });

  return (
    <div className="fm fm--landscape parametri-modulo-wrap">
      {/* Intestazione */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '13pt', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #1A3357', paddingBottom: 3, marginBottom: 6 }}>
            Parametri Vitali
          </div>
          <div style={{ fontSize: '10pt', display: 'flex', gap: 24 }}>
            <span>Cognome: <strong style={{ fontSize: '11pt' }}>{paziente.lastName}</strong></span>
            <span>Nome: <strong style={{ fontSize: '11pt' }}>{paziente.firstName}</strong></span>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '10pt' }}>
          <div>Mese / Anno: <strong style={{ textTransform: 'capitalize', fontSize: '11pt' }}>{mese}</strong></div>
        </div>
      </div>

      {/* Griglia */}
      <table className="parametri-modulo-table" style={{ tableLayout: 'fixed', width: '100%' }}>
        <colgroup>
          <col style={{ width: 26 }} />
          {COLS.map(c => <col key={c.key} style={{ width: c.width }} />)}
        </colgroup>
        <thead>
          <tr>
            <th style={{ fontSize: '7.5pt' }}>G</th>
            {COLS.map(c => (
              <th key={c.key} style={{ fontSize: '7.5pt' }}>
                {c.label}
                {c.sub && <><br /><span style={{ fontWeight: 400, fontSize: '7pt' }}>{c.sub}</span></>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gridRows.map((day, idx) => {
            const items = day ? (byDay[day] ?? []) : [];
            const hasData = items.length > 0;
            const firmaM = hasData ? initials(items[0].rilevatoDa) : '';
            return (
              <tr key={day ?? `r${idx}`}>
                <td className="col-day">{idx + 1}</td>
                {COLS.map(c => {
                  if (c.key === 'FIRMA_M') {
                    return <td key="FIRMA_M" style={{ fontSize: '7.5pt' }}>{firmaM}</td>;
                  }
                  if (c.key === 'FIRMA_P') {
                    return <td key="FIRMA_P"></td>;
                  }
                  const val = hasData ? getVal(items, c.key) : '';
                  return (
                    <td key={c.key} className={val ? 'has-value' : ''} style={{ fontSize: '8pt' }}>
                      {val}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer firma */}
      <div style={{ marginTop: 12, display: 'flex', gap: 40, fontSize: '8.5pt' }}>
        <div>Firma responsabile turno M: <span style={{ display: 'inline-block', width: 120, borderBottom: '1px solid #333' }}></span></div>
        <div>Firma responsabile turno P: <span style={{ display: 'inline-block', width: 120, borderBottom: '1px solid #333' }}></span></div>
      </div>
    </div>
  );
}
