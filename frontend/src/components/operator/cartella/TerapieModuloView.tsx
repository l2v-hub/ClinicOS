// Prescrizione Terapia Medica — Vista modulo cartaceo (fedele al template 09)
// Intestazione: Cognome | Nome | Camera | Patologia d'ingresso | Allergie | Diabetico | Ipertensione | Terapia triturata
// Sezioni: TERAPIA ORALE / IM-SC / INSULINICA / AL BISOGNO
// Colonne: Inizio | Terapia/farmaco | Medico | 08:00 | 12:00 | 16:00 | 18:00 | 20:00 | Medico | Fine | Note

import type { CartellaPaziente, Paziente, FarmacoItem } from '../../../types';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
}

const TIME_COLS = ['08:00', '12:00', '16:00', '18:00', '20:00'];
const TIME_KEYS: (keyof FarmacoItem)[] = ['h08', 'h12', 'h16', 'h18', 'h20'];

function sezionePerVia(via?: string): string {
  if (!via) return 'orale';
  const v = via.toLowerCase();
  if (v.includes('insul')) return 'insulinica';
  if (v.includes('bisogno') || v.includes('prn')) return 'bisogno';
  if (v.includes('im') || v.includes('intramusc') || v.includes('sc')) return 'im-sc';
  return 'orale';
}

function medicoSigla(nome: string): string {
  return nome.split(' ').map(p => p[0]).join('.') + '.';
}

function fmtDate(iso?: string): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('it-IT'); } catch { return iso; }
}

interface SectionTableProps {
  title: string;
  farmaci: FarmacoItem[];
  emptyRows?: number;
}

function SectionTable({ title, farmaci, emptyRows = 4 }: SectionTableProps) {
  const empty = Math.max(0, emptyRows - farmaci.length);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        background: '#1A3357', color: 'white', fontWeight: 700,
        fontSize: '8pt', padding: '3px 8px', letterSpacing: 1, textTransform: 'uppercase',
      }}>
        {title}
      </div>
      <table className="terapia-modulo-table">
        <thead>
          <tr>
            <th style={{ width: 55 }}>INIZIO</th>
            <th style={{ textAlign: 'left', minWidth: 130 }}>TERAPIA / FARMACO</th>
            <th style={{ width: 50 }}>MEDICO</th>
            {TIME_COLS.map(t => (
              <th key={t} className="time-hdr">{t}</th>
            ))}
            <th style={{ width: 50 }}>MEDICO</th>
            <th style={{ width: 55 }}>FINE</th>
            <th style={{ minWidth: 80 }}>NOTE</th>
          </tr>
        </thead>
        <tbody>
          {farmaci.map(f => (
            <tr key={f.id}>
              <td className="col-inizio">{fmtDate(f.inizio)}</td>
              <td className="col-farmaco" style={{ textAlign: 'left' }}>
                <span style={{ fontWeight: 700 }}>{f.nome}</span>
                {f.dose && <span style={{ fontWeight: 400 }}> {f.dose}</span>}
                {f.via && <span style={{ fontSize: '7pt', color: '#555' }}> — {f.via}</span>}
                {f.frequenza && <div style={{ fontSize: '7pt', color: '#555' }}>{f.frequenza}</div>}
              </td>
              <td className="col-medico" style={{ textAlign: 'center' }}>
                {f.prescrittoDA ? medicoSigla(f.prescrittoDA) : ''}
              </td>
              {TIME_KEYS.map((k) => (
                <td key={k} className="col-time">
                  {(f[k] as string | undefined) ?? ''}
                </td>
              ))}
              <td className="col-medico"></td>
              <td className="col-fine">{fmtDate(f.fine)}</td>
              <td style={{ fontSize: '7.5pt' }}>{f.note ?? ''}</td>
            </tr>
          ))}
          {Array.from({ length: empty }).map((_, i) => (
            <tr key={`e-${i}`} className="empty-row">
              <td></td><td></td><td></td>
              {TIME_COLS.map(t => <td key={t}></td>)}
              <td></td><td></td><td></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TerapieModuloView({ cartella, paziente }: Props) {
  const farmaci = (cartella.farmaci ?? []).filter(f => f.stato === 'attivo');

  const orali      = farmaci.filter(f => sezionePerVia(f.via) === 'orale');
  const imSc       = farmaci.filter(f => sezionePerVia(f.via) === 'im-sc');
  const insulinica = farmaci.filter(f => sezionePerVia(f.via) === 'insulinica');
  const bisogno    = farmaci.filter(f => sezionePerVia(f.via) === 'bisogno');

  const allergie = (cartella.allergie ?? []).map(a => a.allergene).join(', ');

  return (
    <div className="fm">
      {/* Titolo */}
      <div className="fm-title">PRESCRIZIONE TERAPIA MEDICA</div>

      {/* Intestazione paziente */}
      <div className="fm-patient-header" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 110px', gap: '4px 12px', marginBottom: 6 }}>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Cognome</span>
          <span className="fm-patient-field__val">{paziente.lastName}</span>
        </div>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Nome</span>
          <span className="fm-patient-field__val">{paziente.firstName}</span>
        </div>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Camera / Letto</span>
          <span className="fm-patient-field__val">
            {cartella.cameraNumero ?? ''}{cartella.lettoNumero ? ` / ${cartella.lettoNumero}` : ''}
          </span>
        </div>
        <div className="fm-patient-field" style={{ gridColumn: '1 / 3' }}>
          <span className="fm-patient-field__lbl">Patologia d&apos;ingresso</span>
          <span className="fm-patient-field__val">{cartella.patologiaIngresso ?? ''}</span>
        </div>
        <div className="fm-patient-field" style={{ gridColumn: '1 / 4' }}>
          <span className="fm-patient-field__lbl">Allergie</span>
          <span className="fm-patient-field__val" style={{ color: allergie ? '#B91C1C' : undefined, fontWeight: allergie ? 700 : undefined }}>
            {allergie || 'Nessuna allergia nota'}
          </span>
        </div>
      </div>

      {/* Flag clinici: Diabetico / Ipertensione / Terapia triturata */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 10, fontSize: '8.5pt', borderBottom: '1.5px solid #1A3357', paddingBottom: 6 }}>
        {([
          ['Diabetico',         cartella.diabetico],
          ['Ipertensione',      cartella.ipertensione],
          ['Terapia triturata', cartella.terapiaTriturata],
        ] as [string, boolean | undefined][]).map(([label, val]) => (
          <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="fm-cb__box" style={val ? { background: '#1A3357' } : undefined}></span>
            <span style={{ fontWeight: val ? 700 : 400 }}>{label}</span>
          </label>
        ))}
      </div>

      {/* Sezioni terapia */}
      <SectionTable title="TERAPIA ORALE"      farmaci={orali}      emptyRows={5} />
      <SectionTable title="TERAPIA IM – SC"    farmaci={imSc}       emptyRows={3} />
      <SectionTable title="TERAPIA INSULINICA" farmaci={insulinica} emptyRows={3} />
      <SectionTable title="TERAPIA AL BISOGNO" farmaci={bisogno}    emptyRows={3} />

      {/* Footer: medico responsabile + firma */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, borderTop: '1px solid #999', paddingTop: 10 }}>
        <div style={{ flex: 2 }}>
          <div style={{ fontWeight: 700, fontSize: '8pt', marginBottom: 4 }}>MEDICO RESPONSABILE</div>
          <div style={{ borderBottom: '1px solid #555', minHeight: 28 }}></div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="fm-signature">
            <span className="fm-signature__lbl">FIRMA</span>
            <span className="fm-signature__line"></span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="fm-signature">
            <span className="fm-signature__lbl">DATA</span>
            <span className="fm-signature__line"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
