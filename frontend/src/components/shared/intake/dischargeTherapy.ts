// #156: shared types + mapping for therapies detected in a discharge letter (draft.data.terapiaImport).
// The backend parser (parse-discharge-therapy.ts) produces these rows; the intake review table edits
// them; on confirm they are mapped to the same TherapyCreateInput shape the manual editor sends.

import { emptyTherapyForm, type TherapyFormValue } from '../../operator/cartella/TherapyFormFields';
import {
  ADMIN_UNITS,
  PHARMA_FORMS,
  formatFraction,
  parseQuantity,
} from '../../operator/cartella/therapyDose';

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
}

const VIA_MAP: Record<string, string> = {
  OS: 'orale',
  IM: 'intramuscolo',
  EV: 'endovena',
  SC: 'sottocute',
  SL: 'sublinguale',
  TD: 'transdermica',
  INAL: 'inalatoria',
  TOP: 'topica',
  RETT: 'rettale',
  OFT: 'oftalmica',
  OTO: 'otologica',
  NAS: 'nasale',
  VAG: 'vaginale',
};

function mapVia(v: string): string {
  return VIA_MAP[(v || '').toUpperCase()] ?? 'orale';
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Map one detected discharge-therapy row → TherapyCreateInput-compatible object for confirmDraft.
 *  orari → schedules; forma → pharmaceuticalForm; classe/giorni/quantità/originalText/verify-flag
 *  are preserved in `note` (the schema has no weekday field). dataInizio falls back to today. */
export function dischargeRowToTherapyInput(
  r: DischargeTherapyRow,
  operatoreNome?: string,
): Record<string, unknown> {
  const orari = Array.isArray(r.orari) ? r.orari.filter((t) => /^\d{1,2}:\d{2}$/.test(t)) : [];
  const giorni = Array.isArray(r.giorni) ? r.giorni : [];
  const note = [
    r.note?.trim() || '',
    r.classe ? `Classe ${r.classe}` : '',
    giorni.length ? `Giorni: ${giorni.join(' ')}` : '',
    r.quantita ? `Quantità: ${r.quantita}` : '',
    r.stato === 'da_verificare' ? '[DA VERIFICARE]' : '',
    r.originalText ? `Origine: ${r.originalText}` : '',
  ]
    .filter(Boolean)
    .join(' — ');
  return {
    farmacoNome: (r.farmacoNome || '').trim(),
    dataInizio: r.dataInizio && r.dataInizio.trim() ? r.dataInizio : todayIso(),
    viaSomministrazione: mapVia(r.viaSomministrazione),
    tipo: 'periodica',
    stato: 'attiva',
    ...(r.forma ? { pharmaceuticalForm: r.forma } : {}),
    allowedFractions: '1',
    schedules: orari.map((time) => ({
      time,
      quantityNumerator: 1,
      quantityDenominator: 1,
      administrationUnit: '',
    })),
    ...(operatoreNome ? { operatoreInseritore: operatoreNome } : {}),
    ...(note ? { note } : {}),
  };
}

// #280 — Bridge the RAW discharge row ↔ the REAL manual therapy form (TherapyFormValue), so the
// import review reuses the exact same editor instead of a divergent raw-input table.

// Route code (parser output, e.g. "OS"/"IM"/"EV") → the value shown in the manual form's Via select.
const CODE_TO_FORM_VIA: Record<string, string> = {
  OS: 'orale',
  IM: 'IM',
  SC: 'SC',
  EV: 'IV',
  IV: 'IV',
  SL: 'sublinguale',
  TOP: 'topico',
};
// Inverse: form Via value → route code that `dischargeRowToTherapyInput`'s `mapVia` understands.
const FORM_VIA_TO_CODE: Record<string, string> = {
  orale: 'OS',
  IM: 'IM',
  SC: 'SC',
  IV: 'EV',
  sublinguale: 'SL',
  topico: 'TOP',
};

// ISO weekday (1=Lun … 7=Dom) ↔ the Italian abbreviations the parser emits in `giorni`.
const DAY_ABBR: ReadonlyArray<string> = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
function dayToIso(d: string): number | null {
  const idx = DAY_ABBR.findIndex((x) => x.toLowerCase() === (d || '').trim().toLowerCase());
  return idx >= 0 ? idx + 1 : null;
}

// Map the free-text pharmaceutical form (e.g. "CPR RIV", "SCIR") to a manual-form PHARMA_FORMS value.
function mapForma(raw: string): string | null {
  const f = (raw || '').toLowerCase();
  if (!f.trim()) return null;
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

// Parse a raw dosage string ("500 MGR", "10MG", "1GR") → { value, unit } in manual-form vocab.
const DOSE_UNIT_MAP: Record<string, string> = {
  MGR: 'mg',
  MG: 'mg',
  MCG: 'mcg',
  GR: 'g',
  G: 'g',
  UI: 'UI',
  ML: 'ml',
};
function parseDosaggio(raw: string): { value: string; unit: string } | null {
  const m = (raw || '').match(/(\d+(?:[.,]\d+)?)\s*(MGR|MCG|MG|GR|G|UI|ML)/i);
  if (!m) return null;
  const unit = DOSE_UNIT_MAP[m[2].toUpperCase()];
  if (!unit) return null;
  return { value: m[1].replace(',', '.'), unit };
}

/** #280 — Prefill the REAL manual therapy form from a raw discharge row. Whatever cannot be mapped
 *  to a structured field is kept in `note` so nothing extracted is lost. Unrecognized values fall
 *  back to `emptyTherapyForm()` defaults. */
export function dischargeRowToTherapyForm(r: DischargeTherapyRow): TherapyFormValue {
  const base = emptyTherapyForm();

  const via =
    CODE_TO_FORM_VIA[(r.viaSomministrazione || '').toUpperCase()] ?? base.viaSomministrazione;
  const forma = mapForma(r.forma);
  const dose = parseDosaggio(r.dosaggio);

  // Quantity per administration, parsed from the leading number/fraction of `quantita` ("1/2 Dosi").
  const qty = parseQuantity((r.quantita || '').split(/\s+/)[0] ?? '') ?? { num: 1, den: 1 };
  const administrationUnit =
    forma && ADMIN_UNITS.includes(forma) ? forma : base.schedules[0].administrationUnit;

  const times = Array.isArray(r.orari) ? r.orari.filter((t) => /^\d{1,2}:\d{2}$/.test(t)) : [];
  const schedules =
    times.length > 0
      ? times.map((time) => ({
          time,
          quantityNumerator: qty.num,
          quantityDenominator: qty.den,
          administrationUnit,
        }))
      : [
          {
            ...base.schedules[0],
            quantityNumerator: qty.num,
            quantityDenominator: qty.den,
            administrationUnit,
          },
        ];

  const giorniSettimana = Array.isArray(r.giorni)
    ? (r.giorni.map(dayToIso).filter((n): n is number => n != null) as number[]).sort(
        (a, b) => a - b,
      )
    : [];

  // Keep in `note` only what has NO structured home (raw dosage when un-parseable, plus any existing
  // note). Classe/giorni/quantità/origine are re-appended by dischargeRowToTherapyInput at save —
  // do NOT duplicate them here.
  const noteParts = [r.note?.trim() || '', !dose && r.dosaggio ? `Dosaggio: ${r.dosaggio}` : '']
    .filter(Boolean)
    .join(' — ');

  return {
    ...base,
    farmacoNome: (r.farmacoNome || '').trim(),
    pharmaceuticalForm: forma ?? base.pharmaceuticalForm,
    commercialStrengthValue: dose ? dose.value : base.commercialStrengthValue,
    commercialStrengthUnit: dose ? dose.unit : base.commercialStrengthUnit,
    viaSomministrazione: via,
    dataInizio: r.dataInizio && r.dataInizio.trim() ? r.dataInizio : base.dataInizio,
    schedules,
    giorniSettimana,
    note: noteParts,
  };
}

/** #280 — Inverse of dischargeRowToTherapyForm: fold the form values back into the raw draft row so
 *  `dischargeRowToTherapyInput` (unchanged) reads the operator's edits at confirm. `originalText` and
 *  `classe` are preserved from `base`; `stato` becomes 'ok' since reaching here means the operator
 *  interacted with (i.e. reviewed) the form. */
export function therapyFormToDischargeRow(
  v: TherapyFormValue,
  base: DischargeTherapyRow,
): DischargeTherapyRow {
  const times = v.schedules.map((s) => s.time).filter((t) => /^\d{1,2}:\d{2}$/.test(t));
  const first = v.schedules[0];
  const quantita = first
    ? `${formatFraction(first.quantityNumerator, first.quantityDenominator)} ${first.administrationUnit}`.trim()
    : base.quantita;
  const dosaggio = v.commercialStrengthValue.trim()
    ? `${v.commercialStrengthValue} ${v.commercialStrengthUnit}`.trim()
    : base.dosaggio;

  return {
    ...base,
    farmacoNome: (v.farmacoNome || '').trim(),
    forma: v.pharmaceuticalForm || base.forma,
    dosaggio,
    viaSomministrazione: FORM_VIA_TO_CODE[v.viaSomministrazione] ?? base.viaSomministrazione,
    quantita,
    orari: times,
    giorni: v.giorniSettimana.map((n) => DAY_ABBR[n - 1]).filter(Boolean),
    dataInizio: v.dataInizio || base.dataInizio,
    note: v.note,
    // originalText & classe intentionally preserved from base.
    stato: 'ok',
  };
}
