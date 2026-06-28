import type { ComponentType } from 'react';
import type { PatientSectionDefinition, SectionProps } from './types.js';

const TODO: ComponentType<SectionProps<never>> = () => { throw new Error('section component not yet extracted'); };

export const PATIENT_SECTIONS: PatientSectionDefinition[] = [
  { sectionKey: 'allergie',   title: 'Allergie',            component: TODO, availableDuringIntake: true,  requiredDuringIntake: false, supportedByDocumentImport: true,  permissions: ['operatore'] },
  { sectionKey: 'anamnesi',   title: 'Anamnesi',            component: TODO, availableDuringIntake: true,  requiredDuringIntake: false, supportedByDocumentImport: true,  permissions: ['operatore'] },
  { sectionKey: 'diagnosi',   title: 'Diagnosi',            component: TODO, availableDuringIntake: true,  requiredDuringIntake: false, supportedByDocumentImport: true,  permissions: ['operatore'] },
  { sectionKey: 'terapia',    title: 'Terapia Farmacologica', component: TODO, availableDuringIntake: true, requiredDuringIntake: false, supportedByDocumentImport: true, permissions: ['operatore'] },
  { sectionKey: 'parametri',  title: 'Parametri Vitali',    component: TODO, availableDuringIntake: true,  requiredDuringIntake: false, supportedByDocumentImport: false, permissions: ['operatore'] },
  { sectionKey: 'dolore',     title: 'Dolore (NRS)',        component: TODO, availableDuringIntake: true,  requiredDuringIntake: false, supportedByDocumentImport: false, permissions: ['operatore'] },
];

export function intakeSections(): PatientSectionDefinition[] {
  return PATIENT_SECTIONS.filter(s => s.availableDuringIntake);
}

export function getSection(sectionKey: string): PatientSectionDefinition | undefined {
  return PATIENT_SECTIONS.find(s => s.sectionKey === sectionKey);
}
