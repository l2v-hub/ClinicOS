import { PAINAD_KEYS, type PainadAnswers, type PainadItemId, type PainadResult } from './types.js';

// Source text/provenance: PO10 source-text/painad.txt. Only documented editorial corrections.
export const PAINAD_ITEMS: ReadonlyArray<{
  id: PainadItemId;
  label: string;
  options: readonly [string, string, string];
}> = [
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
];
export const PAINAD_INTERPRETATIONS = {
  none: 'Nessun dolore rilevato.',
  mild: 'Dolore lieve.',
  moderate: 'Dolore moderato (richiede intervento/monitoraggio).',
  severe: 'Dolore severo (richiede intervento analgesico e rivalutazione).',
} as const;
export function painadResult(answers: PainadAnswers): PainadResult | null {
  if (PAINAD_KEYS.some((key) => answers[key] === null)) return null;
  const total = PAINAD_KEYS.reduce((sum, key) => sum + (answers[key] as number), 0);
  if (total === 0) return { total, band: 'none', label: 'Nessun dolore rilevato' };
  if (total <= 3) return { total, band: 'mild', label: 'Dolore lieve' };
  if (total <= 6) return { total, band: 'moderate', label: 'Dolore moderato' };
  return { total, band: 'severe', label: 'Dolore severo' };
}
