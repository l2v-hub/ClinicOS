import { useState, useEffect } from 'react';
import type { Paziente, ParametroGiorno } from '../../../types';
import { IcoCheck, IcoX } from '../../../icons';
import { nowTime } from './shared';

interface VitaleModalProps {
  paziente: Paziente;
  giorno: number;
  mese: number;
  anno: number;
  colKey: keyof ParametroGiorno | null;
  colLabel: string;
  colSub?: string;
  currentData: ParametroGiorno;
  operatoreNome: string;
  onSave: (updated: ParametroGiorno) => void;
  onClose: () => void;
}

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

const EVACUAZIONE_OPTIONS = ['—', 'Sì', 'No', 'Alvo regolare', 'Stipsi', 'Diarrea'];

export function VitaleModal({
  paziente, giorno, mese, anno, colKey, colLabel, colSub,
  currentData, operatoreNome, onSave, onClose,
}: VitaleModalProps) {
  const [form, setForm] = useState<ParametroGiorno>({ ...currentData });
  const [paSis, setPaSis] = useState('');
  const [paDia, setPaDia] = useState('');
  const [oraRilevazione, setOraRilevazione] = useState(nowTime());
  const [operatore, setOperatore] = useState(operatoreNome);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);

  // Parse existing PA value into sistolica/diastolica
  useEffect(() => {
    if (currentData.pa) {
      const parts = currentData.pa.split('/');
      if (parts.length === 2) {
        setPaSis(parts[0].trim());
        setPaDia(parts[1].trim());
      }
    }
  }, [currentData.pa]);

  // ESC close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function setF(k: keyof ParametroGiorno, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
    if (errorField === k) { setError(null); setErrorField(null); }
  }

  function validate(): boolean {
    if (colKey === 'pa' || colKey === null) {
      // PA only required when editing PA specifically
      if (colKey === 'pa' && !paSis.trim()) {
        setError('Inserisci il valore sistolico');
        setErrorField('pa');
        return false;
      }
    }
    const numericKeys: (keyof ParametroGiorno)[] = ['fc', 'spo2', 'temperatura', 'dtx08', 'dtx12', 'dtx18'];
    if (colKey && numericKeys.includes(colKey)) {
      const val = form[colKey] as string | undefined;
      if (!val?.trim()) {
        setError('Compila il valore del parametro');
        setErrorField(String(colKey));
        return false;
      }
    }
    return true;
  }

  function handleSave() {
    if (!validate()) return;

    const updated = { ...form };
    // Combine PA
    if (colKey === 'pa' || colKey === null) {
      if (paSis.trim()) {
        updated.pa = paDia.trim() ? `${paSis.trim()}/${paDia.trim()}` : paSis.trim();
      }
    }
    onSave(updated);
  }

  const formattedDate = `${giorno} ${MESI[mese - 1]} ${anno}`;

  function renderField(key: keyof ParametroGiorno, label: string, sub?: string) {
    if (key === 'giorno') return null;
    const isErr = errorField === String(key);

    if (key === 'pa') {
      return (
        <div key="pa" className={`npm-field${isErr ? ' npm-field--error' : ''}`}>
          <label className="npm-label">Sistolica (mmHg) *</label>
          <input className={`npm-input${isErr ? ' npm-input--error' : ''}`}
            type="number" value={paSis} onChange={e => { setPaSis(e.target.value); if (isErr) { setError(null); setErrorField(null); } }}
            placeholder="120" />
          <label className="npm-label" style={{ marginTop: 8 }}>Diastolica (mmHg)</label>
          <input className="npm-input" type="number" value={paDia} onChange={e => setPaDia(e.target.value)}
            placeholder="80" />
          {isErr && error && <span className="npm-field-error">{error}</span>}
        </div>
      );
    }

    if (key === 'evacuazione') {
      return (
        <div key="evacuazione" className="npm-field">
          <label className="npm-label">Evacuazione</label>
          <select className="npm-input npm-select" value={(form.evacuazione as string) ?? '—'}
            onChange={e => setF('evacuazione', e.target.value)}>
            {EVACUAZIONE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    }

    if (key === 'note') {
      return (
        <div key="note" className="npm-field npm-span-2">
          <label className="npm-label">Note</label>
          <textarea className="npm-input npm-textarea" rows={3}
            value={(form.note as string) ?? ''} onChange={e => setF('note', e.target.value)}
            placeholder="Eventuali note..." />
        </div>
      );
    }

    const fieldLabels: Record<string, string> = {
      fc: 'Frequenza cardiaca (bpm)',
      spo2: 'Saturazione SpO\u2082 (%)',
      temperatura: 'Temperatura (\u00b0C)',
      dtx08: 'Glicemia / DTX 08 (mg/dL)',
      dtx12: 'Glicemia / DTX 12 (mg/dL)',
      dtx18: 'Glicemia / DTX 18 (mg/dL)',
      catetere: 'Diuresi / Catetere (ml)',
      firmaIpM: 'Firma IP Mattina',
      firmaIpP: 'Firma IP Pomeriggio',
    };

    const displayLabel = fieldLabels[key] ?? `${label}${sub ? ` (${sub})` : ''}`;
    const numericKeys: (keyof ParametroGiorno)[] = ['fc', 'spo2', 'temperatura', 'dtx08', 'dtx12', 'dtx18', 'catetere'];
    const isNumeric = numericKeys.includes(key);

    return (
      <div key={String(key)} className={`npm-field${isErr ? ' npm-field--error' : ''}`}>
        <label className="npm-label">{displayLabel}</label>
        <input className={`npm-input${isErr ? ' npm-input--error' : ''}`}
          type={isNumeric ? 'number' : 'text'}
          value={(form[key] as string | undefined) ?? ''}
          onChange={e => setF(key, e.target.value)}
          placeholder={sub ?? ''} />
        {isErr && error && <span className="npm-field-error">{error}</span>}
      </div>
    );
  }

  const GRID_COLS: { key: keyof ParametroGiorno; label: string; sub?: string }[] = [
    { key: 'pa', label: 'PA', sub: 'mmHg' },
    { key: 'fc', label: 'FC', sub: 'bpm' },
    { key: 'spo2', label: 'SpO\u2082', sub: '%' },
    { key: 'temperatura', label: 'TC', sub: '\u00b0C' },
    { key: 'dtx08', label: 'DTX 08', sub: 'mg/dl' },
    { key: 'dtx12', label: 'DTX 12', sub: 'mg/dl' },
    { key: 'dtx18', label: 'DTX 18', sub: 'mg/dl' },
    { key: 'evacuazione', label: 'EVAC', sub: '' },
    { key: 'catetere', label: 'CATET', sub: '' },
    { key: 'firmaIpM', label: 'IP M', sub: '' },
    { key: 'firmaIpP', label: 'IP P', sub: '' },
    { key: 'note', label: 'NOTE', sub: '' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--vitale" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="npm-header">
          <div className="npm-header__text">
            <h3 className="npm-header__title">Modifica parametro vitale</h3>
            <p className="npm-header__subtitle">
              {paziente.lastName} {paziente.firstName} &middot; {formattedDate} &middot; {colLabel}
            </p>
          </div>
          <button className="icon-btn npm-close-btn" onClick={onClose} aria-label="Chiudi">
            <IcoX />
          </button>
        </div>

        {/* Body */}
        <div className="npm-body">
          <div className="npm-grid">
            {colKey === null
              ? GRID_COLS.map(c => renderField(c.key, c.label, c.sub))
              : renderField(colKey, colLabel, colSub)
            }

            {/* Always show time and operator */}
            <div className="npm-field">
              <label className="npm-label">Ora rilevazione</label>
              <input className="npm-input" type="time" value={oraRilevazione}
                onChange={e => setOraRilevazione(e.target.value)} />
            </div>
            <div className="npm-field">
              <label className="npm-label">Operatore</label>
              <input className="npm-input" value={operatore}
                onChange={e => setOperatore(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="npm-footer">
          <div className="npm-footer__actions">
            <button className="btn-secondary" onClick={onClose}>Annulla</button>
            <button className="btn-primary" onClick={handleSave}><IcoCheck /> Salva parametro</button>
          </div>
        </div>

      </div>
    </div>
  );
}
