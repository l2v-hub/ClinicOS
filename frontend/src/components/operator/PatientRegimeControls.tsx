import { PATIENT_REGIME_LABEL, type PatientRegimeFilter } from '../../lib/patientRegime';
import type { ListView } from '../../lib/patientListView';
import './PatientRegimeControls.css';

export function PatientRegimeControls({ regime, onChange, view, count, loaded, hasMore, unverified, loading }: {
  regime: PatientRegimeFilter;
  onChange: (value: PatientRegimeFilter) => void;
  view: ListView;
  count: number;
  loaded: number;
  hasMore: boolean;
  unverified: boolean;
  loading: boolean;
}) {
  return (
    <div className="plist-regime-controls">
      <label className="plist-regime-field" htmlFor="patient-regime">
        Regime registrato
        <select id="patient-regime" className="form-input" value={regime}
          onChange={event => onChange(event.target.value as PatientRegimeFilter)}>
          {Object.entries(PATIENT_REGIME_LABEL).map(([value, label]) =>
            <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <div className="plist-regime-summary" aria-live="polite" role="status">
        <p>{count} visualizzati su {loaded} pazienti caricati · conteggi e filtri sulle pagine caricate.</p>
        {view === 'in_carico' && <p>Non dimessi: senza dimissione registrata, inclusi Day Hospital,
          ambulatoriali e regime non disponibile.</p>}
        {unverified && <p>{loading ? 'Verifica regimi in corso.' : 'Conteggi per stato non disponibili.'}
          {' '}Un dato mancante non conferma il regime; l’elenco resta consultabile.</p>}
        {hasMore && <p>Altri pazienti non ancora caricati: carica altre pagine per ampliare il filtro.</p>}
      </div>
    </div>
  );
}
