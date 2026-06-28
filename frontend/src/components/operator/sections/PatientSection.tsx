import type { ComponentType } from 'react';
import type { SectionProps } from './types';
import { getSection } from './patientSections';

export function resolveSectionComponent(sectionKey: string): ComponentType<SectionProps<never>> | null {
  return getSection(sectionKey)?.component ?? null;
}

export function PatientSection({ sectionKey, ...rest }: { sectionKey: string } & SectionProps<never>) {
  const Cmp = resolveSectionComponent(sectionKey);
  if (!Cmp) { console.warn(`PatientSection: unknown section ${sectionKey}`); return null; }
  return <Cmp {...rest} />;
}
