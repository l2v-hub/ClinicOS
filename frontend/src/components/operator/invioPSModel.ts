import { patientAge } from '../../lib/patientDemographics';
import type {
  Paziente,
  CartellaPaziente,
  DimissioneInfermieristica,
  PatientTherapyAPI,
} from '../../types';
import { formatFraction, computeEquivalent } from './cartella/therapyDose';
import { uniqueClinicalTexts } from '../../lib/clinicalHistory';
import { PARAMETER_FIELDS, formatParameterValue } from '../../lib/patientParameterReadings';
import { news2Parts } from '../../lib/news2';
import { assessmentInstants } from '../../lib/assessments/assessmentTime';
import { facilityLocalDate, formatFacilityLocalMinute } from '../../lib/facilityTime';
import type { EmergencyTransferSources } from '../../lib/emergencyTransferContext';

// ── FASCE labels (mirrors TerapiaFarmacologicaTab) ────────────────────────────

const FASCE_LABELS: { boolKey: keyof PatientTherapyAPI; label: string }[] = [
  { boolKey: 'fasceMattina', label: 'Mattina' },
  { boolKey: 'fascePranzo', label: 'Pranzo' },
  { boolKey: 'fascePomeriggio', label: 'Pomeriggio' },
  { boolKey: 'fasceSera', label: 'Sera' },
  { boolKey: 'fasceNotte', label: 'Notte' },
];

// ── Model types ────────────────────────────────────────────────────────────────

export interface InvioPSAllergia {
  testo: string;
  grave: boolean;
}

export interface InvioPSPatient {
  cognomeNome: string;
  mrn: string;
  dataNascita: string;
  sesso: string;
  dataStampa: string;
  allergie: InvioPSAllergia[];
  allergieStato: string;
  diagnosi: string[];
  condizioniCroniche: string[];
  patologiePregresse: string[];
  noteAssistenziali: string[];
  patologiaIngresso: string;
}

export interface InvioPSDimissione {
  data: string;
  ora: string;
  condizioni: string;
  destinazione: string;
  autonomiaResidua: string;
  istruzioni: string;
  controlliProgrammati: string;
  personaAccompagna: string;
  mezzoTrasporto: string;
  materialeConsegnato: string;
  note: string;
}

export interface InvioPSTerapia {
  id: string;
  farmaco: string;
  dose: string;
  via: string;
  fasce: string;
  stato: string;
}

export interface InvioPSModel {
  patient: InvioPSPatient;
  dimissione: InvioPSDimissione | null;
  terapie: InvioPSTerapia[];
  emergency: ReturnType<typeof buildEmergencyContext>;
}

// ── Pure model builder (exported for unit testing) ────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' });
}

// The modal and regression tests use the same pure model.
export function buildInvioPSModel(
  paziente: Paziente,
  cartella: CartellaPaziente,
  therapies: PatientTherapyAPI[],
  sources?: EmergencyTransferSources | null,
  now = new Date(),
): InvioPSModel {
  if (cartella.pazienteId !== paziente.id || (sources && sources.patientId !== paziente.id))
    throw new Error('Contesto non coerente con il paziente');
  const cognomeNome = `${paziente.lastName} ${paziente.firstName}`.trim();

  const allergie: InvioPSAllergia[] = (cartella.allergie || [])
    .map((a) => {
      const reazione = a.reazione ? ` (${a.reazione})` : '';
      return { testo: `${a.allergene}${reazione}`.trim(), grave: a.gravita === 'grave' };
    })
    .filter((a) => a.testo);

  const active = (cartella.diagnosi || []).filter(
    (d) => d.stato === 'attiva' || d.stato === 'monitoraggio',
  );
  const diagnosi = uniqueClinicalTexts(
    active
      .filter((d) => d.tipo !== 'comorbidita')
      .map((d) => d.descrizione)
      .filter(Boolean),
  );
  const patologiePregresse = uniqueClinicalTexts([
    cartella.anamnesi?.patologicaRemota ?? '',
    ...active.filter((d) => d.tipo === 'comorbidita').map((d) => d.descrizione),
  ]);
  const patologiaIngresso =
    uniqueClinicalTexts([cartella.patologiaIngresso ?? ''], diagnosi)[0] ?? '';

  const condizioniCroniche: string[] = [];
  if (cartella.diabetico) condizioniCroniche.push('Diabete');
  if (cartella.ipertensione) condizioniCroniche.push('Ipertensione');

  const patient: InvioPSPatient = {
    cognomeNome,
    mrn: paziente.medicalRecordNumber || '—',
    dataNascita: fmtDate(paziente.dateOfBirth || ''),
    sesso: paziente.sex || '—',
    dataStampa: formatFacilityLocalMinute(now.toISOString()),
    allergie,
    allergieStato: allergie.length
      ? 'Allergie documentate'
      : cartella.allergieStatus === 'assenti'
        ? 'Assenza di allergie documentata'
        : cartella.allergieStatus === 'paziente_nega'
          ? 'Il paziente nega allergie'
          : 'Stato allergie da verificare',
    diagnosi,
    condizioniCroniche: uniqueClinicalTexts(condizioniCroniche, [
      ...diagnosi,
      ...patologiePregresse,
    ]),
    patologiePregresse,
    patologiaIngresso,
    noteAssistenziali: uniqueClinicalTexts([
      cartella.anamnesi?.note ?? '',
      cartella.terapiaTriturata ? 'Terapia triturata' : '',
    ]),
  };

  // Age appended to sesso line for compactness
  const years = patientAge(paziente.dateOfBirth);
  const age = years === null ? '' : `${years} anni`;
  if (age) {
    patient.sesso = `${patient.sesso} · ${age}`;
  }

  let dimissione: InvioPSDimissione | null = null;
  if (cartella.dimissione) {
    const d: DimissioneInfermieristica = cartella.dimissione;
    const DEST_LABELS: Record<string, string> = {
      domicilio: 'Domicilio',
      altra_struttura: 'Altra struttura',
      hospice: 'Hospice',
      ospedale: 'Ospedale',
    };
    dimissione = {
      data: fmtDate(d.data),
      ora: d.ora || '—',
      condizioni: d.condizioni || '—',
      destinazione: DEST_LABELS[d.destinazione] ?? d.destinazione ?? '—',
      autonomiaResidua: d.autonomiaResidua || '—',
      istruzioni: d.istruzioni || '—',
      controlliProgrammati: d.controlliProgrammati || '—',
      personaAccompagna: d.personaAccompagna || '—',
      mezzoTrasporto: d.mezzoTrasporto || '—',
      materialeConsegnato: d.materialeConsegnato || '—',
      note: d.note || '',
    };
  }

  const terapie: InvioPSTerapia[] = therapies
    .filter((t) => t.patientId === paziente.id && t.stato === 'attiva')
    .map((t) => {
      // REQ-093: prefer structured schedules → "08:00 (1/2 compressa, 50 mg)" per time.
      let fasce: string;
      if (t.schedules && t.schedules.length) {
        fasce = t.schedules
          .slice()
          .sort((a, b) => a.time.localeCompare(b.time))
          .map((s) => {
            const frac = formatFraction(s.quantityNumerator, s.quantityDenominator);
            const eq = computeEquivalent(
              s.quantityNumerator,
              s.quantityDenominator,
              t.commercialStrengthValue,
              t.commercialStrengthUnit,
            );
            return `${s.time} (${frac} ${s.administrationUnit}${eq ? `, ${eq}` : ''})`;
          })
          .join('; ');
      } else {
        const fasceLabelList = FASCE_LABELS.filter((f) => t[f.boolKey] === true).map(
          (f) => f.label,
        );
        fasce = t.orarioSpecifico
          ? t.orarioSpecifico
          : fasceLabelList.length > 0
            ? fasceLabelList.join(', ')
            : '—';
      }
      const dose =
        t.commercialStrengthValue != null && t.commercialStrengthUnit
          ? `${t.commercialStrengthValue} ${t.commercialStrengthUnit}${t.pharmaceuticalForm ? ' ' + t.pharmaceuticalForm : ''}`
          : t.dosaggio;
      return {
        id: t.id,
        farmaco: t.farmacoNome,
        dose,
        via: t.viaSomministrazione,
        fasce,
        stato: t.stato,
      };
    });

  return {
    patient,
    dimissione,
    terapie,
    emergency: buildEmergencyContext(paziente.id, cartella, sources, now),
  };
}

/** Zoned instants only; a diary civil minute has to identify one Rome instant. A repeated
 * DST hour cannot safely establish a 24-hour freshness boundary without a recorded offset. */
function sourceInstant(value: string): number | null {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    const candidates = assessmentInstants(value);
    return candidates.length === 1 ? Date.parse(candidates[0]) : null;
  }
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? instant : null;
}

export function buildEmergencyContext(
  patientId: string,
  cartella: CartellaPaziente,
  sources: EmergencyTransferSources | null | undefined,
  now: Date,
) {
  if (cartella.pazienteId !== patientId || (sources && sources.patientId !== patientId))
    throw new Error('Contesto non coerente con il paziente');
  const nowAt = now.getTime(),
    since = nowAt - 24 * 3600000;
  const recent = (value: string) => {
    const at = sourceInstant(value);
    return at !== null && at >= since && at <= nowAt;
  };
  const readings = (sources?.readings ?? [])
    .filter(
      (row) =>
        row.patientId === patientId &&
        sourceInstant(row.measuredAt) !== null &&
        sourceInstant(row.measuredAt)! <= nowAt,
    )
    .slice()
    .sort((a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt));
  const vitals = PARAMETER_FIELDS.map((field) => {
    const reading = readings.find(
      (row) => typeof row.values[field.key] === 'string' && row.values[field.key]!.trim(),
    );
    return {
      key: field.key,
      label: field.label,
      unit: field.unit,
      value: reading ? formatParameterValue(field.key, reading.values[field.key]!) : null,
      measuredAt: reading?.measuredAt ?? null,
    };
  });
  // Legacy chart observations remain visible with their recorded precision. A date-only
  // observation never becomes a fabricated midnight timestamp or a 24-hour trigger.
  const legacyVitals = (cartella.parametriVitali ?? [])
    .filter((row) => {
      if (
        !row ||
        typeof row.etichetta !== 'string' ||
        typeof row.valore !== 'string' ||
        !row.valore.trim()
      )
        return false;
      const at = sourceInstant(row.rilevato);
      if (at !== null) return at <= nowAt;
      return !/^\d{4}-\d{2}-\d{2}$/.test(row.rilevato) || row.rilevato <= facilityLocalDate(now);
    })
    .map((row) => ({
      label: row.etichetta,
      value: row.valore,
      unit: row.unita ?? '',
      recordedAt:
        sourceInstant(row.rilevato) !== null
          ? formatFacilityLocalMinute(row.rilevato)
          : /^\d{4}-\d{2}-\d{2}$/.test(row.rilevato)
            ? `${row.rilevato} · orario non registrato`
            : 'Data e ora non documentate',
    }));
  const urgent = (sources?.diary ?? [])
    .filter(
      (row) =>
        row.patientId === patientId && row.priority === 'urgente' && recent(row.entryDateTime),
    )
    .slice()
    .sort((a, b) => sourceInstant(b.entryDateTime)! - sourceInstant(a.entryDateTime)!)[0];
  const critical = readings.find(
    (row) =>
      recent(row.measuredAt) && Object.values(news2Parts(row.values)).some((part) => part === 3),
  );
  const legacyCritical = (cartella.parametriVitali ?? []).filter(
    (row) => row.stato === 'critico' && recent(row.rilevato),
  );
  const reasonParts: string[] = [];
  if (urgent)
    reasonParts.push(
      `Nota urgente (${formatFacilityLocalMinute(urgent.entryDateTime)}): ${[urgent.title, urgent.content].filter(Boolean).join(' — ')}`,
    );
  if (critical) {
    const parts = news2Parts(critical.values);
    const values = PARAMETER_FIELDS.filter(
      (field) => parts[field.key as keyof typeof parts] === 3,
    ).map((field) => `${field.label} ${critical.values[field.key]} ${field.unit}`.trim());
    reasonParts.push(
      `Parametri critici (${formatFacilityLocalMinute(critical.measuredAt)}): ${values.join(', ')}`,
    );
  }
  for (const row of legacyCritical)
    reasonParts.push(
      `${row.etichetta} ${row.valore} ${row.unita} (${formatFacilityLocalMinute(row.rilevato)})`,
    );
  const today = facilityLocalDate(now),
    yesterday = facilityLocalDate(new Date(since));
  const given = (sources?.scheduled ?? [])
    .filter(
      (row) =>
        row.patientId === patientId &&
        row.stato === 'erogata' &&
        (row.confirmedAt ? recent(row.confirmedAt) : row.date >= yesterday && row.date <= today),
    )
    .map((row) => ({
      id: `scheduled:${row.id}`,
      drug: row.farmacoNome,
      dose: row.farmacoDose,
      route: row.farmacoVia,
      at: row.confirmedAt ?? null,
      date: row.date,
      kind: 'Programmata',
    }));
  for (const row of sources?.prn ?? [])
    if (row.patientId === patientId && recent(row.administeredAt))
      given.push({
        id: `prn:${row.id}`,
        drug: row.drugName,
        dose: row.dosage,
        route: row.route,
        at: row.administeredAt,
        date: row.date,
        kind: 'Al bisogno',
      });
  given.sort(
    (a, b) =>
      (b.at ? Date.parse(b.at) : 0) - (a.at ? Date.parse(a.at) : 0) || a.id.localeCompare(b.id),
  );
  return {
    reason: reasonParts.join('\n'),
    urgentNote: urgent
      ? { content: urgent.content, title: urgent.title, at: urgent.entryDateTime }
      : null,
    vitals,
    legacyVitals,
    given,
    risks: (cartella.indicatoriRischio ?? []).map(
      (row) =>
        `${row.tipo.replaceAll('_', ' ')} · ${row.livello}${row.descrizione ? ` · ${row.descrizione}` : ''}`,
    ),
    contact: [
      cartella.contattoEmergenzaNome,
      cartella.contattoEmergenzaRel,
      cartella.contattoEmergenzaTel,
      cartella.contattoEmergenzaAltro,
    ]
      .filter(Boolean)
      .join(' · '),
  };
}
