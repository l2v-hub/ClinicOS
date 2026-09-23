import {
  PAINAD_KEYS,
  PAINAD_VERSION,
  type PainadAnswers,
  type PainadItemId,
  type AssessmentResult,
} from './assessmentTypes';
export interface AssessmentDefinition<Key extends string> {
  type: string;
  version: string;
  title: string;
  description: string;
  sourceSha256: string;
  items: ReadonlyArray<{ id: Key; label: string; options: readonly [string, string, string] }>;
}
export const PAINAD: AssessmentDefinition<PainadItemId> = {
  type: 'painad',
  version: PAINAD_VERSION,
  title: 'Scala PAINAD',
  description: 'Valutazione osservazionale del dolore nel paziente non verbale.',
  sourceSha256: '2a3c3b2724ed7cc46aa09db715680b0d494a63b587898b45d61c8db8ec73abb1',
  items: [
    {
      id: 'respiration',
      label: 'Respirazione',
      options: [
        'Normale',
        'Occasionalmente affannosa. Brevi periodi di iperventilazione.',
        'RUMOROSA. Respiro stertoroso. Iperventilazione prolungata.',
      ],
    },
    {
      id: 'negativeVocalization',
      label: 'Vocalizzazione negativa',
      options: [
        'Nessuna',
        'Lamenti o gemiti occasionali. Parlare a bassa voce con tono negativo.',
        'Chiamate ripetute a voce alta. Gemiti o lamenti costanti. Pianto.',
      ],
    },
    {
      id: 'facialExpression',
      label: 'Espressione facciale',
      options: [
        'Sorridente o inespressiva',
        'Triste, spaventata, corrucciata, smorfia occasionale.',
        'Smorfia marcata e costante. Serramento della mascella / denti stretti.',
      ],
    },
    {
      id: 'bodyLanguage',
      label: 'Linguaggio del corpo',
      options: [
        'Rilassato',
        'Teso, irrequieto, pacing (camminare avanti e indietro).',
        'Rigido. Pugni chiusi. Ginocchia al petto. Spinge via o colpisce.',
      ],
    },
    {
      id: 'consolability',
      label: 'Consolabilità',
      options: [
        'Non necessaria',
        'Rassicurato o distratto dalla voce o dal contatto fisico.',
        'Impossibile da rassicurare, distrarre o consolare.',
      ],
    },
  ],
};
export const emptyPainadAnswers = (): PainadAnswers => ({
  respiration: null,
  negativeVocalization: null,
  facialExpression: null,
  bodyLanguage: null,
  consolability: null,
});
export const answeredPainad = (answers: PainadAnswers) =>
  PAINAD_KEYS.filter((key) => answers[key] !== null).length;
export function painadResult(answers: PainadAnswers): AssessmentResult | null {
  if (PAINAD_KEYS.some((key) => answers[key] === null || ![0, 1, 2].includes(answers[key]!)))
    return null;
  const total = PAINAD_KEYS.reduce((sum, key) => sum + answers[key]!, 0);
  if (!total) return { total, band: 'none', label: 'Nessun dolore rilevato' };
  if (total <= 3) return { total, band: 'mild', label: 'Dolore lieve' };
  if (total <= 6) return { total, band: 'moderate', label: 'Dolore moderato' };
  return { total, band: 'severe', label: 'Dolore severo' };
}
export const PAINAD_BAND_NOTES = {
  none: '0 punti: nessun dolore rilevato.',
  mild: '1–3 punti: dolore lieve.',
  moderate: '4–6 punti: dolore moderato (richiede intervento/monitoraggio).',
  severe: '7–10 punti: dolore severo (richiede intervento analgesico e rivalutazione).',
};
export const PAINAD_INTERPRETATIONS = {
  none: 'Nessun dolore rilevato.',
  mild: 'Dolore lieve.',
  moderate: 'Dolore moderato (richiede intervento/monitoraggio).',
  severe: 'Dolore severo (richiede intervento analgesico e rivalutazione).',
};
