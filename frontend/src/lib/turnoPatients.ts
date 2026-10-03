// Card paziente della schermata Turno (HMI 1): solo dati reali del roster, del riepilogo clinico e
// delle terapie. Nessuna diagnosi (il roster non la porta) e nessun valore inventato: se una fonte
// è in caricamento o non disponibile la card lo dice, non mostra un "niente" che non è verificato.
import type { ClinicalSummaryEntry, Paziente } from '../types';
import { therapyCalendar, type ScadenzaTerapia } from './dashboardTherapies';
import { patientAge } from './patientDemographics';
import { parsePatientLocation } from './patientIdentity';
import { patientDisplayName } from './patientComboboxModel';
import type { PatientTarget } from './patientTarget';
import { doseSignal, landingOf, type PatientSignal } from './patientTargetResolver';

/** Where a card element lands inside the patient's chart (direct access). */
export type TurnoLanding = Omit<PatientTarget, 'patientId'>;

export type TurnoBadgeTone = 'crit' | 'warn' | 'blue';
export type SourceState = 'ready' | 'loading' | 'error';

export interface TurnoBadge {
  key: string;
  label: string;
  tone: TurnoBadgeTone;
  /** Allergia: icona di allerta come nel prototipo. */
  alert?: boolean;
  /** Direct access: the chip opens the chart where that signal lives. */
  landing?: TurnoLanding;
}

/** One therapy item of the card's therapy line: each is its own link to that dose. */
export interface TurnoTherapyItem {
  key: string;
  text: string;
  landing: TurnoLanding;
}

export interface TurnoPatientCard {
  id: string;
  nome: string;
  /** Riquadro a sinistra: la camera (o "—" se il posto letto non è noto). */
  camera: string;
  /** "84 anni · Letto B"; le parti mancanti vengono dette, non omesse in silenzio. */
  sottotitolo: string;
  badges: TurnoBadge[];
  prossima: string;
  /** true = la riga "prossima" segnala un ritardo (in rosso). */
  prossimaInRitardo: boolean;
  /** "In ritardo" / "Prossima" / "Da verificare"; null when the line is only a status. */
  prossimaEtichetta: string | null;
  /** Every dose the line refers to (ALL late doses, not "+N"), each a link to that therapy. */
  prossimaVoci: TurnoTherapyItem[];
}

export interface TurnoTherapies {
  state: SourceState;
  scadute: ScadenzaTerapia[];
  prossime: ScadenzaTerapia[];
  senzaOrario: ScadenzaTerapia[];
  /** Scadenze di domani: se non lette, "nessuna terapia" non è verificato oltre oggi. */
  domani?: SourceState;
}

function locationParts(value: unknown): { camera: string; letto: string } {
  const location = parsePatientLocation(value);
  if (!location || location.status !== 'assigned')
    return { camera: '—', letto: 'Posto letto non assegnato' };
  return {
    camera: location.room ?? '—',
    letto: location.bed ? `Letto ${location.bed}` : 'Letto non indicato',
  };
}

/** Pazienti del turno: tutti tranne i dimessi. Va chiamata solo con il riepilogo disponibile. */
/** «Allergia: Penicillina, Lattice» — the generic label only when the details are unknown. */
export function badgeLabel(base: string, details: string[] | undefined): string {
  const list = (details ?? []).map((d) => d.trim()).filter(Boolean);
  return list.length ? `${base}: ${list.join(', ')}` : base;
}

export function inCaricoNelTurno(summary: ClinicalSummaryEntry | undefined): boolean {
  return summary?.statoRicovero !== 'dimesso';
}

/** La prossima cosa da fare in terapia per il paziente, come il prototipo: prima ciò che è in
 *  ritardo, poi la prossima programmata, poi ciò che ha l'orario da verificare. */
interface ProssimaTerapia {
  text: string;
  late: boolean;
  label: string | null;
  items: TurnoTherapyItem[];
}

const status = (text: string): ProssimaTerapia => ({ text, late: false, label: null, items: [] });

function doseItem(row: ScadenzaTerapia, text: string): TurnoTherapyItem {
  return { key: row.id, text, landing: landingOf(doseSignal(row)) };
}

function prossimaTerapia(
  patientId: string,
  therapies: TurnoTherapies,
  oggi: string,
): ProssimaTerapia {
  if (therapies.state === 'loading') return status('Terapie in verifica…');
  if (therapies.state === 'error') return status('Terapie non disponibili');
  const quando = (row: ScadenzaTerapia) => (row.data === oggi ? row.ora : `domani ${row.ora}`);
  // `scadute` è ordinata dalla più vecchia: TUTTE le dosi in ritardo, ognuna col suo link
  // (prima "(+1)" nascondeva il secondo farmaco dietro un'apertura della cartella).
  const late = therapies.scadute.filter((row) => row.patientId === patientId);
  if (late.length > 0) {
    const items = late.map((row) => doseItem(row, `${row.farmaco} ${row.dose} · ${quando(row)}`));
    return {
      text: `In ritardo: ${items.map((item) => item.text).join(', ')}`,
      late: true,
      label: 'In ritardo',
      items,
    };
  }
  const next = therapies.prossime.find((row) => row.patientId === patientId && row.ora !== null);
  if (next) {
    const item = doseItem(next, `${next.farmaco} ${next.dose} · ${quando(next)}`);
    return { text: `Prossima: ${item.text}`, late: false, label: 'Prossima', items: [item] };
  }
  const noTime = therapies.senzaOrario.find(
    (row) => row.patientId === patientId && row.data === oggi,
  );
  if (noTime) {
    const item = doseItem(noTime, `${noTime.farmaco} ${noTime.dose} · orario non indicato`);
    return {
      text: `Da verificare: ${item.text}`,
      late: false,
      label: 'Da verificare',
      items: [item],
    };
  }
  if (therapies.domani === 'error') return status('Nessuna terapia oggi · domani non verificato');
  if (therapies.domani === 'loading') return status('Nessuna terapia oggi · domani in verifica');
  return status('Nessuna terapia in sospeso');
}

const badgeLanding = (patientId: string, kind: PatientSignal['kind']): TurnoLanding =>
  landingOf({ kind, patientId } as PatientSignal);

export function turnoPatientCard(
  patient: Paziente,
  summary: ClinicalSummaryEntry | undefined,
  summaryState: SourceState,
  therapies: TurnoTherapies,
  today = new Date(),
): TurnoPatientCard {
  const age = patientAge(patient.dateOfBirth, today);
  const { camera, letto } = locationParts(patient.location);
  const badges: TurnoBadge[] = [];
  if (summary) {
    if (summary.allergieCount > 0)
      badges.push({
        key: 'allergia',
        // Il badge dice QUALE allergene (UX: informazione senza click), non solo «Allergia».
        label: badgeLabel(
          'Allergia',
          summary.allergeni?.map((a) => a.allergene),
        ),
        tone: 'crit',
        alert: true,
        landing: badgeLanding(patient.id, 'allergy'),
      });
    if (summary.hasCriticalVitals)
      badges.push({
        key: 'critici',
        label: badgeLabel(
          'Parametri critici',
          summary.parametriCritici?.map((p) =>
            [p.etichetta, p.valore, p.unita].filter(Boolean).join(' '),
          ),
        ),
        tone: 'crit',
        landing: badgeLanding(patient.id, 'critical-vitals'),
      });
    if (summary.hasHighRisk)
      badges.push({
        key: 'rischio',
        label: badgeLabel(
          'Rischio elevato',
          summary.rischiElevati?.map((r) => `${r.tipo} ${r.livello}`.trim()),
        ),
        tone: 'warn',
        landing: badgeLanding(patient.id, 'risk'),
      });
    if (summary.consegneAperte > 0)
      badges.push({
        key: 'consegne',
        label: `Consegne ${summary.consegneAperte}`,
        tone: 'blue',
        landing: badgeLanding(patient.id, 'handover'),
      });
  } else {
    // Senza riepilogo non si sa se ci sono allergie o criticità: lo si dice sulla card.
    badges.push({
      key: 'riepilogo',
      label:
        summaryState === 'loading' ? 'Dati clinici in verifica' : 'Dati clinici non disponibili',
      tone: 'warn',
    });
  }
  const next = prossimaTerapia(patient.id, therapies, therapyCalendar(today).oggi);
  return {
    id: patient.id,
    nome: patientDisplayName(patient),
    camera,
    sottotitolo: `${age === null ? 'Età non disponibile' : `${age} anni`} · ${letto}`,
    badges,
    prossima: next.text,
    prossimaInRitardo: next.late,
    prossimaEtichetta: next.label,
    prossimaVoci: next.items,
  };
}
