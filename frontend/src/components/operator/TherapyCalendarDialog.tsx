import { useId } from 'react';
import type { GiroTime } from '../../lib/therapyGiro';
import { doseStatus } from '../../lib/therapyDoseStatus';
import { patientIdentityName } from '../../lib/patientIdentity';
import { AccessibleDialogSurface } from '../shared/AccessibleDialogSurface';
import { IcoChevronRight } from '../../icons';

export function TherapyCalendarDialog({ date, time, onClose, onOpenPatient, partial, onLoadMore, loadingMore, error }: {
  date: string; time: GiroTime | undefined; onClose: () => void;
  onOpenPatient: (patientId: string, date: string, time: string) => void;
  partial: boolean; onLoadMore: () => void; loadingMore: boolean; error: string | null;
}) {
  const titleId = useId();
  return <AccessibleDialogSurface labelledBy={titleId} onClose={onClose} className="therapy-calendar-dialog">
    <header className="therapy-calendar-dialog__head"><h3 id={titleId}>{date} · Ore {time?.ora ?? '—'}</h3>
      <button type="button" className="btn-secondary btn-sm" data-dialog-initial-focus onClick={onClose}>Chiudi</button></header>
    {partial && <p role="status">Elenco parziale: i conteggi per ora riguardano le dosi caricate.
      <button className="btn-secondary btn-sm" disabled={loadingMore} onClick={onLoadMore}>{loadingMore ? 'Caricamento…' : 'Carica altri dettagli'}</button></p>}
    {error && <p role="alert">{error}</p>}
    {!time && <p>Nessuna dose caricata per questo orario.</p>}
    {time?.patients.map((group) => <section className="therapy-calendar-dialog__patient" key={group.patient.patientId}>
      <header className="therapy-calendar-dialog__patient-head"><strong>{patientIdentityName({ ...group.patient, id: group.patient.patientId })}</strong>
        <button type="button" className="btn-secondary btn-sm" aria-label={`Apri terapia di ${patientIdentityName({ ...group.patient, id: group.patient.patientId })}, ore ${time.ora}`}
          onClick={() => onOpenPatient(group.patient.patientId, date, time.ora)}><IcoChevronRight /></button></header>
      {group.items.map(({ a, fascia }) => <article key={`${a.therapyId}|${fascia}`}>
        <strong>{a.drugName}</strong><dl>
          <div><dt>Dose</dt><dd>{a.quantityLabel || a.dosage}</dd></div>
          <div><dt>Via</dt><dd>{a.route}</dd></div>
          <div><dt>Stato</dt><dd>{doseStatus({ ...a, scheduledTime: time.ora }, date).text}</dd></div>
        </dl>
      </article>)}
    </section>)}
  </AccessibleDialogSurface>;
}
