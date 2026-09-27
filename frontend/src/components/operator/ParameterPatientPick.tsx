import { useParameterEntryDraft } from '../../lib/useParameterEntryDraft';
import type { ParameterDraftStore } from '../../lib/parameterEntryDrafts';
import type { PatientParametersPageItem } from '../../lib/patientParametersPage';
import { parsePatientLocation, patientIdentityName } from '../../lib/patientIdentity';
import { PARAMETER_FIELDS } from '../../lib/patientParameterReadings';
import { whenLabel } from '../../lib/parameterPad';
import { LazyNews2 } from './LazyNews2';

interface Props {
  item: PatientParametersPageItem;
  draftStore: ParameterDraftStore;
  selected: boolean;
  summaryPending: boolean;
  onSelect: () => void;
}

/** Riga della colonna pazienti: camera, nome, ultima rilevazione di oggi, NEWS2, bozza. */
export function ParameterPatientPick({
  item,
  draftStore,
  selected,
  summaryPending,
  onSelect,
}: Props) {
  const { patient, cartella } = item;
  const { draft } = useParameterEntryDraft(patient.id, draftStore);
  const name = patientIdentityName(patient);
  const location = parsePatientLocation(patient.location);
  const room = location?.status === 'assigned' && location.room ? location.room : '—';
  const hasDraft =
    PARAMETER_FIELDS.some((field) => draft.values[field.key]?.trim()) ||
    Boolean(draft.values.note?.trim());
  const last = summaryPending
    ? 'Verifica in corso…'
    : cartella.lastReadingAt
      ? `Ultimi ${whenLabel(cartella.lastReadingAt)}${cartella.readingCount ? ` · ${cartella.readingCount}\u00a0oggi` : ''}`
      : cartella.readingCount === 0
        ? 'Nessuna rilevazione oggi'
        : 'Ultima rilevazione non disponibile';
  return (
    <li className={`par-pick${selected ? ' par-pick--selected' : ''}`}>
      <button
        type="button"
        className="par-pick__main"
        aria-pressed={selected}
        aria-label={`${name}, ${location?.status === 'assigned' && location.room ? `camera ${location.room}` : 'camera non indicata'}. ${last}${hasDraft ? '. Bozza non salvata' : ''}`}
        onClick={onSelect}
      >
        <span className="par-pick__bed" aria-hidden="true">
          {room}
        </span>
        <span className="par-pick__text">
          <span className="par-pick__name">{name}</span>
          <span className="par-cap">
            {last}
            {hasDraft && <span className="par-pick__draft"> · Bozza</span>}
          </span>
        </span>
      </button>
      <LazyNews2 patientId={patient.id} patientName={name} compact />
    </li>
  );
}
