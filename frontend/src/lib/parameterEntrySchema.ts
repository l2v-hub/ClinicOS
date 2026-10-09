import {
  PARAMETER_FIELDS,
  PARAMETER_OPTIONS,
  type ParameterValues,
} from './patientParameterReadings';
import { PAD_FIELDS, type PadField } from './parameterPad';

export type EntryFieldKey = PadField | 'o2' | 'coscienza' | 'evacuazione' | 'note';
export interface EntryField {
  key: EntryFieldKey;
  label: string;
  unit?: string;
  decimals?: boolean;
  numeric: boolean;
  options?: readonly { value: string; label: string }[];
}
const ORDER: EntryFieldKey[] = [
  'fr',
  'spo2',
  'o2',
  'pas',
  'pad',
  'fc',
  'temperatura',
  'coscienza',
  'dtx',
  'evacuazione',
  'note',
];
/** Presentation only: persisted fields, validation and clinical score stay unchanged. */
export const ENTRY_FIELDS: EntryField[] = ORDER.map((key) => {
  const numeric = PAD_FIELDS.find((field) => field.key === key);
  const original = PARAMETER_FIELDS.find((field) => field.key === key);
  return {
    key,
    label: original?.label ?? numeric?.label ?? 'Note sulla rilevazione',
    unit: original?.unit ?? numeric?.unit,
    numeric: !!numeric,
    decimals: numeric?.decimals,
    options: original ? PARAMETER_OPTIONS[original.key] : undefined,
  };
});
export function nextEntryField(key: EntryFieldKey | null): EntryFieldKey | null {
  return key === null ? ORDER[0] : (ORDER[ORDER.indexOf(key) + 1] ?? null);
}
export function entryFieldForError(key: keyof ParameterValues | null): EntryFieldKey {
  return key === 'pa' ? 'pas' : (key ?? 'fr');
}
