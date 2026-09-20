import { useId } from 'react';
import type { TherapyFormValue } from './TherapyFormFields';
import { formatFraction } from './therapyDose';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const TYPES = { periodica: 'Periodica', una_tantum: 'Una tantum', al_bisogno: 'Al bisogno' };

function dateLabel(value: string) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : 'da indicare';
}

/** Preview entered values only: missing OCR information must never look confirmed. */
export function TherapyFormPreview({ value }: { value: TherapyFormValue }) {
  const id = useId();
  return (
    <aside className="therapy-form__preview" aria-labelledby={id}>
      <h3 id={id}>Riepilogo della terapia</h3>
      <div className="therapy-form__preview-heading">
        <strong>{value.farmacoNome || 'Farmaco da selezionare'}</strong>
        <span>
          {TYPES[value.tipo]} · {value.stato}
        </span>
      </div>
      <p>
        Via: {value.viaSomministrazione || 'da indicare'} · Inizio: {dateLabel(value.dataInizio)}
        {value.tipo === 'periodica' && value.dataFine && ` · Fine: ${dateLabel(value.dataFine)}`}
      </p>
      {value.tipo === 'periodica' && (
        <>
          <p>
            {value.giorniSettimana.length === 0
              ? 'Tutti i giorni'
              : `Giorni: ${value.giorniSettimana.map((day) => WEEKDAYS[day - 1]).join(', ')}`}
          </p>
          {value.schedules.length > 0 ? (
            <ul>
              {value.schedules.map((schedule, i) => (
                <li key={i}>
                  <strong>{schedule.time || 'Orario da indicare'}</strong>
                  <span>
                    {schedule.quantityNumerator > 0 && schedule.quantityDenominator > 0
                      ? formatFraction(schedule.quantityNumerator, schedule.quantityDenominator)
                      : 'Quantità da indicare'}{' '}
                    {schedule.administrationUnit || '· unità da indicare'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>Orari e dosi da indicare.</p>
          )}
        </>
      )}
      {value.tipo === 'una_tantum' && (
        <p>
          Somministrazione: {dateLabel(value.dataSomministrazione)} ·{' '}
          {value.orarioSomministrazione || 'orario da indicare'}
        </p>
      )}
      {value.tipo === 'al_bisogno' && (
        <p>
          {value.note.trim()
            ? 'Indicazioni nelle note.'
            : 'Indicazioni al bisogno da specificare nelle note.'}
        </p>
      )}
    </aside>
  );
}
