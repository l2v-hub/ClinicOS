import type { DischargeNarrativeDraft } from '../../sections/narrative.js';
import { parseDischargeTherapy } from '../../../intake/parse-discharge-therapy.js';
import { hash, object, type Json } from './model.js';
import { importSource } from './review.js';
import type { Conflict, Decision, GroupResult } from './results.js';

const normalized = (v: unknown) =>
  String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
const values = (v: unknown): Json[] => (Array.isArray(v) ? v.map(object) : []);
const nameOf = (value: unknown) =>
  normalized(parseDischargeTherapy(String(value ?? ''))[0]?.farmacoNome);

function selection(result: Json, conflict: Conflict) {
  const decisions = object(result._review).decisions as Decision[];
  const decision = decisions?.find((d) => d.conflictId === conflict.id);
  return decision?.action === 'select'
    ? conflict.candidates.find((c) => c.id === decision.candidateId)
    : undefined;
}

/** Resolve only explicit merge decisions; the immutable narrative still contains every source. */
function selectedValue(result: Json, field: string, item?: Json): unknown {
  const [section, key] = field.split('.');
  const value = item ?? object(object(result[section])[key]);
  if (value.status !== 'conflict') return value.value;
  const conflict = (result._conflicts as Conflict[]).find(
    (c) => c.field === field && c.itemKey === value.key,
  );
  return conflict ? selection(result, conflict)?.value : undefined;
}

export function pageDraftNarrative(result: Json): DischargeNarrativeDraft {
  const narrative = structuredClone(result._narrative) as DischargeNarrativeDraft;
  const fields = {
    firstName: 'nome',
    lastName: 'cognome',
    dateOfBirth: 'dataNascita',
    sex: 'sesso',
    phone: 'telefono',
    email: 'email',
    address: 'indirizzo',
  };
  for (const [to, from] of Object.entries(fields))
    (narrative as unknown as Json)[to] = String(selectedValue(result, `anagrafica.${from}`) ?? '');
  narrative.fiscalCode = String(selectedValue(result, 'cartella.codiceFiscale') ?? '');
  for (const [key, textField, valueKey] of [
    ['diagnosi', 'diagnosisText', 'descrizione'],
    ['allergie', 'allergiesText', 'allergene'],
  ] as const) {
    const list = object(object(result.cartella)[key]);
    if (values(list.items).length) {
      narrative[textField] = values(list.items)
        .map((item) => object(selectedValue(result, `cartella.${key}`, item))[valueKey])
        .filter(Boolean)
        .join('\n');
      if (key === 'allergie')
        narrative.allergyStatus = narrative.allergiesText ? 'present' : 'not_documented';
    }
  }
  return narrative;
}

/** Parse per letter, avoiding synthetic group headings and retaining exact original row text. */
export function pageTherapyRows(result: Json): Json[] {
  const groups = result._groups as GroupResult[];
  const conflicts = (result._conflicts as Conflict[]).filter((c) =>
    ['cartella.farmaci', 'cartella.terapie'].includes(c.field),
  );
  const seen = new Map<string, Json>();
  for (const group of groups) {
    const groupConflicts = conflicts.filter((c) =>
      c.candidates.some((candidate) => candidate.sources.some((s) => s.groupId === group.groupId)),
    );
    for (const row of parseDischargeTherapy(group._narrative.therapyText ?? '')) {
      const matches = groupConflicts.filter(
        (c) =>
          c.field === 'cartella.terapie' ||
          c.candidates.some(
            (candidate) => nameOf(object(candidate.value).nome) === normalized(row.farmacoNome),
          ),
      );
      // A structured conflict that cannot be tied to a parsed name cannot authorize a prescription.
      const relevant = matches.length ? matches : groupConflicts;
      const blocked = relevant.find(
        (c) => !selection(result, c)?.sources.some((s) => s.groupId === group.groupId),
      );
      const source = { groupId: group.groupId, inputHash: group.inputHash };
      const candidate: Json = {
        ...row,
        importSource: source,
        importSources: [source],
        sourceOutdated: false,
        ...(blocked
          ? {
              conflictDeferred: true,
              conflictId: blocked.id,
              excludedFromConfirm: true,
              stato: 'da_verificare',
            }
          : {}),
      };
      const signature = hash(row);
      const duplicate = seen.get(signature);
      if (duplicate && duplicate.conflictDeferred && !blocked)
        seen.set(signature, {
          ...candidate,
          importSources: [...(duplicate.importSources as unknown[]), source],
        });
      else if (duplicate) (duplicate.importSources as unknown[]).push(source);
      else seen.set(signature, candidate);
    }
  }
  return [...seen.values()];
}

export function attachPageDraftSource(seeded: Json, result: Json): Json {
  return {
    ...seeded,
    terapiaImport: pageTherapyRows(result),
    _narrative: result._narrative,
    _terapiaText: object(result._narrative).therapyText ?? '',
    _importSource: importSource(result),
    _importReview: result._review,
    _importProposals: [],
  };
}

export function refreshedPageData(existing: Json, result: Json): Json {
  const current = importSource(result);
  const previous = object(existing._importSource);
  const oldHashes = object(previous.groupHashes);
  const newHashes = current.groupHashes;
  const incoming = pageTherapyRows(result);
  const rows = values(existing.terapiaImport).map((row) => {
    const source = object(row.importSource);
    if (!source.groupId) return row;
    const sources = values(row.importSources).length ? values(row.importSources) : [source];
    const now = incoming.find((candidate) => candidate.originalText === row.originalText);
    const changed =
      sources.some((s) => oldHashes[String(s.groupId)] !== newHashes[String(s.groupId)]) ||
      Boolean(row.conflictDeferred) !== Boolean(now?.conflictDeferred);
    if (!changed) return row;
    return {
      ...row,
      sourceOutdated: true,
      stato: 'da_verificare',
      ...(now?.conflictDeferred
        ? { conflictDeferred: true, conflictId: now.conflictId, excludedFromConfirm: true }
        : { conflictDeferred: false }),
    };
  });
  const proposals: Json[] = [];
  for (const row of incoming) {
    const source = object(row.importSource);
    // The raw line is parsed deterministically. Group order must never manufacture
    // a second prescription merely because the primary provenance changed.
    if (rows.some((old) => old.originalText === row.originalText)) continue;
    const id = hash([source, row.originalText, row.conflictId ?? null]);
    const prior = values(existing._importProposals).find((p) => p.id === id);
    proposals.push(
      prior ?? {
        id,
        ...source,
        row,
        kind: oldHashes[String(source.groupId)] ? 'changed' : 'new',
        status: 'pending',
      },
    );
  }
  // Clinical/manual fields and reviewedTherapy remain exactly as saved by the operator.
  return {
    ...existing,
    terapiaImport: rows,
    _importSource: current,
    _importReview: result._review,
    _importProposals: proposals,
    _narrative: result._narrative,
    _sections: result._sections,
    _terapiaText: object(result._narrative).therapyText ?? '',
  };
}
