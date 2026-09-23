// Raw OCR fields remain alongside the complete, operator-reviewed form in the draft.
import { emptyTherapyForm, type TherapyFormValue } from '../../operator/cartella/TherapyFormFields';
import {
  PHARMA_FORMS,
  administrationUnitForForm,
  isInhalerForm,
  formatFraction,
  parseQuantity,
} from '../../operator/cartella/therapyDose';
import { therapyFormToInput } from './therapyFormPayload';

export interface DischargeTherapyRow {
  farmacoNome: string;
  forma: string;
  dosaggio: string;
  viaSomministrazione: string;
  quantita: string;
  orari: string[];
  giorni: string[];
  dataInizio: string;
  classe: string;
  note: string;
  originalText: string;
  stato: 'ok' | 'da_verificare';
  excludedFromConfirm?: boolean;
  reviewedTherapy?: TherapyFormValue;
  importSource?: { groupId: string; inputHash: string };
  sourceOutdated?: boolean;
  sourceReviewHash?: string;
}

const CODE_TO_FORM_VIA: Record<string, string> = {
  OS: 'orale',
  IM: 'IM',
  SC: 'SC',
  EV: 'IV',
  IV: 'IV',
  SL: 'sublinguale',
  TOP: 'topico',
  TD: 'transdermica',
  INAL: 'inalatoria',
  RETT: 'rettale',
  OFT: 'oftalmica',
  OTO: 'otologica',
  NAS: 'nasale',
  VAG: 'vaginale',
};
const DAY_ABBR = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
function dayToIso(d: string): number {
  // Keep an invalid marker instead of turning an unknown restriction into every day.
  return DAY_ABBR.findIndex((x) => x.toLowerCase() === (d || '').trim().toLowerCase()) + 1;
}

function mapForma(raw: string): string | null {
  const f = (raw || '').trim().toLowerCase();
  if (isInhalerForm(f)) return 'inalatore';
  if (/\bcpr\b|compress/.test(f)) return 'compressa';
  if (/\bcps\b|\bcp\b|capsul/.test(f)) return 'capsula';
  if (/scir|siropp|sciropp/.test(f)) return 'sciroppo';
  if (/fial|\bfl\b/.test(f)) return 'fiala';
  if (/flac/.test(f)) return 'flacone';
  if (/bust/.test(f)) return 'bustina';
  if (/gocc|gtt/.test(f)) return 'gocce';
  if (/cerott/.test(f)) return 'cerotto';
  if (/crema|pomat|gel|unguent/.test(f)) return 'crema';
  return PHARMA_FORMS.includes(f) ? f : null;
}

const UNIT_ALIASES: Record<string, string> = {
  cpr: 'compressa',
  compressa: 'compressa',
  compresse: 'compressa',
  cps: 'capsula',
  capsula: 'capsula',
  capsule: 'capsula',
  cerotto: 'cerotto',
  cerotti: 'cerotto',
  bust: 'bustina',
  bustina: 'bustina',
  bustine: 'bustina',
  fl: 'fiala',
  fiala: 'fiala',
  fiale: 'fiala',
  gtt: 'gocce',
  goccia: 'gocce',
  gocce: 'gocce',
  ml: 'ml',
  puff: 'puff',
  unità: 'unità',
  unita: 'unità',
  ui: 'unità',
};
function parseAdministration(raw: string, forma: string | null) {
  const match = (raw || '').trim().match(/^(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s*([^\d]*)$/u);
  const qty = match ? parseQuantity(match[1].replace(/\s/g, '')) : null;
  const explicitUnit = match?.[2].trim().toLowerCase().replace(/\.$/, '') ?? '';
  // Syrup/bottle/cream is a pharmaceutical form, not an administration quantity.
  const unit = explicitUnit
    ? (UNIT_ALIASES[explicitUnit] ?? '')
    : administrationUnitForForm(forma ?? '');
  return { num: qty?.num ?? 0, den: qty?.den ?? 1, unit };
}

const DOSE_UNIT_MAP: Record<string, string> = {
  MGR: 'mg',
  MG: 'mg',
  MCG: 'mcg',
  GR: 'g',
  G: 'g',
  UI: 'UI',
  ML: 'ml',
};
function parseDosaggio(raw: string) {
  // Compound strengths must stay raw: "20mg/ml" is not "20mg".
  const m = (raw || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*(MGR|MCG|MG|GR|G|UI|ML)$/i);
  return m ? { value: m[1].replace(',', '.'), unit: DOSE_UNIT_MAP[m[2].toUpperCase()] } : null;
}

/** Legacy imports leave unknown clinical values blank for explicit correction. */
export function dischargeRowToTherapyForm(r: DischargeTherapyRow): TherapyFormValue {
  if (r.reviewedTherapy) return structuredClone(r.reviewedTherapy);
  const forma = mapForma(r.forma);
  const dose = parseDosaggio(r.dosaggio);
  const qty = parseAdministration(r.quantita, forma);
  const times = Array.isArray(r.orari) && r.orari.length ? r.orari : [''];
  return {
    ...emptyTherapyForm(),
    farmacoNome: (r.farmacoNome || '').trim(),
    pharmaceuticalForm: forma ?? '',
    commercialStrengthValue: dose?.value ?? '',
    commercialStrengthUnit: dose?.unit ?? '',
    viaSomministrazione:
      CODE_TO_FORM_VIA[(r.viaSomministrazione || '').toUpperCase()] ?? r.viaSomministrazione ?? '',
    dataInizio: r.dataInizio?.trim() ?? '',
    dataSomministrazione: '',
    schedules: times.map((time) => ({
      time: /^\d:\d{2}$/.test(time) ? `0${time}` : time,
      quantityNumerator: qty.num,
      quantityDenominator: qty.den,
      administrationUnit: qty.unit,
    })),
    giorniSettimana: Array.isArray(r.giorni) ? r.giorni.map(dayToIso).sort((a, b) => a - b) : [],
    note: [r.note?.trim() || '', !dose && r.dosaggio ? `Dosaggio: ${r.dosaggio}` : '']
      .filter(Boolean)
      .join(' — '),
  };
}

export function therapyFormToDischargeRow(
  v: TherapyFormValue,
  base: DischargeTherapyRow,
): DischargeTherapyRow {
  const first = v.schedules[0];
  return {
    ...base,
    reviewedTherapy: structuredClone(v),
    farmacoNome: v.farmacoNome.trim(),
    forma: v.pharmaceuticalForm,
    dosaggio: v.commercialStrengthValue.trim()
      ? `${v.commercialStrengthValue} ${v.commercialStrengthUnit}`.trim()
      : '',
    viaSomministrazione: v.viaSomministrazione,
    quantita: first
      ? `${formatFraction(first.quantityNumerator, first.quantityDenominator)} ${first.administrationUnit}`.trim()
      : '',
    orari: v.schedules.map((s) => s.time),
    giorni: v.giorniSettimana.map((n) => DAY_ABBR[n - 1] ?? ''),
    dataInizio: v.dataInizio,
    note: v.note,
    // Editing one field is not an acknowledgement of ambiguous OCR source text.
    stato: base.stato,
  };
}

export function dischargeRowToTherapyInput(
  r: DischargeTherapyRow,
  operatoreNome?: string,
): Record<string, unknown> {
  const input = therapyFormToInput(dischargeRowToTherapyForm(r), operatoreNome);
  // Provenance stays on the imported row and its source document, separate from clinical notes.
  return {
    ...input,
    ...(!r.reviewedTherapy && r.dosaggio ? { dosaggio: r.dosaggio } : {}),
  };
}
