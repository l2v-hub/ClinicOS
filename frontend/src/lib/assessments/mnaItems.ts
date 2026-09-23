import type { MnaItemId } from './mnaTypes';

export interface MnaOption {
  value: string | boolean;
  score: number;
  description: string;
}
export interface MnaDefinitionItem {
  id: MnaItemId;
  label: string;
  options: MnaOption[];
}
const option = (value: string | boolean, score: number, description: string): MnaOption => ({
  value,
  score,
  description,
});
export const MNA_ITEMS: MnaDefinitionItem[] = [
  {
    id: 'A',
    label:
      'Presenta una perdita dell’appetito? Ha mangiato meno negli ultimi 3 mesi? (perdita d’appetito, problemi digestivi, difficoltà di masticazione o deglutizione)',
    options: [
      option('severe_reduction', 0, 'Grave riduzione dell’assunzione di cibo'),
      option('moderate_reduction', 1, 'Moderata riduzione dell’assunzione di cibo'),
      option('no_reduction', 2, 'Nessuna riduzione dell’assunzione di cibo'),
    ],
  },
  {
    id: 'B',
    label: 'Perdita di peso recente (< 3 mesi)',
    options: [
      option('loss_over_3kg', 0, 'Perdita di peso > 3 kg'),
      option('unknown', 1, 'Non sa'),
      option('loss_1_to_3kg', 2, 'Perdita di peso tra 1 e 3 kg'),
      option('no_loss', 3, 'Nessuna perdita di peso'),
    ],
  },
  {
    id: 'C',
    label: 'Motricità',
    options: [
      option('bed_or_chair', 0, 'Dal letto alla poltrona'),
      option('independent_at_home', 1, 'Autonomo a domicilio'),
      option('goes_out', 2, 'Esce di casa'),
    ],
  },
  {
    id: 'D',
    label: 'Nell’arco degli ultimi 3 mesi: malattie acute o stress psicologici?',
    options: [option(true, 0, 'Sì'), option(false, 2, 'No')],
  },
  {
    id: 'E',
    label: 'Problemi neuropsicologici',
    options: [
      option('severe_dementia_or_depression', 0, 'Demenza o depressione grave'),
      option('moderate_dementia', 1, 'Demenza moderata'),
      option('no_psychological_problems', 2, 'Nessun problema psicologico'),
    ],
  },
  {
    id: 'F',
    label: 'Indice di massa corporea (IMC = peso / (altezza)² in kg/m²)',
    options: [
      option('lt19', 0, 'IMC < 19'),
      option('gte19_lt21', 1, '19 ≤ IMC < 21'),
      option('gte21_lt23', 2, '21 ≤ IMC < 23'),
      option('gte23', 3, 'IMC ≥ 23'),
    ],
  },
  {
    id: 'G',
    label: 'Il paziente vive autonomamente a domicilio?',
    options: [option(true, 1, 'Sì'), option(false, 0, 'No')],
  },
  {
    id: 'H',
    label: 'Prende più di 3 medicinali al giorno?',
    options: [option(true, 0, 'Sì'), option(false, 1, 'No')],
  },
  {
    id: 'I',
    label: 'Presenza di decubiti, ulcere cutanee?',
    options: [option(true, 0, 'Sì'), option(false, 1, 'No')],
  },
  {
    id: 'J',
    label: 'Quanti pasti completi prende al giorno?',
    options: [
      option('one_meal', 0, '1 pasto'),
      option('two_meals', 1, '2 pasti'),
      option('three_meals', 2, '3 pasti'),
    ],
  },
  { id: 'K', label: 'Consuma?', options: [] },
  {
    id: 'L',
    label: 'Consuma almeno due volte al giorno frutta o verdura?',
    options: [option(false, 0, 'No'), option(true, 1, 'Sì')],
  },
  {
    id: 'M',
    label: 'Quanti bicchieri beve al giorno? (acqua, succhi, caffé, té, latte…)',
    options: [
      option('lt3_glasses', 0, 'Meno di 3 bicchieri'),
      option('3_to_5_glasses', 0.5, 'Da 3 a 5 bicchieri'),
      option('gt5_glasses', 1, 'Più di 5 bicchieri'),
    ],
  },
  {
    id: 'N',
    label: 'Come si nutre?',
    options: [
      option('needs_assistance', 0, 'Necessita di assistenza'),
      option('independent_with_difficulty', 1, 'Autonomamente con difficoltà'),
      option('independent_without_difficulty', 2, 'Autonomamente senza difficoltà'),
    ],
  },
  {
    id: 'O',
    label: 'Il paziente si considera ben nutrito? (ha dei problemi nutrizionali)',
    options: [
      option('severe_malnutrition', 0, 'Malnutrizione grave'),
      option('moderate_or_unknown', 1, 'Malnutrizione moderata o non sa'),
      option('no_nutritional_problems', 2, 'Nessun problema nutrizionale'),
    ],
  },
  {
    id: 'P',
    label:
      'Il paziente considera il suo stato di salute migliore o peggiore di altre persone della sua età?',
    options: [
      option('worse', 0, 'Meno buono'),
      option('unknown', 0.5, 'Non sa'),
      option('same', 1, 'Uguale'),
      option('better', 2, 'Migliore'),
    ],
  },
  {
    id: 'Q',
    label: 'Circonferenza brachiale (CB, cm)',
    options: [
      option('lt21', 0, 'CB < 21 cm'),
      option('21_to_22', 0.5, '21 ≤ CB ≤ 22 cm'),
      option('gt22', 1, 'CB > 22 cm'),
    ],
  },
  {
    id: 'R',
    label: 'Circonferenza del polpaccio (CP in cm)',
    options: [option('lt31', 0, 'CP < 31 cm'), option('gte31', 1, 'CP ≥ 31 cm')],
  },
];
export const MNA_K_LABELS = {
  dairyDaily: 'Almeno una volta al giorno dei prodotti lattiero-caseari?',
  eggsOrLegumesWeekly: 'Una o due volte la settimana uova o legumi?',
  meatFishOrPoultryDaily: 'Ogni giorno della carne, del pesce o del pollame?',
} as const;
export const MNA_MEASUREMENT_LABELS = {
  weightKg: 'Peso',
  heightCm: 'Altezza',
  armCircumferenceCm: 'Circonferenza brachiale',
  calfCircumferenceCm: 'Circonferenza del polpaccio',
} as const;
export const MNA_PROVENANCE =
  'MNA® in italiano dalla fonte fornita. Correzioni editoriali: «acuteo» → «acute o» e «Oni giorne» → «Ogni giorno». Q: corretto il refuso della fonte italiana; CB < 21 cm = 0, 21 ≤ CB ≤ 22 cm = 0,5, CB > 22 cm = 1, secondo il riscontro ufficiale inglese 2023. Conservati E «demenza moderata» e K «una o due volte la settimana». Questa trascrizione non costituisce convalida clinica indipendente.';
export const MNA_REFERENCES = [
  'Vellas B, Villars H, Abellan G, et al. Overview of MNA® - Its History and Challenges. J Nut Health Aging 2006; 10: 456-465.',
  'Rubenstein LZ, Harker JO, Salva A, Guigoz Y, Vellas B. Screening for Undernutrition in Geriatric Practice: Developing the Short-Form Mini Nutritional Assessment (MNA-SF). J. Geront 2001; 56A: M366-377.',
  'Guigoz Y. The Mini-Nutritional Assessment (MNA®) Review of the Literature – What does it tell us? J Nutr Health Aging 2006; 10: 466-487.',
];
export const MNA_COPYRIGHT =
  '® Société des Produits Nestlé, S.A., Vevey, Switzerland, Trademark Owners; © Nestlé, 1994, Revision 2006. N67200 12/99 10M; www.mna-elderly.com.';
