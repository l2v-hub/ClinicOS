export const STRUCTURED_CLINICAL_TOPICS = ['DIAGNOSIS', 'ALLERGIES', 'ANAMNESIS'] as const;
export type StructuredClinicalTopic = typeof STRUCTURED_CLINICAL_TOPICS[number];

export function isStructuredClinicalTopic(key: string): key is StructuredClinicalTopic {
  return STRUCTURED_CLINICAL_TOPICS.some(topic => topic === key);
}

/** Only the exact legacy document-absence marker is empty, never clinical negatives. */
export function hasNarrativeContent(text: string | null | undefined): boolean {
  const value = (text ?? '').trim();
  return value !== '' && !/^non presente nel documento\.?$/i.test(value);
}

export function partitionNarrativeSections<T extends {
  sectionKey: string; originalText: string; reviewedText: string;
  displayText?: string; reviewStatus: string;
}>(sections: readonly T[]): { standalone: T[]; empty: T[] } {
  const standalone: T[] = [], empty: T[] = [];
  for (const section of sections) {
    if (isStructuredClinicalTopic(section.sectionKey)) continue;
    const hasText = [section.originalText, section.reviewedText, section.displayText].some(hasNarrativeContent);
    (hasText || section.reviewStatus === 'conflict' ? standalone : empty).push(section);
  }
  return { standalone, empty };
}
