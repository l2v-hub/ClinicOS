// Tassonomia dei tab della cartella paziente. Vive fuori da PatientDetail.tsx perché è la sola
// fonte delle etichette italiane dei tab: anche la navigazione di Agnos le riusa, e importare
// l'intero componente per leggere una lista di stringhe legherebbe una funzione pura all'albero
// dei componenti clinici.

// #243: esportato così i chiamanti (App.tsx) possono richiedere un tab iniziale — es. atterrare su
// uno specifico flusso "Moduli" subito dopo la creazione paziente dal wizard di intake.
// #245: 'anamnesi' rimosso — il tab editabile duplicato non esiste più (resta la sola superficie
// narrativa 'sezioni-narrative'). #278: l'anamnesi strutturata torna modificabile lì tramite
// AnamnesisEditor (stesso editor dell'intake).
export type TabId =
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
      { id: 'nrs', label: 'Scala NRS' },
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

export function tabLabel(id: TabId): string | undefined {
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
  if (!id || id === 'riepilogo') return 'profilo';
  return id === 'sezioni-narrative' ? 'diagnosi' : id;
}

export function patientTabGroup(id?: TabId): TabGroup {
  const tab = resolvePatientTab(id);
  return TAB_GROUPS.find((group) => group.tabs.some((item) => item.id === tab))?.id ?? 'panoramica';
}
