// Card paziente della schermata Turno (HMI 1): solo dati reali del roster, del riepilogo clinico e
// delle terapie. Nessuna diagnosi (il roster non la porta) e nessun valore inventato: se una fonte
// è in caricamento o non disponibile la card lo dice, non mostra un "niente" che non è verificato.
import type { ClinicalSummaryEntry, Paziente } from '../types';
import { therapyCalendar, type ScadenzaTerapia } from './dashboardTherapies';
import { patientAge } from './patientDemographics';
import { parsePatientLocation } from './patientIdentity';
import { patientDisplayName } from './patientComboboxModel';

export type TurnoBadgeTone = 'crit' | 'warn' | 'blue';
export type SourceState = 'ready' | 'loading' | 'error';

export interface TurnoBadge {
  key: string;
  label: string;
  tone: TurnoBadgeTone;
  /** Allergia: icona di allerta come nel prototipo. */
  alert?: boolean;
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
export function inCaricoNelTurno(summary: ClinicalSummaryEntry | undefined): boolean {
  return summary?.statoRicovero !== 'dimesso';
}

/** La prossima cosa da fare in terapia per il paziente, come il prototipo: prima ciò che è in
 *  ritardo, poi la prossima programmata, poi ciò che ha l'orario da verificare. */
function prossimaTerapia(
  patientId: string,
  therapies: TurnoTherapies,
  oggi: string,
): { text: string; late: boolean } {
  if (therapies.state === 'loading') return { text: 'Terapie in verifica…', late: false };
  if (therapies.state === 'error') return { text: 'Terapie non disponibili', late: false };
  const quando = (row: ScadenzaTerapia) => (row.data === oggi ? row.ora : `domani ${row.ora}`);
  // `scadute` è ordinata: la prima del paziente è la più vecchia; si segnala quella.
  const late = therapies.scadute.find((row) => row.patientId === patientId);
  if (late) {
    const altre = therapies.scadute.filter((row) => row.patientId === patientId).length - 1;
    return {
      text: `In ritardo: ${late.farmaco} ${late.dose} · ${quando(late)}${altre > 0 ? ` (+${altre})` : ''}`,
      late: true,
    };
  }
  const next = therapies.prossime.find((row) => row.patientId === patientId && row.ora !== null);
  if (next)
    return { text: `Prossima: ${next.farmaco} ${next.dose} · ${quando(next)}`, late: false };
  const noTime = therapies.senzaOrario.find(
    (row) => row.patientId === patientId && row.data === oggi,
  );
  if (noTime)
    return {
      text: `Da verificare: ${noTime.farmaco} ${noTime.dose} · orario non indicato`,
      late: false,
    };
  if (therapies.domani === 'error')
    return { text: 'Nessuna terapia oggi · domani non verificato', late: false };
  if (therapies.domani === 'loading')
    return { text: 'Nessuna terapia oggi · domani in verifica', late: false };
  return { text: 'Nessuna terapia in sospeso', late: false };
}

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
      badges.push({ key: 'allergia', label: 'Allergia', tone: 'crit', alert: true });
    if (summary.hasCriticalVitals)
      badges.push({ key: 'critici', label: 'Parametri critici', tone: 'crit' });
    if (summary.hasHighRisk)
      badges.push({ key: 'rischio', label: 'Rischio elevato', tone: 'warn' });
    if (summary.consegneAperte > 0)
      badges.push({ key: 'consegne', label: `Consegne ${summary.consegneAperte}`, tone: 'blue' });
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
  };
}
