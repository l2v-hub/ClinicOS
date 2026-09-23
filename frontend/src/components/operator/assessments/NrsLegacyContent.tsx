import type { Paziente } from '../../../types';
import { nrsLegacyObject, nrsLegacyText, nrsSeverity } from '../../../lib/assessments/nrsLegacy';
import { PatientIdentity } from '../../shared/PatientIdentity';
import './AssessmentCatalog.css';

export function NrsLegacyRecord({ value, patient, print = false }: { value: unknown; patient?: Paziente; print?: boolean }) {
  const record = nrsLegacyObject(value);
  const severity = record ? nrsSeverity(record.punteggio) : null;
  const extras = record ? Object.fromEntries(Object.entries(record).filter(([key]) => !['data', 'ora', 'createdAt', 'operatore', 'punteggio', 'aRiposo', 'inMovimento', 'sede', 'note'].includes(key))) : null;
  return <article>
    {patient && <PatientIdentity patient={patient} />}
    {record && <>
      <dl>
        {[['data', 'Data riportata'], ['ora', 'Ora riportata'], ['createdAt', 'Registrazione riportata'], ['operatore', 'Operatore riportato']].map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{nrsLegacyText(record[key])}</dd></div>)}
      </dl>
      <p>Punteggio riportato: <strong>{nrsLegacyText(record.punteggio)}{severity ? ' / 10' : ''}</strong>{severity ? ` · ${severity.label}` : ' · Nessuna fascia: punteggio assente o non valido'}</p>
      <p>A riposo: {nrsLegacyText(record.aRiposo)} · In movimento: {nrsLegacyText(record.inMovimento)}</p>
      <p>Sede: {nrsLegacyText(record.sede)}</p>
      <p className="nrs-legacy-note">Note riportate: {nrsLegacyText(record.note)}</p>
    </>}
    {print ? (!record || (extras && Object.keys(extras).length > 0)) && <div><h4>Altri dati originali</h4><pre>{nrsLegacyText(record ? extras : value)}</pre></div> : <details><summary>Dati originali</summary><pre>{nrsLegacyText(value)}</pre></details>}
  </article>;
}
export function NrsLegacyContent({ value, patient, title = 'Dati NRS precedenti', intake = false, onPrint, notice = true }: { value: unknown; patient?: Paziente; title?: string; intake?: boolean; onPrint?: (record: unknown) => void; notice?: boolean }) {
  const rows = Array.isArray(value) ? value : [value];
  return <section className="nrs-legacy" aria-label={title}>
    <h3>{title}</h3>
    {notice && <><p>{intake ? 'Dati conservati dalla bozza d’ingresso, non confermati come valutazione. Non sono copiati nelle nuove valutazioni.' : 'Storico precedente in sola lettura. Il modulo PAINAD è disponibile nel catalogo.'}</p>
    <p>Operatore, data e ora sono quelli riportati nel dato originale; non attestano una finalizzazione o un autore autenticato.{patient ? ' L’identità mostrata è quella attuale della cartella.' : ''}</p></>}
    {!rows.length && <p>Nessuna rilevazione presente nel dato originale.</p>}
    {rows.map((row, index) => {
      const record = nrsLegacyObject(row);
      const severity = record ? nrsSeverity(record.punteggio) : null;
      return <details key={index}>
        <summary>{record ? `${nrsLegacyText(record.data)} · ${nrsLegacyText(record.operatore)} · ${severity ? `${String(record.punteggio)}/10 · ${severity.label}` : 'Punteggio assente o non valido'}` : `Dato originale ${index + 1} · formato non interpretabile come scheda NRS`}</summary>
        {onPrint && <button type="button" className="btn-secondary btn-sm no-print" onClick={() => onPrint(row)}>Stampa dato precedente</button>}
        <NrsLegacyRecord value={row} patient={patient} />
      </details>;
    })}
  </section>;
}
