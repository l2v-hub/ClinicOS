import type { ComponentType } from 'react';
import type { PatientSectionDefinition, SectionProps } from './types.js';
import { AllergiesEditor } from './AllergiesEditor.js';
import { AnamnesisEditor } from './AnamnesisEditor.js';
import { DiagnosisEditor } from './DiagnosisEditor.js';
import { TherapyEditor } from './TherapyEditor.js';
import { VitalSignsEditor } from './VitalSignsEditor.js';
import { PainAssessmentEditor } from './PainAssessmentEditor.js';

export const PATIENT_SECTIONS: PatientSectionDefinition[] = [
  { sectionKey: 'allergie',   title: 'Allergie',            component: AllergiesEditor as ComponentType<SectionProps<never>>, availableDuringIntake: true,  requiredDuringIntake: false, supportedByDocumentImport: true,  permissions: ['operatore'] },
  { sectionKey: 'anamnesi',   title: 'Anamnesi',            component: AnamnesisEditor as ComponentType<SectionProps<never>>, availableDuringIntake: true,  requiredDuringIntake: false, supportedByDocumentImport: true,  permissions: ['operatore'] },
  { sectionKey: 'diagnosi',   title: 'Diagnosi',            component: DiagnosisEditor as ComponentType<SectionProps<never>>, availableDuringIntake: true,  requiredDuringIntake: false, supportedByDocumentImport: true,  permissions: ['operatore'] },
  { sectionKey: 'terapia',    title: 'Terapia Farmacologica', component: TherapyEditor as unknown as ComponentType<SectionProps<never>>, availableDuringIntake: true, requiredDuringIntake: false, supportedByDocumentImport: true, permissions: ['operatore'] },
  { sectionKey: 'parametri',  title: 'Parametri Vitali',    component: VitalSignsEditor as unknown as ComponentType<SectionProps<never>>, availableDuringIntake: true,  requiredDuringIntake: false, supportedByDocumentImport: false, permissions: ['operatore'] },
  { sectionKey: 'dolore',     title: 'Dolore (NRS)',        component: PainAssessmentEditor as unknown as ComponentType<SectionProps<never>>, availableDuringIntake: true,  requiredDuringIntake: false, supportedByDocumentImport: false, permissions: ['operatore'] },
];

export function intakeSections(): PatientSectionDefinition[] {
  return PATIENT_SECTIONS.filter(s => s.availableDuringIntake);
}

export function getSection(sectionKey: string): PatientSectionDefinition | undefined {
  return PATIENT_SECTIONS.find(s => s.sectionKey === sectionKey);
}
