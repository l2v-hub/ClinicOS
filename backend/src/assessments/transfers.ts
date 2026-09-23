import { AssessmentError } from './types.js';
import {
  AID_KEYS,
  OWNED_AID_KEYS,
  TRANSFER_MODES,
  type TransfersAnswers,
  type AssessmentCompletion,
  type TransferSnapshotSection,
} from './transfers-types.js';
const invalid = () => new AssessmentError('Risposte trasferimenti non valide');
function object(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    throw invalid();
  return value as Record<string, unknown>;
}
function choice<T extends string | boolean>(value: unknown, choices: readonly T[]): T | null {
  if (value === null) return null;
  if (!choices.includes(value as T)) throw invalid();
  return value as T;
}
function text(value: unknown, max: number): string {
  if (
    typeof value !== 'string' ||
    [...value].length > max ||
    [...value].some((character) => {
      const point = character.codePointAt(0)!;
      return point >= 0xd800 && point <= 0xdfff;
    }) ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)
  )
    throw invalid();
  return value;
}
function admissionCivilDate(value: unknown): string {
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) throw invalid();
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value)
    throw invalid();
  return value;
}
export function parseTransfersAnswers(value: unknown): TransfersAnswers {
  const a = object(value, [
    'context',
    'operatedLegLoad',
    'walking',
    'transfers',
    'hygiene',
    'painOnMovement',
    'cognitiveDeterioration',
    'aids',
    'notes',
  ]);
  const context = object(a.context, ['admissionDate', 'diagnosis']);
  const date = object(context.admissionDate, ['status', 'value']);
  const admissionStatus = choice(date.status, ['known', 'unavailable'] as const);
  let admissionDate: string | null = null;
  if (date.value !== null) admissionDate = admissionCivilDate(date.value);
  if (admissionStatus !== 'known' && admissionDate !== null) throw invalid();
  const diagnosis = object(context.diagnosis, ['status', 'text', 'unavailableReason']);
  const diagnosisStatus = choice(diagnosis.status, ['provided', 'unavailable'] as const);
  const diagnosisText = text(diagnosis.text, 1000),
    unavailableReason = text(diagnosis.unavailableReason, 1000);
  if (
    (diagnosisStatus !== 'provided' && diagnosisText !== '') ||
    (diagnosisStatus !== 'unavailable' && unavailableReason !== '')
  )
    throw invalid();
  const load = object(a.operatedLegLoad, ['applicable', 'side', 'level']);
  const applicable = choice(load.applicable, [true, false]);
  const side = choice(load.side, ['right', 'left'] as const),
    level = choice(load.level, ['not_allowed', 'touch_down', 'full'] as const);
  if (applicable !== true && (side !== null || level !== null)) throw invalid();
  const transfers = object(a.transfers, ['bedToWheelchair', 'wheelchairToBed', 'toilet']);
  const aids = object(a.aids, AID_KEYS);
  const parsedAids = Object.fromEntries(
    AID_KEYS.map((key) => {
      const owned = (OWNED_AID_KEYS as readonly string[]).includes(key);
      const aid = object(aids[key], owned ? ['selected', 'ownership'] : ['selected']);
      const selected = choice(aid.selected, [true, false]);
      if (!owned) return [key, { selected }];
      const ownership = choice(aid.ownership, ['personal', 'facility'] as const);
      if (selected !== true && ownership !== null) throw invalid();
      return [key, { selected, ownership }];
    }),
  ) as TransfersAnswers['aids'];
  return {
    context: {
      admissionDate: { status: admissionStatus, value: admissionDate },
      diagnosis: { status: diagnosisStatus, text: diagnosisText, unavailableReason },
    },
    operatedLegLoad: { applicable, side, level },
    walking: choice(a.walking, ['independent', 'assisted', 'not_possible'] as const),
    transfers: {
      bedToWheelchair: choice(transfers.bedToWheelchair, TRANSFER_MODES),
      wheelchairToBed: choice(transfers.wheelchairToBed, TRANSFER_MODES),
      toilet: choice(
        transfers.toilet,
        TRANSFER_MODES.slice(0, 6),
      ) as TransfersAnswers['transfers']['toilet'],
    },
    hygiene: choice(a.hygiene, ['bed_bath', 'shower'] as const),
    painOnMovement: choice(a.painOnMovement, [true, false]),
    cognitiveDeterioration: choice(a.cognitiveDeterioration, ['none', 'mild', 'severe'] as const),
    aids: parsedAids,
    notes: text(a.notes, 4000),
  };
}
export function transfersCompletion(a: TransfersAnswers): AssessmentCompletion {
  const missingPaths: string[] = [];
  const missing = (condition: boolean, path: string) => {
    if (condition) missingPaths.push(path);
  };
  const date = a.context.admissionDate,
    diagnosis = a.context.diagnosis;
  missing(date.status === null, 'context.admissionDate.status');
  missing(date.status === 'known' && date.value === null, 'context.admissionDate.value');
  missing(diagnosis.status === null, 'context.diagnosis.status');
  missing(diagnosis.status === 'provided' && !diagnosis.text.trim(), 'context.diagnosis.text');
  missing(
    diagnosis.status === 'unavailable' && !diagnosis.unavailableReason.trim(),
    'context.diagnosis.unavailableReason',
  );
  missing(a.operatedLegLoad.applicable === null, 'operatedLegLoad.applicable');
  if (a.operatedLegLoad.applicable)
    for (const key of ['side', 'level'] as const)
      missing(a.operatedLegLoad[key] === null, `operatedLegLoad.${key}`);
  missing(a.walking === null, 'walking');
  for (const key of ['bedToWheelchair', 'wheelchairToBed', 'toilet'] as const)
    missing(a.transfers[key] === null, `transfers.${key}`);
  for (const key of ['hygiene', 'painOnMovement', 'cognitiveDeterioration'] as const)
    missing(a[key] === null, key);
  for (const key of AID_KEYS) {
    const aid = a.aids[key];
    missing(aid.selected === null, `aids.${key}.selected`);
    if ('ownership' in aid && aid.selected)
      missing(aid.ownership === null, `aids.${key}.ownership`);
  }
  return { complete: missingPaths.length === 0, missingPaths };
}
const transferLabels = [
  'Autonomo',
  '1 operatore',
  '2 operatori',
  '1 op. + desk (deambulatore con tavolo)',
  '1 op. + ascellare',
  '1 op. + rollator',
  'sollevatore + 1 op.',
  'sollevatore + 2 op.',
];
const aidLabels = [
  'Carrozzina',
  'Cuscino antidecubito',
  'Contenzione in carrozzina',
  '1 antibrachiale',
  'Bastone',
  'Tetrapode',
  '2 antibrachiali',
  'Deambulatore rollator',
  'Deambulatore ascellare',
  'Deambulatore con tavolo (desk)',
  'Busto',
  'Ginocchiera',
];
export function transfersSections(a: TransfersAnswers): TransferSnapshotSection[] {
  if (!transfersCompletion(a).complete) throw invalid();
  const row = (path: string, label: string, value: string) => ({ path, label, value });
  const date = a.context.admissionDate,
    diagnosis = a.context.diagnosis,
    load = a.operatedLegLoad;
  const transfer = (v: typeof a.transfers.bedToWheelchair) =>
    transferLabels[TRANSFER_MODES.indexOf(v!)];
  return [
    {
      id: 'context',
      label: 'Contesto',
      rows: [
        row(
          'context.admissionDate',
          'Data di ingresso',
          date.status === 'known' ? date.value!.split('-').reverse().join('/') : 'Non disponibile',
        ),
        row(
          'context.diagnosis',
          'Diagnosi',
          diagnosis.status === 'provided'
            ? diagnosis.text
            : `Non disponibile: ${diagnosis.unavailableReason}`,
        ),
      ],
    },
    {
      id: 'mobilization',
      label: 'Mobilizzazione',
      rows: [
        row(
          'operatedLegLoad',
          'Carico su arto inferiore operato',
          load.applicable
            ? `${load.side === 'right' ? 'DX' : 'SX'} — ${{ not_allowed: 'Non concesso', touch_down: 'Sfiorato', full: 'Totale' }[load.level!]}`
            : 'Non applicabile',
        ),
        row(
          'walking',
          'Deambulazione',
          { independent: 'Autonoma', assisted: 'Con assistenza', not_possible: 'Non possibile' }[
            a.walking!
          ],
        ),
        row('transfers.bedToWheelchair', 'Letto-carrozzina', transfer(a.transfers.bedToWheelchair)),
        row('transfers.wheelchairToBed', 'Carrozzina-letto', transfer(a.transfers.wheelchairToBed)),
        row('transfers.toilet', 'In bagno sul WC', transfer(a.transfers.toilet)),
      ],
    },
    {
      id: 'assistance',
      label: 'Assistenza',
      rows: [
        row('hygiene', 'Igiene personale', a.hygiene === 'bed_bath' ? 'Bagno a letto' : 'Doccia'),
        row('painOnMovement', 'Dolore alla movimentazione', a.painOnMovement ? 'Sì' : 'No'),
        row(
          'cognitiveDeterioration',
          'Deterioramento cognitivo',
          { none: 'No', mild: 'Lieve', severe: 'Grave' }[a.cognitiveDeterioration!],
        ),
      ],
    },
    {
      id: 'aids',
      label: 'Ausili',
      rows: AID_KEYS.map((key, index) => {
        const aid = a.aids[key];
        return row(
          `aids.${key}`,
          aidLabels[index],
          !aid.selected
            ? 'No'
            : 'ownership' in aid
              ? `Sì — ${aid.ownership === 'personal' ? 'Personale' : 'Struttura'}`
              : 'Sì',
        );
      }),
    },
    { id: 'notes', label: 'Note', rows: [row('notes', 'Note', a.notes || 'Nessuna nota')] },
  ];
}
