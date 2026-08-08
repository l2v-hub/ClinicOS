// Traduzione delle azioni di navigazione di Agnos (NavAction del backend) in destinazioni ClinicOS.
// Puro: nessun React, nessuna fetch — il routing vero resta in App.tsx.
//
// Il backend compone `label` in forma verbale («Apri sezione THERAPY»): quel prefisso costa
// larghezza in una riga di chip larga ~384px senza aggiungere informazione, quindi l'etichetta
// visibile viene ricomposta qui dai campi strutturati e `label` resta solo come fallback per una
// forma non riconosciuta.

import { tabLabel, type TabId } from '../../operator/tabGroups';
import type { AssistantNav } from '../AIAssistantButton';

/** Tab della cartella su cui atterrare per un'azione con paziente; undefined = tab di default. */
export function navTabId(nav: Pick<AssistantNav, 'type' | 'sectionKey'>): TabId | undefined {
  // Tutte le sezioni narrative (ALLERGIES, DIAGNOSIS, ANAMNESIS, …) vivono in un unico tab: non
  // esiste un tab per chiave, e mandare su 'diagnosi' una NARRATIVE_SECTION porterebbe sul dato
  // strutturato invece che sul testo citato.
  if (nav.sectionKey) return 'sezioni-narrative';
  switch (nav.type) {
    case 'open_section':
      return 'sezioni-narrative';
    case 'open_therapy':
      return 'terapia-farmacologica';
    case 'open_parameter':
      return 'parametri';
    case 'open_document':
      return 'documenti';
    case 'open_consegne':
      return 'consegne';
    default:
      return undefined;
  }
}

/** Destinazioni che non corrispondono a un tab della cartella. */
const DESTINATION_LABEL: Record<string, string> = {
  open_therapies_today: 'Terapie di oggi',
  open_agenda: 'Agenda',
  open_beds: 'Posti letto',
  open_appointment: 'Agenda',
  open_patient: 'Scheda paziente',
};

function destinationLabel(nav: AssistantNav): string | undefined {
  const tab = navTabId(nav);
  return tab ? tabLabel(tab) : DESTINATION_LABEL[nav.type];
}

interface ChipLabelOptions {
  /** Nome del paziente bersaglio, se risolvibile. */
  patientName?: string;
  /** true quando il bersaglio è il paziente già aperto: il suffisso col nome è ridondante. */
  isCurrentPatient?: boolean;
}

/** `{Destinazione} · {Paziente} · {dettaglio}` — nessun verbo iniziale, nessuna icona. */
export function navChipLabel(nav: AssistantNav, opts: ChipLabelOptions = {}): string {
  const destination = destinationLabel(nav);
  if (!destination) return nav.label;
  const parts = [destination];
  if (nav.patientId && opts.patientName && !opts.isCurrentPatient) parts.push(opts.patientName);
  if (nav.pageNumber) parts.push(`p. ${nav.pageNumber}`);
  return parts.join(' · ');
}
