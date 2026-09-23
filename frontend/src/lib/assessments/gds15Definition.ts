import {
  GDS15_KEYS,
  GDS15_VERSION,
  GDS15_SOURCE_SHA256,
  type Gds15Answers,
  type Gds15ItemId,
  type Gds15Result,
} from './gds15Types';
export { GDS15_KEYS } from './gds15Types';
export const GDS15_ITEMS: readonly { id: Gds15ItemId; label: string; pointForYes: boolean }[] = [
  {
    id: 'q1',
    label: 'È sostanzialmente soddisfatto/a della sua vita?',
    pointForYes: false,
  },
  {
    id: 'q2',
    label: 'Ha rinunciato a molte delle sue attività e interessi?',
    pointForYes: true,
  },
  {
    id: 'q3',
    label: 'Sente che la sua vita sia vuota?',
    pointForYes: true,
  },
  {
    id: 'q4',
    label: 'Si sente spesso annoiato/a?',
    pointForYes: true,
  },
  {
    id: 'q5',
    label: 'È di buon umore per la maggior parte del tempo?',
    pointForYes: false,
  },
  {
    id: 'q6',
    label: 'Ha paura che stia per succederle qualcosa di brutto?',
    pointForYes: true,
  },
  {
    id: 'q7',
    label: 'Si sente felice per la maggior parte del tempo?',
    pointForYes: false,
  },
  {
    id: 'q8',
    label: 'Si sente spesso impotente/senza aiuto?',
    pointForYes: true,
  },
  {
    id: 'q9',
    label: 'Preferisce stare a casa piuttosto che uscire e fare cose nuove?',
    pointForYes: true,
  },
  {
    id: 'q10',
    label: 'Sente di avere più problemi di memoria rispetto alla maggior parte delle persone?',
    pointForYes: true,
  },
  {
    id: 'q11',
    label: 'Pensa che sia bello essere vivi in questo momento?',
    pointForYes: false,
  },
  {
    id: 'q12',
    label: 'Si sente piuttosto inutile/senza valore per come è ora?',
    pointForYes: true,
  },
  {
    id: 'q13',
    label: 'Si sente pieno/a di energia?',
    pointForYes: false,
  },
  {
    id: 'q14',
    label: 'Sente che la sua situazione sia senza speranza?',
    pointForYes: true,
  },
  {
    id: 'q15',
    label: 'Pensa che la maggior parte delle persone stia meglio di lei?',
    pointForYes: true,
  },
];
export const GDS15_INSTRUCTION =
  'Chiedere al paziente di rispondere a ciascuna domanda barrando la casella corrispondente (SÌ oppure NO) in base a come si è sentito/a nell\'ultima settimana. Nel calcolo del punteggio finale, assegnare 1 punto per ogni risposta conforme alla colonna "Punto (1/0)".';
export const GDS15_SCREENING_NOTE =
  "La GDS è uno strumento di screening e non sostituisce la diagnosi clinica. In presenza di deficit cognitivo moderato-severo (es. MMSE < 15), si consiglia l'uso di scale etero-somministrate (es. Cornell Scale for Depression in Dementia).";
export const GDS15_PROVENANCE =
  'GDS-15, Scala di Depressione Geriatrica di Yesavage — Versione Breve a 15 Item, allegato del 22/09/2026. Trascrizione della fonte fornita; nessuna convalida clinica indipendente.';
export const GDS15_REFERENCE =
  'Sheikh, J. I., & Yesavage, J. A. (1986). Geriatric Depression Scale (GDS): recent evidence and development of a shorter version. Clinical Gerontologist.';
export const GDS15_EDITOR_INSTRUCTION =
  'Chiedere al paziente di rispondere a ogni domanda in base a come si è sentito/a nell’ultima settimana. Selezionare Sì oppure No per ciascuna domanda; il punteggio viene calcolato automaticamente.';
export const GDS15 = {
  type: 'gds15' as const,
  title: 'GDS-15 · Screening della depressione',
  description:
    'Quindici domande riferite all’ultima settimana. Il risultato è uno screening e non una diagnosi clinica.',
  version: GDS15_VERSION,
  sourceSha256: GDS15_SOURCE_SHA256,
  items: GDS15_ITEMS,
};
export const emptyGds15Answers = (): Gds15Answers =>
  ({ ...Object.fromEntries(GDS15_KEYS.map((key) => [key, null])), notes: '' }) as Gds15Answers;
export function validGds15Notes(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    [...value].length <= 4000 &&
    [...value].every((character) => {
      const point = character.codePointAt(0)!;
      return (
        (point >= 32 || point === 9 || point === 10 || point === 13) &&
        point !== 127 &&
        !(point >= 0xd800 && point <= 0xdfff)
      );
    })
  );
}
export function parseGds15Answers(value: unknown): Gds15Answers {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Risposte GDS-15 non valide.');
  const row = value as Record<string, unknown>;
  if (
    Object.keys(row).some((key) => ![...GDS15_KEYS, 'notes'].includes(key)) ||
    GDS15_KEYS.some(
      (key) => !Object.hasOwn(row, key) || (row[key] !== null && typeof row[key] !== 'boolean'),
    )
  ) {
    throw new Error('Inserisci Sì, No oppure nessuna risposta per ciascuna domanda.');
  }
  const notes = Object.hasOwn(row, 'notes') ? row.notes : '';
  if (!validGds15Notes(notes))
    throw new Error('Le note devono contenere al massimo 4000 caratteri validi.');
  return { ...Object.fromEntries(GDS15_KEYS.map((key) => [key, row[key]])), notes } as Gds15Answers;
}
export function assertGds15Answers(value: unknown): asserts value is Gds15Answers {
  parseGds15Answers(value);
}
export const answeredGds15 = (answers: Gds15Answers) =>
  GDS15_KEYS.filter((key) => typeof answers[key] === 'boolean').length;
export function gds15Completion(answers: Gds15Answers) {
  const missingPaths = GDS15_KEYS.filter((key) => typeof answers[key] !== 'boolean');
  return { complete: missingPaths.length === 0, missingPaths };
}
export function gds15ResultForTotal(total: number): Gds15Result {
  if (!Number.isInteger(total) || total < 0 || total > 15)
    throw new Error('Punteggio GDS-15 non valido.');
  return {
    total,
    maximum: 15,
    ...(total <= 5
      ? { band: 'none' as const, label: 'Assente / Nella norma' }
      : total <= 9
        ? { band: 'mild_moderate' as const, label: 'Depressione lieve–moderata' }
        : { band: 'severe' as const, label: 'Depressione grave' }),
  };
}
export function gds15Result(answers: Gds15Answers): Gds15Result | null {
  if (!gds15Completion(answers).complete) return null;
  return gds15ResultForTotal(
    GDS15_ITEMS.reduce((sum, item) => sum + Number(answers[item.id] === item.pointForYes), 0),
  );
}
export function validGds15Result(value: unknown): value is Gds15Result {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Gds15Result;
  if (
    Object.keys(row).length !== 4 ||
    !Number.isInteger(row.total) ||
    row.total < 0 ||
    row.total > 15
  )
    return false;
  const expected = gds15ResultForTotal(row.total);
  return row.maximum === 15 && row.band === expected.band && row.label === expected.label;
}
export function gds15SnapshotItems(answers: Gds15Answers) {
  return GDS15_ITEMS.map((item) => {
    const answer = typeof answers[item.id] === 'boolean' ? answers[item.id] : null;
    return {
      id: item.id,
      label: item.label,
      answer,
      score: answer === null ? null : (Number(answer === item.pointForYes) as 0 | 1),
      description: answer === null ? 'Non risposto' : answer ? 'Sì' : 'No',
    };
  });
}
