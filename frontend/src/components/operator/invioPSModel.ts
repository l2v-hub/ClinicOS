import { patientAge } from '../../lib/patientDemographics';
import type {
  Paziente,
  CartellaPaziente,
  DimissioneInfermieristica,
  PatientTherapyAPI,
} from '../../types';
import { formatFraction, computeEquivalent } from './cartella/therapyDose';
import { uniqueClinicalTexts } from '../../lib/clinicalHistory';

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
}

// ── Pure model builder (exported for unit testing) ────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT');
}

// The modal and regression tests use the same pure model.
export function buildInvioPSModel(
  paziente: Paziente,
  cartella: CartellaPaziente,
  therapies: PatientTherapyAPI[],
): InvioPSModel {
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
    dataStampa: new Date().toLocaleDateString('it-IT'),
    allergie,
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
    .filter((t) => t.stato === 'attiva')
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

  return { patient, dimissione, terapie };
}
