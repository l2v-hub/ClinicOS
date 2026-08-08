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
  | 'nrs'
  | 'dimissione'
  | 'esami-consulenze';

export type TabGroup = 'panoramica' | 'clinica' | 'diario' | 'moduli' | 'documenti';

export interface TabGroupDef {
  id: TabGroup;
  label: string;
  tabs: { id: TabId; label: string }[];
}

export const TAB_GROUPS: TabGroupDef[] = [
  {
    id: 'panoramica',
    label: 'Panoramica',
    tabs: [
      { id: 'riepilogo', label: 'Riepilogo' },
      { id: 'profilo', label: 'Profilo' },
      { id: 'consegne', label: 'Consegne' },
    ],
  },
  {
    id: 'clinica',
    label: 'Clinica',
    tabs: [
      { id: 'presa-in-carico', label: 'Presa in Carico' },
      { id: 'sezioni-narrative', label: 'Sezioni Cliniche (testo)' },
      { id: 'diagnosi', label: 'Diagnosi' },
      { id: 'terapia-farmacologica', label: 'Terapia Farmacologica' },
      { id: 'parametri', label: 'Parametri Vitali' },
      { id: 'note', label: 'Note & Visite' },
      { id: 'esami-consulenze', label: 'Esami & Consulenze' },
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
      { id: 'nrs', label: 'Scala NRS' },
      { id: 'dimissione', label: 'Dimissione' },
    ],
  },
  {
    id: 'documenti',
    label: 'Documenti',
    tabs: [{ id: 'documenti', label: 'Documenti' }],
  },
];

export function tabLabel(id: TabId): string | undefined {
  for (const g of TAB_GROUPS) {
    const t = g.tabs.find((x) => x.id === id);
    if (t) return t.label;
  }
  return undefined;
}
