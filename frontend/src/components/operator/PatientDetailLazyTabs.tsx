import { lazy } from 'react';

// Ogni tab della cartella e' un chunk separato. Le funzioni di import sono condivise fra i
// componenti lazy e il precaricamento a browser inattivo (preloadPatientDetailTabs, avviato da
// App dopo il login): il primo click su un tab non attende piu' la rete.
const tabLoaders = {
  // Solo precaricamento: il tab Terapia e' reso da TherapyEditor tramite il proprio lazy().
  TerapiaFarmacologicaTabChunk: () => import('./cartella/TerapiaFarmacologicaTab'),
  AssessmentWorkspace: () => import('./assessments/AssessmentWorkspace'),
  PresaInCaricoTab: () => import('./cartella/PresaInCaricoTab'),
  DocumentiTab: () => import('./cartella/DocumentiTab'),
  NarrativeSectionsTab: () => import('./cartella/NarrativeSectionsTab'),
  DiarioPazienteTab: () => import('./cartella/DiarioPazienteTab'),
  MedicazioniTab: () => import('./cartella/MedicazioniTab'),
  ContenzioniTab: () => import('./cartella/ContenzioniTab'),
  ScalaBradenTab: () => import('./cartella/ScalaBradenTab'),
  ScalaTinettiTab: () => import('./cartella/ScalaTinettiTab'),
  DimissioneTab: () => import('./cartella/DimissioneTab'),
  EsamiConsulenzeTab: () => import('./cartella/EsamiConsulenzeTab'),
  AnamnesisEditor: () => import('./sections/AnamnesisEditor'),
  TherapyEditor: () => import('./sections/TherapyEditor'),
  VitalSignsEditor: () => import('./sections/VitalSignsEditor'),
  PainAssessmentEditor: () => import('./sections/PainAssessmentEditor'),
  InvioPSModal: () => import('./InvioPSModal'),
};

export const AssessmentWorkspace = lazy(() =>
  tabLoaders.AssessmentWorkspace().then((module) => ({ default: module.AssessmentWorkspace })),
);
export const PresaInCaricoTab = lazy(() =>
  tabLoaders.PresaInCaricoTab().then((module) => ({ default: module.PresaInCaricoTab })),
);
export const DocumentiTab = lazy(() =>
  tabLoaders.DocumentiTab().then((module) => ({ default: module.DocumentiTab })),
);
export const NarrativeSectionsTab = lazy(() =>
  tabLoaders.NarrativeSectionsTab().then((module) => ({ default: module.NarrativeSectionsTab })),
);
export const DiarioPazienteTab = lazy(() =>
  tabLoaders.DiarioPazienteTab().then((module) => ({ default: module.DiarioPazienteTab })),
);
export const MedicazioniTab = lazy(() =>
  tabLoaders.MedicazioniTab().then((module) => ({ default: module.MedicazioniTab })),
);
export const ContenzioniTab = lazy(() =>
  tabLoaders.ContenzioniTab().then((module) => ({ default: module.ContenzioniTab })),
);
export const ScalaBradenTab = lazy(() =>
  tabLoaders.ScalaBradenTab().then((module) => ({ default: module.ScalaBradenTab })),
);
export const ScalaTinettiTab = lazy(() =>
  tabLoaders.ScalaTinettiTab().then((module) => ({ default: module.ScalaTinettiTab })),
);
export const DimissioneTab = lazy(() =>
  tabLoaders.DimissioneTab().then((module) => ({ default: module.DimissioneTab })),
);
export const EsamiConsulenzeTab = lazy(() =>
  tabLoaders.EsamiConsulenzeTab().then((module) => ({ default: module.EsamiConsulenzeTab })),
);
export const AnamnesisEditor = lazy(() =>
  tabLoaders.AnamnesisEditor().then((module) => ({ default: module.AnamnesisEditor })),
);
export const TherapyEditor = lazy(() =>
  tabLoaders.TherapyEditor().then((module) => ({ default: module.TherapyEditor })),
);
export const VitalSignsEditor = lazy(() =>
  tabLoaders.VitalSignsEditor().then((module) => ({ default: module.VitalSignsEditor })),
);
export const PainAssessmentEditor = lazy(() =>
  tabLoaders.PainAssessmentEditor().then((module) => ({ default: module.PainAssessmentEditor })),
);
export const InvioPSModal = lazy(() => tabLoaders.InvioPSModal());

/** Scarica in sequenza tutti i chunk dei tab; gli errori di rete sono ignorati (il tab li
 * ritentera' al primo render). */
// Esclusi dal precaricamento: trascinano lo stack PDF (~1,7 MB) che serve solo a chi apre
// l'archivio documenti o un modulo con anteprima; quei tab si caricano al primo click come prima.
const PRELOAD_EXCLUDED: ReadonlySet<keyof typeof tabLoaders> = new Set([
  'AssessmentWorkspace',
  'DocumentiTab',
]);

export async function preloadPatientDetailTabs(): Promise<void> {
  for (const [name, load] of Object.entries(tabLoaders)) {
    if (PRELOAD_EXCLUDED.has(name as keyof typeof tabLoaders)) continue;
    try {
      await load();
    } catch {
      /* ritentato dal tab stesso */
    }
  }
}
