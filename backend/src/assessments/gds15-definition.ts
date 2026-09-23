import type { Gds15ItemId } from './gds15-types.js';

export const GDS15_INSTRUCTION =
  'Chiedere al paziente di rispondere a ciascuna domanda barrando la casella corrispondente (SÌ oppure NO) in base a come si è sentito/a nell\'ultima settimana. Nel calcolo del punteggio finale, assegnare 1 punto per ogni risposta conforme alla colonna "Punto (1/0)".';
export const GDS15_SCREENING_NOTE =
  "La GDS è uno strumento di screening e non sostituisce la diagnosi clinica. In presenza di deficit cognitivo moderato-severo (es. MMSE < 15), si consiglia l'uso di scale etero-somministrate (es. Cornell Scale for Depression in Dementia).";
export const GDS15_PROVENANCE =
  'GDS-15, Scala di Depressione Geriatrica di Yesavage — Versione Breve a 15 Item, allegato del 22/09/2026. Trascrizione della fonte fornita; nessuna convalida clinica indipendente.';
export const GDS15_REFERENCE =
  'Sheikh, J. I., & Yesavage, J. A. (1986). Geriatric Depression Scale (GDS): recent evidence and development of a shorter version. Clinical Gerontologist.';
export const GDS15_ITEMS = [
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
] as const satisfies readonly { id: Gds15ItemId; label: string; pointForYes: boolean }[];
