import { lazy } from 'react';

export const PresaInCaricoTab = lazy(() =>
  import('./cartella/PresaInCaricoTab').then((module) => ({ default: module.PresaInCaricoTab })),
);
export const DocumentiTab = lazy(() =>
  import('./cartella/DocumentiTab').then((module) => ({ default: module.DocumentiTab })),
);
export const NarrativeSectionsTab = lazy(() =>
  import('./cartella/NarrativeSectionsTab').then((module) => ({
    default: module.NarrativeSectionsTab,
  })),
);
export const DiarioPazienteTab = lazy(() =>
  import('./cartella/DiarioPazienteTab').then((module) => ({ default: module.DiarioPazienteTab })),
);
export const MedicazioniTab = lazy(() =>
  import('./cartella/MedicazioniTab').then((module) => ({ default: module.MedicazioniTab })),
);
export const ContenzioniTab = lazy(() =>
  import('./cartella/ContenzioniTab').then((module) => ({ default: module.ContenzioniTab })),
);
export const ScalaBradenTab = lazy(() =>
  import('./cartella/ScalaBradenTab').then((module) => ({ default: module.ScalaBradenTab })),
);
export const ScalaTinettiTab = lazy(() =>
  import('./cartella/ScalaTinettiTab').then((module) => ({ default: module.ScalaTinettiTab })),
);
export const DimissioneTab = lazy(() =>
  import('./cartella/DimissioneTab').then((module) => ({ default: module.DimissioneTab })),
);
export const EsamiConsulenzeTab = lazy(() =>
  import('./cartella/EsamiConsulenzeTab').then((module) => ({
    default: module.EsamiConsulenzeTab,
  })),
);
export const AnamnesisEditor = lazy(() =>
  import('./sections/AnamnesisEditor').then((module) => ({ default: module.AnamnesisEditor })),
);
export const TherapyEditor = lazy(() =>
  import('./sections/TherapyEditor').then((module) => ({ default: module.TherapyEditor })),
);
export const VitalSignsEditor = lazy(() =>
  import('./sections/VitalSignsEditor').then((module) => ({ default: module.VitalSignsEditor })),
);
export const PainAssessmentEditor = lazy(() =>
  import('./sections/PainAssessmentEditor').then((module) => ({
    default: module.PainAssessmentEditor,
  })),
);
export const InvioPSModal = lazy(() => import('./InvioPSModal'));
