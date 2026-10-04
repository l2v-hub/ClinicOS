// Cronologia di navigazione di sessione: ogni voce ricorda pagina, paziente e sezione della
// cartella, più l'etichetta della voce precedente, così la freccia "indietro" dice dove porta.
// L'etichetta può contenere il nome del paziente: vive solo in history.state (sessione del
// browser), mai nell'URL, che continua a portare solo l'id opaco.
import { tabLabel, type TabId } from '../components/operator/tabGroups';
import { parsePatientTargetHash, storedTarget, type StoredPatientTarget } from './patientTargetHash';

export interface NavEntry {
  navKey: string;
  pazienteId?: string;
  /** "Cognome, Nome" come nella testata della cartella; solo per l'etichetta. */
  pazienteNome?: string;
  patientTab?: TabId;
  /** Direct access: item inside the section (therapy, handover, diary entry…). */
  patientTarget?: StoredPatientTarget;
}

export interface NavHistoryState {
  navKey: string;
  pazienteId?: string;
  patientTab?: TabId;
  patientTarget?: StoredPatientTarget;
  prevNavKey?: string;
  prevLabel?: string;
}

/** Collegamenti incollati o hash-only non hanno necessariamente history.state. */
export function navStateFromHash(hash: string, navLabels: Record<string, string>): NavHistoryState | null {
  const linked = parsePatientTargetHash(hash);
  if (linked) return {
    navKey: 'dettaglio-paziente', pazienteId: linked.patientId,
    patientTab: linked.tab ?? 'panoramica', patientTarget: storedTarget(linked),
  };
  const key = hash.replace(/^#\/?/, '').split('?')[0];
  return key && key !== 'dettaglio-paziente' && Object.hasOwn(navLabels, key)
    ? { navKey: key } : null;
}

/** Le pagine montate da una sola shell non devono lasciare una schermata vuota. */
export function routeMatchesShell(key: string, shell: 'admin' | 'operator'): boolean {
  const adminOnly = ['admin-dashboard', 'gestione-operatori', 'agenda-admin', 'posti-letto', 'orari-operatori'];
  const operatorOnly = ['operator-dashboard', 'anagrafica-farmaci', 'parametri-multipaziente', 'agenda-operatore'];
  return !(shell === 'operator' ? adminOnly : operatorOnly).includes(key);
}

export function navEntryLabel(entry: NavEntry, navLabels: Record<string, string>): string {
  if (entry.navKey === 'dettaglio-paziente' && entry.pazienteNome) {
    const section = entry.patientTab ? tabLabel(entry.patientTab) : undefined;
    return section ? `${entry.pazienteNome} · ${section}` : entry.pazienteNome;
  }
  return navLabels[entry.navKey] ?? 'Indietro';
}

export function navHistoryState(
  next: NavEntry,
  previous: NavEntry | null,
  navLabels: Record<string, string>,
): NavHistoryState {
  return {
    navKey: next.navKey,
    ...(next.pazienteId ? { pazienteId: next.pazienteId } : {}),
    ...(next.patientTab ? { patientTab: next.patientTab } : {}),
    ...(next.patientTarget ? { patientTarget: next.patientTarget } : {}),
    ...(previous
      ? { prevNavKey: previous.navKey, prevLabel: navEntryLabel(previous, navLabels) }
      : {}),
  };
}

export const patientDisplayName = (p: { firstName: string; lastName: string }) =>
  `${p.lastName}, ${p.firstName}`;
