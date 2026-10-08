// UX cycle 2 — W5: compact list of the patient's drugs (one line each: drug, strength, schedule,
// route, prescriber; «al bisogno» marked) and, on tap, the prescription detail in place with the
// prescriber actions the role is allowed (Modifica / Sospendi / Elimina / Riattiva — same
// endpoints and confirmations as before, wired by the tab). The doses and their administration
// live in the calendar below: the line does not repeat them.
import type { ReactNode } from 'react';
import type { PatientTherapyAPI } from '../../../types';
import { computeEquivalent, formatFraction, scheduleLabel } from './therapyDose';
import { schedulesFromTherapy } from './therapyFormRestore';
import { GlucoseScaleSummary } from './GlucoseScaleEditor';
import { glucoseScaleRows } from './glucoseScale';

const WEEKDAYS = ['', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const TIPO_LABEL: Record<string, string> = {
  periodica: 'Periodica',
  una_tantum: 'Una tantum',
  al_bisogno: 'Al bisogno',
};
const STATO_LABEL: Record<string, string> = {
  attiva: 'Attiva',
  sospesa: 'Sospesa',
  conclusa: 'Conclusa',
};

function weekdays(t: PatientTherapyAPI): string | null {
  const days = (t.giorniSettimana ?? '')
    .split(',')
    .map((n) => WEEKDAYS[Number(n.trim())])
    .filter(Boolean);
  return days.length ? days.join(' ') : null;
}

/** «08:00 1 compressa · 20:00 ½ compressa» (al bisogno: «al bisogno»). */
function scheduleText(t: PatientTherapyAPI): string {
  if (t.doseMode === 'glucose_scale')
    return `Schema glicemico · ${schedulesFromTherapy(t)
      .map((s) => s.time)
      .join(' · ')}`;
  if (t.tipo === 'al_bisogno') return 'al bisogno';
  const structured = Boolean(t.schedules?.length);
  const rows = schedulesFromTherapy(t).map((s) =>
    structured
      ? `${s.time} ${formatFraction(s.quantityNumerator, s.quantityDenominator)} ${s.administrationUnit}`
      : s.time,
  );
  const days = weekdays(t);
  return [rows.join(' · '), days].filter(Boolean).join(' — ');
}

function ScheduleDetail({ t }: { t: PatientTherapyAPI }) {
  if (t.doseMode === 'glucose_scale')
    return (
      <>
        <p>
          Rilevazioni:{' '}
          {schedulesFromTherapy(t)
            .map((s) => s.time)
            .join(', ') || 'da indicare'}
        </p>
        <GlucoseScaleSummary rows={glucoseScaleRows(t.doseProtocol)} />
      </>
    );
  if (t.tipo === 'al_bisogno') return <span>Al bisogno (nessun orario fisso)</span>;
  const structured = Boolean(t.schedules?.length);
  return (
    <ul className="tf-detail__schedule">
      {schedulesFromTherapy(t).map((s, i) => {
        const eq = structured
          ? computeEquivalent(
              s.quantityNumerator,
              s.quantityDenominator,
              t.commercialStrengthValue,
              t.commercialStrengthUnit,
            )
          : null;
        return (
          <li key={i} title={scheduleLabel(s, t.commercialStrengthValue, t.commercialStrengthUnit)}>
            <strong>{s.time}</strong>
            {structured &&
              ` · ${formatFraction(s.quantityNumerator, s.quantityDenominator)} ${s.administrationUnit}`}
            {eq && ` · ${eq}`}
          </li>
        );
      })}
      {weekdays(t) && <li data-testid="therapy-days-summary">Giorni: {weekdays(t)}</li>}
    </ul>
  );
}

export interface PrescriptionActions {
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (t: PatientTherapyAPI) => void;
  onSuspend: (t: PatientTherapyAPI) => void;
  onDelete: (t: PatientTherapyAPI) => void;
  onReactivate: (t: PatientTherapyAPI) => void;
}

/** Prescription detail: what the drug line does not say, then the prescriber actions. */
export function TherapyPrescriptionDetail({
  therapy: t,
  name,
  actions,
}: {
  therapy: PatientTherapyAPI;
  /** Drug name with its AIFA document / registry state (rendered by the tab). */
  name: ReactNode;
  actions: PrescriptionActions;
}) {
  const active = t.stato === 'attiva';
  // Dose, via e prescrittore sono già sulla riga del farmaco: qui solo ciò che la riga non dice.
  const rows: [string, ReactNode][] = [
    ['Anagrafica AIFA', name],
    ['Orari e quantità', <ScheduleDetail key="s" t={t} />],
    ['Tipo', TIPO_LABEL[t.tipo] ?? t.tipo],
    ['Inizio', t.dataInizio || '—'],
    ['Fine', t.dataFine || '—'],
    ['Stato', STATO_LABEL[t.stato] ?? t.stato],
  ];
  if (t.note) rows.push(['Note', t.note]);
  const hasActions = active ? actions.canUpdate || actions.canDelete : actions.canUpdate;
  return (
    <section
      className="tf-detail"
      aria-label={`Prescrizione di ${t.farmacoNome}`}
      data-testid="therapy-prescription-detail"
    >
      <dl className="tf-detail__grid">
        {rows.map(([label, value]) => (
          <div key={label} className="tf-detail__row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {hasActions && (
        <div className="tf-detail__actions" role="group" aria-label="Azioni del prescrittore">
          {active && actions.canUpdate && (
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              title="Modifica"
              aria-label={`Modifica ${t.farmacoNome}`}
              onClick={() => actions.onEdit(t)}
            >
              Modifica
            </button>
          )}
          {active && actions.canUpdate && (
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              title="Sospendi"
              aria-label={`Sospendi ${t.farmacoNome}`}
              onClick={() => actions.onSuspend(t)}
            >
              Sospendi
            </button>
          )}
          {!active && actions.canUpdate && (
            <button
              type="button"
              className="ds-btn ds-btn--primary"
              title="Riattiva"
              aria-label={`Riattiva ${t.farmacoNome}`}
              onClick={() => actions.onReactivate(t)}
            >
              Riattiva
            </button>
          )}
          {actions.canDelete && (
            <button
              type="button"
              className="ds-btn ds-btn--danger"
              title="Elimina"
              aria-label={`Elimina ${t.farmacoNome}`}
              onClick={() => actions.onDelete(t)}
            >
              Elimina
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/** One line per drug; tapping a line opens its prescription detail under it (one at a time). */
export function TherapyDrugList({
  therapies,
  openId,
  focusId,
  onToggle,
  renderDetail,
  label,
  emptyText,
  lineBadge,
}: {
  therapies: PatientTherapyAPI[];
  openId: string | null;
  focusId?: string | null;
  onToggle: (id: string) => void;
  renderDetail: (t: PatientTherapyAPI) => ReactNode;
  label: string;
  emptyText: string;
  /** Short state shown on the line (e.g. «non in anagrafica»): the anomaly lives on its drug. */
  lineBadge?: (t: PatientTherapyAPI) => ReactNode;
}) {
  if (!therapies.length) return <p className="tf-drugs__empty">{emptyText}</p>;
  return (
    <ul className="tf-drugs" aria-label={label}>
      {therapies.map((t) => {
        const open = openId === t.id;
        const focus = focusId === t.id;
        const meta = [
          t.dosaggio,
          scheduleText(t),
          t.viaSomministrazione,
          t.prescrittore ? `Prescr. ${t.prescrittore}` : null,
          t.stato !== 'attiva'
            ? `${STATO_LABEL[t.stato] ?? t.stato}${t.dataFine ? ` · fine ${t.dataFine}` : ''}`
            : null,
        ].filter(Boolean);
        return (
          <li
            key={t.id}
            className={`tf-drugs__item${open ? ' is-open' : ''}${focus ? ' is-focus therapy-list-row--focus' : ''}`}
            data-therapy-id={t.id}
          >
            <button
              type="button"
              className="tf-drugs__line"
              aria-expanded={open}
              aria-label={`${t.farmacoNome}${t.dosaggio ? ` ${t.dosaggio}` : ''}: ${open ? 'chiudi' : 'apri'} la prescrizione`}
              data-testid="therapy-drug-line"
              onClick={() => onToggle(t.id)}
            >
              <span className="tf-drugs__name">
                <span aria-hidden="true">{open ? '▾' : '▸'}</span> {t.farmacoNome}
              </span>
              {t.tipo === 'al_bisogno' && (
                <span className="ds-badge ds-badge--info tf-drugs__prn">Al bisogno</span>
              )}
              {lineBadge?.(t)}
              <span className="tf-drugs__meta">{meta.join(' · ')}</span>
            </button>
            {open && renderDetail(t)}
          </li>
        );
      })}
    </ul>
  );
}
