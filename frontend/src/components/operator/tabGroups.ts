// Tassonomia dei tab della cartella paziente. Vive fuori da PatientDetail.tsx perché è la sola
// fonte delle etichette italiane dei tab: anche la navigazione di Agnos le riusa, e importare
// l'intero componente per leggere una lista di stringhe legherebbe una funzione pura all'albero
// dei componenti clinici.

// #243: esportato così i chiamanti (App.tsx) possono richiedere un tab iniziale — es. atterrare su
// uno specifico flusso "Moduli" subito dopo la creazione paziente dal wizard di intake.
// #245: 'anamnesi' rimosso — il tab editabile duplicato non esiste più (resta la sola superficie
// narrativa 'sezioni-narrative'). #278: l'anamnesi strutturata torna modificabile lì tramite
// AnamnesisEditor (stesso editor dell'intake).
import type { AssessmentType } from '../../lib/assessments/assessmentTypes';
export type TabId =
  | 'panoramica'
  | 'moduli'
  | 'riepilogo'
  | 'profilo'
  | 'contatti'
  | 'diagnosi'
  | 'terapia-farmacologica'
  | 'note'
  | 'parametri'
  | 'consegne'
  | 'presa-in-carico'
  | 'documenti'
  | 'diario'
  | 'sezioni-narrative'
  | 'medicazioni'
  | 'contenzioni'
  | 'braden'
  | 'tinetti'
  | 'mna'
  | 'gds'
  | 'barthel'
  | 'ucla_npi_sleep'
  | 'nrs'
  | 'painad'
  | 'postural_transfers'
  | 'dimissione'
  | 'esami-consulenze';

export type TabGroup = 'panoramica' | 'clinica' | 'diario' | 'moduli' | 'documenti' | 'dimissione';

export interface TabGroupDef {
  id: TabGroup;
  label: string;
  tabs: { id: TabId; label: string }[];
}

export const TAB_GROUPS: TabGroupDef[] = [
  {
    id: 'panoramica',
    label: 'Raccolta dati ingresso',
    tabs: [
      { id: 'profilo', label: 'Anagrafica' },
      { id: 'contatti', label: 'Contatti' },
      { id: 'presa-in-carico', label: 'Presa in carico' },
    ],
  },
  {
    id: 'clinica',
    label: 'Clinica',
    tabs: [
      { id: 'diagnosi', label: 'Diagnosi' },
      { id: 'terapia-farmacologica', label: 'Terapia Farmacologica' },
      { id: 'consegne', label: 'Consegne' },
      { id: 'parametri', label: 'Parametri Vitali' },
      { id: 'esami-consulenze', label: 'Esami e consulenze' },
      { id: 'note', label: 'Note e visite' },
    ],
  },
  {
    id: 'diario',
    label: 'Diario',
    tabs: [{ id: 'diario', label: 'Diario Paziente' }],
  },
  {
    id: 'moduli',
    label: 'Moduli',
    tabs: [
      { id: 'medicazioni', label: 'Medicazioni' },
      { id: 'contenzioni', label: 'Contenzioni' },
      { id: 'braden', label: 'Scala Braden' },
      { id: 'tinetti', label: 'Scala Tinetti' },
      { id: 'mna', label: 'MNA · Nutrizione' },
      { id: 'gds', label: 'GDS-15 · Depressione' },
      { id: 'barthel', label: 'Indice di Barthel' },
      { id: 'ucla_npi_sleep', label: 'UCLA · Sonno-veglia' },
      { id: 'nrs', label: 'Storico NRS precedente' },
      { id: 'painad', label: 'Scala PAINAD' },
      { id: 'postural_transfers', label: 'Trasferimenti posturali' },
    ],
  },
  {
    id: 'documenti',
    label: 'Documenti',
    tabs: [{ id: 'documenti', label: 'Documenti' }],
  },
  {
    id: 'dimissione',
    label: 'Dimissione',
    tabs: [{ id: 'dimissione', label: 'Dimissione' }],
  },
];

export const assessmentPatientTab = (type: AssessmentType): TabId =>
  type === 'gds15' ? 'gds' : type;

export function tabLabel(id: TabId): string | undefined {
  if (id === 'panoramica') return 'Panoramica';
  if (id === 'moduli') return 'Moduli';
  if (id === 'sezioni-narrative') return 'Sezioni cliniche';
  id = resolvePatientTab(id);
  for (const g of TAB_GROUPS) {
    const t = g.tabs.find((x) => x.id === id);
    if (t) return t.label;
  }
  return undefined;
}

/** Preserve existing dashboard/Agnos destinations after reorganizing the chart. */
export function resolvePatientTab(id?: TabId): TabId {
  // HMI 1: la cartella si apre sulla Panoramica (parametri, NEWS2, diario), come il prototipo.
  if (!id || id === 'riepilogo') return 'panoramica';
  return id === 'sezioni-narrative' ? 'diagnosi' : id;
}

export function patientTabGroup(id?: TabId): TabGroup {
  if (id === 'moduli') return 'moduli';
  const tab = resolvePatientTab(id);
  return TAB_GROUPS.find((group) => group.tabs.some((item) => item.id === tab))?.id ?? 'panoramica';
}

// ── HMI 1: le 8 sezioni della cartella (una sola fila di chip, come il prototipo) ──────────────
// Ogni sezione mostra insieme i suoi contenuti; i TabId restano le destinazioni dei link diretti
// (assistente, rientro dopo l'intake, moduli), che aprono la sezione che li contiene.

export type ChartSection =
  | 'panoramica'
  | 'ingresso'
  | 'clinica'
  | 'terapia'
  | 'parametri'
  | 'moduli'
  | 'documenti'
  | 'dimissione';

export interface ChartSectionDef {
  id: ChartSection;
  label: string;
  /** Contenuti mostrati insieme nella sezione, nell'ordine. */
  tabs: TabId[];
}

const MODULE_TABS: TabId[] = [
  'moduli',
  'medicazioni',
  'contenzioni',
  'braden',
  'tinetti',
  'mna',
  'gds',
  'barthel',
  'ucla_npi_sleep',
  'nrs',
  'painad',
  'postural_transfers',
];

export const CHART_SECTIONS: ChartSectionDef[] = [
  { id: 'panoramica', label: 'Panoramica', tabs: ['panoramica', 'diario'] },
  { id: 'ingresso', label: 'Dati di ingresso', tabs: ['profilo', 'contatti', 'presa-in-carico'] },
  {
    id: 'clinica',
    label: 'Clinica',
    tabs: ['diagnosi', 'esami-consulenze', 'note', 'consegne'],
  },
  { id: 'terapia', label: 'Terapia', tabs: ['terapia-farmacologica'] },
  { id: 'parametri', label: 'Parametri', tabs: ['parametri'] },
  { id: 'moduli', label: 'Moduli', tabs: MODULE_TABS },
  { id: 'documenti', label: 'Documenti', tabs: ['documenti'] },
  { id: 'dimissione', label: 'Dimissione', tabs: ['dimissione'] },
];

/** Capability di lettura senza la quale una sezione intera risponderebbe solo 403 (es. OSS:
 *  terapia e documenti negati dalla policy). La GUI la nasconde; l'autorizzazione resta sul server. */
export const CHART_SECTION_CAPABILITY: Partial<Record<ChartSection, string>> = {
  terapia: 'therapy.list',
  documenti: 'documents.list',
};

export function chartSectionAllowed(section: ChartSection, can: (capability: string) => boolean) {
  const capability = CHART_SECTION_CAPABILITY[section];
  return capability ? can(capability) : true;
}

/** La sezione che contiene un tab (i link diretti aprono questa). */
export function chartSectionOf(id?: TabId): ChartSection {
  const tab = resolvePatientTab(id);
  return CHART_SECTIONS.find((section) => section.tabs.includes(tab))?.id ?? 'panoramica';
}

/** Solo per le azioni Milo che indicano esplicitamente un paziente; la sidebar è globale. */
export const PATIENT_SECTION_FOR_WARD_NAV: Readonly<Record<string, TabId>> = {
  'parametri-multipaziente': 'parametri',
  consegne: 'consegne',
};
