import {
  OWNED_AID_KEYS,
  PLAIN_AID_KEYS,
  TRANSFERS_VERSION,
  TRANSFERS_SOURCE_SHA256,
  type TransfersAnswers,
  type AidKey,
  type AssessmentCompletion,
  type TransferSection,
} from './transfersTypes';
export const TRANSFERS = {
  type: 'postural_transfers',
  version: TRANSFERS_VERSION,
  sourceSha256: TRANSFERS_SOURCE_SHA256,
  title: 'Trasferimenti posturali',
  description: 'Indicazioni per trasferimenti posturali, deambulazione e assistenza.',
} as const;
export const TRANSFER_OPTIONS = [
  ['independent', 'Autonomo'],
  ['one_operator', '1 operatore'],
  ['two_operators', '2 operatori'],
  ['one_operator_desk', '1 operatore + desk (deambulatore con tavolo)'],
  ['one_operator_axillary', '1 operatore + deambulatore ascellare'],
  ['one_operator_rollator', '1 operatore + rollator'],
  ['hoist_one_operator', 'Sollevatore + 1 operatore'],
  ['hoist_two_operators', 'Sollevatore + 2 operatori'],
] as const;
export const AID_LABELS: Record<AidKey, string> = {
  wheelchair: 'Carrozzina',
  pressureReliefCushion: 'Cuscino antidecubito',
  wheelchairRestraint: 'Contenzione in carrozzina',
  oneForearmCrutch: '1 antibrachiale',
  walkingStick: 'Bastone',
  quadCane: 'Tetrapode',
  twoForearmCrutches: '2 antibrachiali',
  rollator: 'Deambulatore rollator',
  axillaryWalker: 'Deambulatore ascellare',
  tableWalker: 'Deambulatore con tavolo (desk)',
  spinalBrace: 'Busto',
  kneeBrace: 'Ginocchiera',
};
export const AID_KEYS = Object.keys(AID_LABELS) as AidKey[];
export const WALKING_OPTIONS = [
  ['independent', 'Autonoma'],
  ['assisted', 'Con assistenza'],
  ['not_possible', 'Non possibile'],
] as const;
export const LOAD_OPTIONS = [
  ['not_allowed', 'Non concesso'],
  ['touch_down', 'Sfiorato'],
  ['full', 'Totale'],
] as const;
export const COGNITION_OPTIONS = [
  ['none', 'No'],
  ['mild', 'Lieve'],
  ['severe', 'Grave'],
] as const;
export const HYGIENE_OPTIONS = [
  ['bed_bath', 'Bagno a letto'],
  ['shower', 'Doccia'],
] as const;
export function emptyTransfersAnswers(): TransfersAnswers {
  return {
    context: {
      admissionDate: { status: null, value: null },
      diagnosis: { status: null, text: '', unavailableReason: '' },
    },
    operatedLegLoad: { applicable: null, side: null, level: null },
    walking: null,
    transfers: { bedToWheelchair: null, wheelchairToBed: null, toilet: null },
    hygiene: null,
    painOnMovement: null,
    cognitiveDeterioration: null,
    aids: Object.fromEntries(
      AID_KEYS.map((key) => [
        key,
        (OWNED_AID_KEYS as readonly string[]).includes(key)
          ? { selected: null, ownership: null }
          : { selected: null },
      ]),
    ) as TransfersAnswers['aids'],
    notes: '',
  };
}
const object = (value: unknown, keys: readonly string[]) => {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    throw new Error('Campi della scheda non validi.');
};
const oneOf = (value: unknown, options: readonly unknown[]) => {
  if (!options.includes(value)) throw new Error('Scelta della scheda non valida.');
};
const text = (value: unknown, max: number) => {
  if (typeof value !== 'string' || [...value].length > max)
    throw new Error('Testo della scheda oltre il limite.');
};
export function validTransfersAdmissionDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function assertTransfersAnswers(value: unknown): asserts value is TransfersAnswers {
  object(value, [
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
  const a = value as TransfersAnswers;
  object(a.context, ['admissionDate', 'diagnosis']);
  object(a.context.admissionDate, ['status', 'value']);
  const admission = a.context.admissionDate;
  oneOf(admission.status, [null, 'known', 'unavailable']);
  if (admission.value !== null && !validTransfersAdmissionDate(admission.value))
    throw new Error('Data ingresso non valida.');
  if (admission.status !== 'known' && admission.value !== null)
    throw new Error('Verifica la data di ingresso.');
  object(a.context.diagnosis, ['status', 'text', 'unavailableReason']);
  const diagnosis = a.context.diagnosis;
  oneOf(diagnosis.status, [null, 'provided', 'unavailable']);
  text(diagnosis.text, 1000);
  text(diagnosis.unavailableReason, 1000);
  if (
    (diagnosis.status !== 'provided' && diagnosis.text !== '') ||
    (diagnosis.status !== 'unavailable' && diagnosis.unavailableReason !== '')
  )
    throw new Error('Verifica il contesto della diagnosi.');
  object(a.operatedLegLoad, ['applicable', 'side', 'level']);
  oneOf(a.operatedLegLoad.applicable, [null, false, true]);
  oneOf(a.operatedLegLoad.side, [null, 'right', 'left']);
  oneOf(a.operatedLegLoad.level, [null, ...LOAD_OPTIONS.map(([key]) => key)]);
  if (
    a.operatedLegLoad.applicable !== true &&
    (a.operatedLegLoad.side !== null || a.operatedLegLoad.level !== null)
  )
    throw new Error('Carico non applicabile: lato e livello devono essere vuoti.');
  oneOf(a.walking, [null, ...WALKING_OPTIONS.map(([key]) => key)]);
  object(a.transfers, ['bedToWheelchair', 'wheelchairToBed', 'toilet']);
  for (const key of ['bedToWheelchair', 'wheelchairToBed', 'toilet'] as const)
    oneOf(a.transfers[key], [
      null,
      ...TRANSFER_OPTIONS.slice(0, key === 'toilet' ? 6 : 8).map(([value]) => value),
    ]);
  oneOf(a.hygiene, [null, ...HYGIENE_OPTIONS.map(([key]) => key)]);
  oneOf(a.painOnMovement, [null, false, true]);
  oneOf(a.cognitiveDeterioration, [null, ...COGNITION_OPTIONS.map(([key]) => key)]);
  object(a.aids, AID_KEYS);
  for (const key of OWNED_AID_KEYS) {
    const aid = a.aids[key];
    object(aid, ['selected', 'ownership']);
    oneOf(aid.selected, [null, false, true]);
    oneOf(aid.ownership, [null, 'personal', 'facility']);
    if (aid.selected !== true && aid.ownership !== null)
      throw new Error('Proprietà prevista solo per un ausilio presente.');
  }
  for (const key of PLAIN_AID_KEYS) {
    object(a.aids[key], ['selected']);
    oneOf(a.aids[key].selected, [null, false, true]);
  }
  text(a.notes, 4000);
}
export function transfersCompletion(a: TransfersAnswers): AssessmentCompletion {
  const missingPaths: string[] = [];
  const need = (path: string, missing: boolean) => {
    if (missing) missingPaths.push(path);
  };
  need('context.admissionDate.status', a.context.admissionDate.status === null);
  need(
    'context.admissionDate.value',
    a.context.admissionDate.status === 'known' &&
      !validTransfersAdmissionDate(a.context.admissionDate.value),
  );
  need('context.diagnosis.status', a.context.diagnosis.status === null);
  need(
    'context.diagnosis.text',
    a.context.diagnosis.status === 'provided' && !a.context.diagnosis.text.trim(),
  );
  need(
    'context.diagnosis.unavailableReason',
    a.context.diagnosis.status === 'unavailable' && !a.context.diagnosis.unavailableReason.trim(),
  );
  need('operatedLegLoad.applicable', a.operatedLegLoad.applicable === null);
  if (a.operatedLegLoad.applicable) {
    need('operatedLegLoad.side', a.operatedLegLoad.side === null);
    need('operatedLegLoad.level', a.operatedLegLoad.level === null);
  }
  for (const key of ['walking', 'hygiene', 'painOnMovement', 'cognitiveDeterioration'] as const)
    need(key, a[key] === null);
  for (const key of ['bedToWheelchair', 'wheelchairToBed', 'toilet'] as const)
    need(`transfers.${key}`, a.transfers[key] === null);
  for (const key of AID_KEYS) {
    const aid = a.aids[key];
    need(`aids.${key}.selected`, aid.selected === null);
    if ('ownership' in aid)
      need(`aids.${key}.ownership`, aid.selected === true && aid.ownership === null);
  }
  return { complete: !missingPaths.length, missingPaths };
}
export const transferValueLabel = (
  value: string | boolean | null,
  options?: readonly (readonly [string, string])[],
) =>
  value === null
    ? 'Non verificato'
    : typeof value === 'boolean'
      ? value
        ? 'Sì'
        : 'No'
      : (options?.find(([key]) => key === value)?.[1] ?? value);
export function transfersSections(a: TransfersAnswers): TransferSection[] {
  const row = (path: string, label: string, value: string) => ({ path, label, value });
  const d = a.context.diagnosis;
  const admission = a.context.admissionDate;
  return [
    {
      id: 'context',
      label: 'Contesto',
      rows: [
        row(
          'context.admissionDate',
          'Data di ingresso',
          admission.status === 'unavailable'
            ? 'Non disponibile'
            : (admission.value ?? 'Non verificata'),
        ),
        row(
          'context.diagnosis',
          'Diagnosi',
          d.status === 'unavailable'
            ? `Non disponibile: ${d.unavailableReason}`
            : d.text || 'Non verificata',
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
          a.operatedLegLoad.applicable === false
            ? 'Non applicabile'
            : a.operatedLegLoad.applicable === null
              ? 'Non verificato'
              : `${transferValueLabel(a.operatedLegLoad.side, [
                  ['right', 'DX'],
                  ['left', 'SX'],
                ])} · ${transferValueLabel(a.operatedLegLoad.level, LOAD_OPTIONS)}`,
        ),
        row('walking', 'Deambulazione', transferValueLabel(a.walking, WALKING_OPTIONS)),
        ...(
          [
            ['bedToWheelchair', 'Letto → carrozzina'],
            ['wheelchairToBed', 'Carrozzina → letto'],
            ['toilet', 'In bagno sul WC'],
          ] as const
        ).map(([key, label]) =>
          row(`transfers.${key}`, label, transferValueLabel(a.transfers[key], TRANSFER_OPTIONS)),
        ),
      ],
    },
    {
      id: 'assistance',
      label: 'Assistenza',
      rows: [
        row('hygiene', 'Igiene personale', transferValueLabel(a.hygiene, HYGIENE_OPTIONS)),
        row('painOnMovement', 'Dolore alla movimentazione', transferValueLabel(a.painOnMovement)),
        row(
          'cognitiveDeterioration',
          'Deterioramento cognitivo',
          transferValueLabel(a.cognitiveDeterioration, COGNITION_OPTIONS),
        ),
      ],
    },
    {
      id: 'aids',
      label: 'Ausili',
      rows: AID_KEYS.map((key) => {
        const aid = a.aids[key];
        return row(
          `aids.${key}`,
          AID_LABELS[key],
          `${transferValueLabel(aid.selected)}${
            'ownership' in aid && aid.selected
              ? ` · ${transferValueLabel(aid.ownership, [
                  ['personal', 'Personale'],
                  ['facility', 'Struttura'],
                ])}`
              : ''
          }`,
        );
      }),
    },
    { id: 'notes', label: 'Note', rows: [row('notes', 'Note', a.notes || 'Nessuna nota')] },
  ];
}
/** Versioned snapshot labels mirror the source-bound server renderer; editor labels may be expanded. */
export function transfersSnapshotSections(a: TransfersAnswers): TransferSection[] {
  const sections = transfersSections(a);
  const rows = new Map(sections.flatMap((section) => section.rows).map((row) => [row.path, row]));
  if (a.context.admissionDate.status === 'known' && a.context.admissionDate.value)
    rows.get('context.admissionDate')!.value = a.context.admissionDate.value
      .split('-')
      .reverse()
      .join('/');
  if (a.operatedLegLoad.applicable)
    rows.get('operatedLegLoad')!.value =
      `${a.operatedLegLoad.side === 'right' ? 'DX' : 'SX'} — ${transferValueLabel(a.operatedLegLoad.level, LOAD_OPTIONS)}`;
  const labels = [
    'Autonomo',
    '1 operatore',
    '2 operatori',
    '1 op. + desk (deambulatore con tavolo)',
    '1 op. + ascellare',
    '1 op. + rollator',
    'sollevatore + 1 op.',
    'sollevatore + 2 op.',
  ];
  for (const key of ['bedToWheelchair', 'wheelchairToBed', 'toilet'] as const) {
    const row = rows.get(`transfers.${key}`)!;
    row.label =
      key === 'bedToWheelchair'
        ? 'Letto-carrozzina'
        : key === 'wheelchairToBed'
          ? 'Carrozzina-letto'
          : 'In bagno sul WC';
    row.value =
      labels[TRANSFER_OPTIONS.findIndex(([value]) => value === a.transfers[key])] ??
      'Non verificato';
  }
  for (const key of AID_KEYS) {
    const aid = a.aids[key];
    if (aid.selected && 'ownership' in aid)
      rows.get(`aids.${key}`)!.value =
        `Sì — ${aid.ownership === 'personal' ? 'Personale' : 'Struttura'}`;
  }
  return sections;
}
