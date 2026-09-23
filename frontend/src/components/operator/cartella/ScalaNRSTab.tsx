import type { CartellaPaziente, Paziente } from '../../../types';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PatientIntakeReviewState } from '../PatientIntakeReview';
import { NrsLegacyContent, NrsLegacyRecord } from '../assessments/NrsLegacyContent';
export { nrsSeverity } from '../../../lib/assessments/nrsLegacy';

interface NrsPrintSelection { value: unknown; patient?: Paziente; origin: string }
export function NrsPrintDocument({ selection }: { selection: NrsPrintSelection }) {
  return <div className="nrs-print-surface nrs-legacy" role="document" aria-label="Stampa singolo dato NRS precedente">
    <h1>NRS · dato precedente</h1><p>{selection.origin}</p>
    <p>Dato originale in sola lettura. Operatore e date riportati non attestano una finalizzazione o un autore autenticato.</p>
    <NrsLegacyRecord value={selection.value} patient={selection.patient} print />
  </div>;
}
const confirmationLabel = (value: string | null) => value ? `Ingresso confermato il ${new Intl.DateTimeFormat('it-IT', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Rome' }).format(new Date(value))}` : 'Data conferma ingresso non riportata';

interface Props {
  cartella: CartellaPaziente;
  paziente?: Paziente;
  intakeReview?: PatientIntakeReviewState;
  onRetryIntake?: () => void;
}
export function ScalaNRSTab(props: Props) {
  return <NrsSession key={props.paziente?.id ?? 'without-patient'} {...props} />;
}
function NrsSession({ cartella, paziente, intakeReview, onRetryIntake }: Props) {
  const [selection, setSelection] = useState<NrsPrintSelection | null>(null);
  const patientId = paziente?.id;
  const currentSelection = selection?.patient?.id === patientId ? selection : null;
  useEffect(() => {
    if (!currentSelection) return;
    const owner = crypto.randomUUID();
    document.body.setAttribute('data-nrs-print', owner);
    const restore = () => {
      if (document.body.getAttribute('data-nrs-print') === owner) document.body.removeAttribute('data-nrs-print');
    };
    const finish = () => { restore(); setSelection(null); };
    window.addEventListener('afterprint', finish);
    const timer = window.setTimeout(() => { try { window.print(); } catch { finish(); } }, 0);
    return () => { window.clearTimeout(timer); window.removeEventListener('afterprint', finish); restore(); };
  }, [currentSelection]);
  const print = (value: unknown, origin: string) => setSelection({ value: structuredClone(value), patient: paziente ? structuredClone(paziente) : undefined, origin });
  return <div className="cr-tab-content nrs-legacy">
    <h2>Storico NRS precedente</h2>
    <p>Dati originali in sola lettura. Date e operatori sono quelli riportati, senza attestare finalizzazione o autore autenticato. L’identità mostrata è quella attuale della cartella. Il modulo PAINAD è disponibile nel catalogo.</p>
    {Object.hasOwn(cartella, 'valutazioniNRS') ? <NrsLegacyContent value={cartella.valutazioniNRS} patient={paziente} title="Valutazioni NRS della cartella" notice={false} onPrint={value => print(value, 'Storico NRS della cartella · dato precedente')} /> : <p>Nessuna valutazione NRS precedente nella cartella.</p>}
    {intakeReview && <section aria-label="Dati dolore dall’ingresso">
      <h3>Dati dolore dall’ingresso · non confermati come valutazione</h3>
      {intakeReview.status === 'loading' && <p>Caricamento dei dati conservati nell’ingresso…</p>}
      {(intakeReview.status === 'error' || intakeReview.data?.legacyPainError) && <p role="alert">
        {intakeReview.data?.legacyPainError ? 'I dati dolore dell’ingresso superano il limite di consultazione. I dati originali sono conservati; questa risposta non indica assenza di dati.' : 'Impossibile caricare i dati dolore dell’ingresso.'}
        {' '}<button type="button" className="btn-secondary btn-sm" onClick={onRetryIntake}>Riprova dati d’ingresso</button>
      </p>}
      {intakeReview.status === 'ready' && !intakeReview.data?.legacyPainError && intakeReview.data?.legacyPainDrafts?.length === 0 && <p>Nessun dato dolore conservato da ingressi precedenti.</p>}
      {intakeReview.data?.legacyPainDrafts?.map(draft => <section key={draft.draftId}>
        <p>{confirmationLabel(draft.confirmedAt)}</p>
        <NrsLegacyContent value={draft.pain} patient={paziente} title="Dato dolore conservato dall’ingresso" intake notice={false} onPrint={value => print(value, `Dati dolore dall’ingresso · non confermati come valutazione. ${confirmationLabel(draft.confirmedAt)}`)} />
      </section>)}
    </section>}
    {currentSelection && typeof document !== 'undefined' && createPortal(<NrsPrintDocument selection={currentSelection} />, document.body)}
  </div>;
}
