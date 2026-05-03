// Prescrizione Terapia Medica — Vista modulo cartaceo (fedele al template 09)
// Sezioni: TERAPIA ORALE / IM-SC / INSULINICA / AL BISOGNO
// Colonne orario: 8 | 12 | 16 | 18 | 20 | MEDICO

import type { CartellaPaziente, Paziente, FarmacoItem } from '../../../types';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
}

const TIME_COLS = ['8', '12', '16', '18', '20'];

// Map farmaco.via to terapia section
function sezionePerVia(via?: string): string {
  if (!via) return 'orale';
  const v = via.toLowerCase();
  if (v.includes('oral') || v.includes('os') || v.includes('po')) return 'orale';
  if (v.includes('insul') || v.includes('sc') && v.includes('ins')) return 'insulinica';
  if (v.includes('im') || v.includes('intramusc') || v.includes('sc')) return 'im-sc';
  if (v.includes('bisogno') || v.includes('prn') || v.includes('al need')) return 'bisogno';
  return 'orale';
}

// Extract time hints from frequenza string (e.g. "8-20", "3x/die" → distribute)
function timeMark(farmaco: FarmacoItem, col: string): string {
  const f = farmaco.frequenza?.toLowerCase() ?? '';
  // Explicit time match
  if (f.includes(col + ':') || f.includes('ore ' + col) || f.includes('h' + col)) return '✓';
  // Implicit: "1×/die" → 8, "2×/die" → 8+20, "3×/die" → 8+14+20
  if (f.includes('1×') || f.includes('1x') || f === '1/die' || f === 'una volta') {
    return col === '8' ? farmaco.dose ?? '' : '';
  }
  if (f.includes('2×') || f.includes('2x') || f.includes('due')) {
    return (col === '8' || col === '20') ? farmaco.dose ?? '' : '';
  }
  if (f.includes('3×') || f.includes('3x') || f.includes('tre')) {
    return (col === '8' || col === '16' || col === '20') ? farmaco.dose ?? '' : '';
  }
  // Default: put dose under 8
  return col === '8' ? farmaco.dose ?? '' : '';
}

function MedicoInitials(prescrittoDA: string): string {
  return prescrittoDA.split(' ').map(p => p[0]).join('.');
}

interface SectionTableProps {
  title: string;
  farmaci: FarmacoItem[];
  emptyRows?: number;
}

function SectionTable({ title, farmaci, emptyRows = 4 }: SectionTableProps) {
  const empty = Math.max(0, emptyRows - farmaci.length);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        background: '#1A3357', color: 'white', fontWeight: 700,
        fontSize: '8pt', padding: '3px 8px', letterSpacing: 1,
      }}>
        {title}
      </div>
      <table className="terapia-modulo-table">
        <thead>
          <tr>
            <th style={{ width: 160, textAlign: 'left' }}>FARMACO / DOSE</th>
            <th style={{ width: 80 }}>VIA / FREQ.</th>
            {TIME_COLS.map(t => (
              <th key={t} className="time-hdr">{t}</th>
            ))}
            <th style={{ width: 55, fontSize: '7pt' }}>MEDICO</th>
          </tr>
        </thead>
        <tbody>
          {farmaci.map(f => (
            <tr key={f.id}>
              <td style={{ textAlign: 'left', fontWeight: 600, fontSize: '8pt' }}>
                {f.nome}
                {f.dose && <span style={{ fontWeight: 400, marginLeft: 4 }}>{f.dose}</span>}
              </td>
              <td style={{ fontSize: '7.5pt', textAlign: 'center' }}>
                {f.via ?? ''}<br />
                <span style={{ fontSize: '7pt', color: '#444' }}>{f.frequenza}</span>
              </td>
              {TIME_COLS.map(t => (
                <td key={t} className="time-hdr" style={{ fontSize: '8pt' }}>
                  {timeMark(f, t)}
                </td>
              ))}
              <td style={{ fontSize: '7.5pt', textAlign: 'center' }}>
                {MedicoInitials(f.prescrittoDA)}
              </td>
            </tr>
          ))}
          {Array.from({ length: empty }).map((_, i) => (
            <tr key={`e-${i}`} className="empty-row">
              <td></td><td></td>
              {TIME_COLS.map(t => <td key={t}></td>)}
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TerapieModuloView({ cartella, paziente }: Props) {
  const farmaci = cartella.farmaci.filter(f => f.stato === 'attivo');

  const orali     = farmaci.filter(f => sezionePerVia(f.via) === 'orale');
  const imSc      = farmaci.filter(f => sezionePerVia(f.via) === 'im-sc');
  const insulinica = farmaci.filter(f => sezionePerVia(f.via) === 'insulinica');
  const bisogno   = farmaci.filter(f => sezionePerVia(f.via) === 'bisogno');

  // Allergies from CartellaPaziente
  const allergie = cartella.allergie?.map(a => a.allergene).join(', ') ?? '';

  return (
    <div className="fm">
      {/* Header */}
      <div className="fm-title">PRESCRIZIONE TERAPIA MEDICA</div>

      <div className="fm-patient-header cols-4" style={{ marginBottom: 8 }}>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Cognome e Nome</span>
          <span className="fm-patient-field__val">{paziente.lastName} {paziente.firstName}</span>
        </div>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">N. Cartella / Tessera</span>
          <span className="fm-patient-field__val">{paziente.medicalRecordNumber}</span>
        </div>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Data di Nascita</span>
          <span className="fm-patient-field__val">{paziente.dateOfBirth ? new Date(paziente.dateOfBirth).toLocaleDateString('it-IT') : ''}</span>
        </div>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Camera / Letto</span>
          <span className="fm-patient-field__val"></span>
        </div>
      </div>

      {/* Clinical flags row */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 8, fontSize: '8.5pt', borderBottom: '1px solid #1A3357', paddingBottom: 6 }}>
        <div>
          <span style={{ fontWeight: 700 }}>ALLERGIE: </span>
          <span style={{ borderBottom: '1px dotted #555', minWidth: 120, display: 'inline-block', paddingRight: 4 }}>
            {allergie || ''}
          </span>
        </div>
        {(['DIABETICO', 'IPERTESO', 'CARDIOPATICO', 'EPATOPATICO'] as const).map(flag => (
          <label key={flag} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="fm-cb__box"></span>
            <span>{flag}</span>
          </label>
        ))}
      </div>

      {/* Therapy sections */}
      <SectionTable title="TERAPIA ORALE" farmaci={orali} emptyRows={5} />
      <SectionTable title="TERAPIA IM – SC" farmaci={imSc} emptyRows={3} />
      <SectionTable title="TERAPIA INSULINICA" farmaci={insulinica} emptyRows={3} />
      <SectionTable title="TERAPIA AL BISOGNO" farmaci={bisogno} emptyRows={3} />

      {/* Notes + signature */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <div style={{ flex: 2 }}>
          <div style={{ fontWeight: 700, fontSize: '8pt', marginBottom: 4 }}>NOTE</div>
          <div className="fm-notes"></div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="fm-signature">
            <span className="fm-signature__lbl">FIRMA MEDICO RESPONSABILE</span>
            <span className="fm-signature__line"></span>
          </div>
          <div className="fm-signature" style={{ marginTop: 12 }}>
            <span className="fm-signature__lbl">DATA</span>
            <span className="fm-signature__line"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
