// Merge of AI import results into an intake draft the operator may already be filling in.
// Pure: no database access. The locked/idempotent persistence lives in draft-link.ts.
//
// Ownership rule for every covered field:
//   - blank and never written (no `_fieldOrigin`)            → the AI writes it, origin recorded;
//   - blank but with a recorded origin                        → the operator emptied it on purpose:
//                                                               operator's, only a proposal;
//   - still equal to the value the AI wrote (`_fieldOrigin`)  → AI-owned: replaced only by the
//                                                               final merge, never per letter;
//   - otherwise                                               → operator-owned: never written,
//                                                               a pending `_fieldProposals` entry.
// Final merge (the reviewed truth after conflict decisions):
//   - pending proposals whose value it does not carry are dropped (also when it has no value);
//   - an AI-owned value it does not carry is cleared and its origin removed.
// Allergy unit (`allergie` + `allergieStatus`): a merge never leaves 'assenti'/'paziente_nega'
// next to allergy rows; whichever side this merge would have written becomes a proposal instead.
// Page provenance: with `ctx.pages`, every written origin and every proposal also records
// `pages: [{groupId, pageId, documentId}]` where the value was found — only when all those pages
// are in the single letter that produced the value (then, in the final merge, `groupIds` is that
// letter). Otherwise, or with no certain match: no `pages` and the letter-level `groupIds`.
import { mergeExtractions } from '../../merge.js';
import { buildImportDraftData } from '../../../intake/draft-service.js';
import { attachPageDraftSource, pageDraftNarrative, refreshedPageData } from './draft-source.js';
import { ImportSessionError, canonical, hash, object, sourcePair, type Json } from './model.js';
import type { GroupResult } from './results.js';
import { locateFieldPages, type PageRef, type PageText } from './page-locate.js';

export { SERVER_DRAFT_KEYS } from './draft-mutations.js';

/** Fields the AI may fill. Key names are the ones the intake frontend writes. */
export const MERGE_FIELD_PATHS = [
  'anagrafica.firstName',
  'anagrafica.lastName',
  'anagrafica.dateOfBirth',
  'anagrafica.sex',
  'anagrafica.codiceFiscale',
  'anagrafica.phone',
  'anagrafica.email',
  'anagrafica.address',
  'anamnesi.patologicaProssima',
  'anamnesi.patologicaRemota',
  'diagnosi',
  'allergie',
  'allergieStatus',
] as const;

export type MergeMode = 'letter' | 'final';
export type MergeSource = { fields: Json; result?: Json };
export type MergeContext = {
  groupIds: string[];
  groupId?: string;
  inputHash?: string;
  resultHash?: string;
  /**
   * Current OCR text of the pages this merge draws on (the letter's pages, or every page for the
   * final merge), in manifest order. Absent or empty: no page provenance, today's behaviour.
   */
  pages?: PageText[];
};
export type MergeChanges = {
  anagrafica: boolean;
  anamnesi: boolean;
  diagnosi: boolean;
  allergie: boolean;
  therapy: boolean;
};
type Section = Exclude<keyof MergeChanges, 'therapy'>;

/** Mirror of the frontend intakeProgress `filled()`: the single notion of a blank field. */
export function filled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.values(value as Json).some((v) => filled(v));
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

// List rows carry generated ids/timestamps; equality is about clinical content only.
function comparable(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map((item) => {
      if (!item || typeof item !== 'object') return comparable(item);
      const { id: _id, createdAt: _createdAt, ...rest } = item as Json;
      return comparable(rest);
    });
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value as Json).map(([k, v]) => [k, comparable(v)]));
  return typeof value === 'string' ? value.trim() : value;
}
const same = (a: unknown, b: unknown) => canonical(comparable(a)) === canonical(comparable(b));

const sectionOf = (path: string): Section => {
  const head = path.split('.')[0];
  return head === 'allergieStatus' ? 'allergie' : (head as Section);
};
function read(data: Json, path: string): unknown {
  const [head, key] = path.split('.');
  return key === undefined ? data[head] : object(data[head])[key];
}
function write(data: Json, path: string, value: unknown) {
  const [head, key] = path.split('.');
  if (key === undefined) data[head] = structuredClone(value);
  else data[head] = { ...object(data[head]), [key]: structuredClone(value) };
  if (path === 'anagrafica.codiceFiscale')
    data.anagrafica = { ...object(data.anagrafica), codiceFiscaleOrigine: 'import' };
}
function clear(data: Json, path: string) {
  const [head, key] = path.split('.');
  if (key !== undefined) {
    data[head] = { ...object(data[head]), [key]: '' };
    if (path === 'anagrafica.codiceFiscale') delete (data.anagrafica as Json).codiceFiscaleOrigine;
  } else if (path === 'allergieStatus') delete data[head];
  else data[head] = [];
}
/** Intake statuses that assert there is no allergy to record. */
const negativeAllergyStatus = (status: unknown) =>
  status === 'assenti' || status === 'paziente_nega';
/** Page refs of a pending proposal plus new ones, deduplicated by page, first seen first. */
function unionPages(prior: unknown, next: PageRef[]): PageRef[] {
  const all = [...(Array.isArray(prior) ? (prior as PageRef[]) : []), ...next];
  return all.filter((p, i) => all.findIndex((q) => q?.pageId === p?.pageId) === i);
}
const proposalId = (path: string, value: unknown) =>
  hash(['field-proposal', path, comparable(value)]);

/** A single letter's stored unit result, shaped like an assembled page result (no conflicts). */
export function letterResult(group: GroupResult): Json {
  const merged = mergeExtractions([
    {
      docId: group.groupId,
      filename: group.label,
      model: group.model,
      data: object(group._full),
    },
  ]);
  return {
    ...merged,
    _narrative: group._narrative,
    _sections: group._sections ?? null,
    _groups: [group],
    _conflicts: [],
    _review: { decisions: [], unresolvedConflictIds: [] },
  };
}

/** Covered draft fields proposed by a page result, built exactly as import seeding builds them. */
export function aiDraftFields(result: Json): Json {
  const narrative = pageDraftNarrative(result);
  const seeded = buildImportDraftData(narrative, result._sections ?? null);
  // allergieStatus uses the intake vocabulary; only unambiguous statuses are proposed.
  const allergieStatus =
    narrative.allergyStatus === 'present' && filled(seeded.allergie)
      ? 'presenti'
      : narrative.allergyStatus === 'explicitly_absent'
        ? 'assenti'
        : undefined;
  return {
    anagrafica: seeded.anagrafica,
    anamnesi: seeded.anamnesi,
    diagnosi: seeded.diagnosi,
    allergie: seeded.allergie,
    ...(allergieStatus ? { allergieStatus } : {}),
  };
}

const therapySignature = (data: Json) =>
  canonical([
    data.terapiaImport ?? [],
    (Array.isArray(data._importProposals) ? data._importProposals : [])
      .map(object)
      .filter((p) => p.status === 'pending')
      .map((p) => p.id),
  ]);

function resetAccepted(data: Json, key: 'demographics' | 'therapy') {
  const accepted = object(data._accepted);
  if (accepted[key] === true) data._accepted = { ...accepted, [key]: false };
}

export function mergeAiIntoDraft(
  existing: Json,
  source: MergeSource,
  mode: MergeMode,
  ctx: MergeContext,
): { data: Json; changed: MergeChanges } {
  const final = mode === 'final';
  let data: Json = structuredClone(existing);
  const origin: Json = structuredClone(object(existing._fieldOrigin));
  let proposals: Json[] = Array.isArray(existing._fieldProposals)
    ? (structuredClone(existing._fieldProposals) as unknown[]).map(object)
    : [];
  const changed: MergeChanges = {
    anagrafica: false,
    anamnesi: false,
    diagnosi: false,
    allergie: false,
    therapy: false,
  };
  const anagraficaAi = object(source.fields.anagrafica);
  const related = { firstName: anagraficaAi.firstName, lastName: anagraficaAi.lastName };
  // Final merge: each letter's own fields, to tell which letter(s) produced a merged value.
  let letterFields: Array<{ groupId: string; fields: Json }> | null = null;
  const producers = (path: string, value: unknown): string[] => {
    if (!final) return ctx.groupId ? [ctx.groupId] : [];
    letterFields ??= (
      Array.isArray(source.result?._groups) ? (source.result._groups as GroupResult[]) : []
    ).map((g) => ({ groupId: g.groupId, fields: aiDraftFields(letterResult(g)) }));
    return letterFields.filter((l) => same(read(l.fields, path), value)).map((l) => l.groupId);
  };
  /**
   * Provenance of an AI value. Pages are recorded only when every page found is in the one
   * letter that produced the value; any doubt (pages in several letters, several producing
   * letters, pages outside the producer) keeps today's letter-level groupIds and no pages.
   */
  const provenance = (path: string, value: unknown): { groupIds: string[]; pages?: PageRef[] } => {
    const pages = ctx.pages?.length ? locateFieldPages(path, value, ctx.pages, related) : [];
    if (!pages.length) return { groupIds: ctx.groupIds };
    const letters = new Set(pages.map((p) => p.groupId));
    const made = producers(path, value);
    if (letters.size !== 1 || made.length !== 1 || !letters.has(made[0]))
      return { groupIds: ctx.groupIds };
    return { groupIds: final ? made : ctx.groupIds, pages };
  };
  const dropPending = (path: string, keep: (p: Json) => boolean = () => false) => {
    proposals = proposals.filter((p) => p.path !== path || p.status !== 'pending' || keep(p));
  };
  const propose = (path: string, ai: unknown, current: unknown) => {
    const { groupIds, pages } = provenance(path, ai);
    // Dedupe by path + value, whatever the decision was: a kept/applied value is not raised again.
    const prior = proposals.find((p) => p.path === path && same(p.value, ai));
    if (prior) {
      if (prior.status === 'pending') {
        prior.current = structuredClone(current);
        prior.groupIds = [
          ...new Set([...(Array.isArray(prior.groupIds) ? prior.groupIds : []), ...groupIds]),
        ];
        if (pages) prior.pages = unionPages(prior.pages, pages);
      }
      return;
    }
    proposals.push({
      id: proposalId(path, ai),
      path,
      value: structuredClone(ai),
      current: structuredClone(current),
      groupIds,
      ...(pages ? { pages } : {}),
      status: 'pending',
    });
  };
  // Pre-merge state of the fields this merge writes, to undo an incoherent allergy unit.
  const written = new Map<string, { value: unknown; origin: unknown; ai: unknown }>();
  const cleared = new Set<string>();

  for (const path of MERGE_FIELD_PATHS) {
    const ai = read(source.fields, path);
    const current = read(data, path);
    const recorded = object(origin[path]);
    const aiOwned = recorded.by === 'ai' && filled(current) && same(current, recorded.value);
    // The final result is the reviewed truth: pending proposals it does not support are stale,
    // including when it has no value at all for the field.
    if (final) dropPending(path, (p) => filled(ai) && same(p.value, ai));
    if (!filled(ai)) {
      // A value a letter wrote and nobody touched, unsupported by the final result, is removed.
      if (final && aiOwned) {
        clear(data, path);
        delete origin[path];
        cleared.add(path);
        changed[sectionOf(path)] = true;
      }
      continue; // Otherwise the AI never blanks a field.
    }
    const take = () => {
      written.set(path, { value: structuredClone(current), origin: origin[path], ai });
      write(data, path, ai);
      origin[path] = { by: 'ai', value: structuredClone(ai), ...provenance(path, ai), final };
      changed[sectionOf(path)] = true;
      dropPending(path);
    };
    if (!filled(current)) {
      // A blank field with a recorded origin was emptied on purpose: it is the operator's choice.
      if (origin[path] !== undefined) propose(path, ai, current);
      else take();
      continue;
    }
    if (same(current, ai)) {
      if (aiOwned && final) {
        // Refresh the provenance only on a certain match; otherwise keep the recorded one.
        const found = provenance(path, ai);
        origin[path] = { ...recorded, ...(found.pages ? found : {}), final: true };
      }
      dropPending(path, (p) => !same(p.value, ai));
      continue;
    }
    if (aiOwned) {
      if (final) take();
      continue;
    }
    propose(path, ai, current); // Operator-owned: never overwritten.
  }

  // Allergy rows and allergieStatus are one unit: a merge never leaves a negative status next to
  // allergy rows. Whatever this merge wrote into such a state is undone and becomes a proposal.
  if (negativeAllergyStatus(data.allergieStatus) && filled(data.allergie)) {
    for (const path of ['allergie', 'allergieStatus']) {
      const undo = written.get(path);
      if (!undo) continue;
      // Both unit paths are top-level keys: restore exactly what was there (or its absence).
      if (undo.value === undefined) delete data[path];
      else data[path] = structuredClone(undo.value);
      if (undo.origin === undefined) delete origin[path];
      else origin[path] = undo.origin;
      propose(path, undo.ai, undo.value);
      written.delete(path);
    }
    changed.allergie = [...written.keys(), ...cleared].some((p) => sectionOf(p) === 'allergie');
  }

  const aiMerge = structuredClone(object(existing._aiMerge));
  if (final) {
    const result = source.result;
    if (!result)
      throw new ImportSessionError(409, 'import_review_outdated', 'Revisione non disponibile');
    const before = therapySignature(data);
    const operatorTherapy = filled(data.terapia) || filled(data.terapiaImport);
    // First final merge with no operator therapy: imported rows like the seed. Otherwise every
    // AI row not already present becomes an _importProposals entry (refresh semantics); rows the
    // operator (or an earlier final merge) already holds are kept exactly as saved.
    data =
      !data._importSource && !operatorTherapy
        ? attachPageDraftSource(data, result)
        : refreshedPageData(data, result);
    changed.therapy = therapySignature(data) !== before;
    const imported = new Set(Array.isArray(data._importedFields) ? data._importedFields : []);
    for (const section of ['anagrafica', 'anamnesi', 'diagnosi', 'allergie'] as const)
      if (changed[section]) imported.add(section);
    if (filled(data.terapiaImport)) imported.add('terapiaImport');
    data._importedFields = [...imported];
    aiMerge.final = ctx.resultHash ?? sourcePair(result).resultHash;
  } else if (ctx.groupId) {
    aiMerge.groups = { ...object(aiMerge.groups), [ctx.groupId]: ctx.inputHash };
  }

  if (changed.anagrafica) resetAccepted(data, 'demographics');
  if (changed.therapy) resetAccepted(data, 'therapy');
  data._fieldOrigin = origin;
  data._fieldProposals = proposals;
  data._aiMerge = aiMerge;
  return { data, changed };
}

/**
 * Operator decision on a field proposal. 'apply' writes the proposed value as an explicit
 * operator choice: the field becomes operator-owned (origin `by: 'operator'`), so a later merge
 * can only propose, never silently replace it. Other pending proposals on the same field are
 * closed as 'kept' because the operator has just chosen that field's value.
 */
export function decideFieldProposal(existing: Json, proposalIdValue: string, action: unknown) {
  if (action !== 'apply' && action !== 'keep')
    throw new ImportSessionError(400, 'invalid_input', 'Azione non valida');
  const data: Json = structuredClone(existing);
  const proposals = (Array.isArray(data._fieldProposals) ? data._fieldProposals : []).map(object);
  const proposal = proposals.find((p) => p.id === proposalIdValue);
  if (!proposal) throw new ImportSessionError(404, 'proposal_not_found', 'Proposta non trovata');
  if (proposal.status !== 'pending')
    throw new ImportSessionError(409, 'proposal_decided', 'La proposta è già stata gestita');
  const path = String(proposal.path);
  if (!(MERGE_FIELD_PATHS as readonly string[]).includes(path))
    throw new ImportSessionError(400, 'invalid_proposal', 'Proposta non valida');
  if (action === 'keep') proposal.status = 'kept';
  else {
    // Allergy unit: a negative status is never applied next to allergy rows (the operator must
    // first remove the rows); applying rows over a negative status turns it into 'presenti'.
    if (path === 'allergieStatus' && negativeAllergyStatus(proposal.value) && filled(data.allergie))
      throw new ImportSessionError(
        409,
        'proposal_inconsistent',
        'Ci sono allergie registrate: rimuovile prima di indicare che non ci sono allergie',
      );
    write(data, path, proposal.value);
    // The applied value keeps the proposal's pages; a status derived from it gets none.
    const operatorOrigin = (value: unknown, withPages = true) => ({
      by: 'operator',
      value: structuredClone(value),
      groupIds: proposal.groupIds ?? [],
      ...(withPages && Array.isArray(proposal.pages)
        ? { pages: structuredClone(proposal.pages) }
        : {}),
      final: false,
      proposalId: proposal.id,
    });
    const origins: Json = { ...object(data._fieldOrigin), [path]: operatorOrigin(proposal.value) };
    if (path === 'allergie' && negativeAllergyStatus(data.allergieStatus)) {
      data.allergieStatus = 'presenti';
      origins.allergieStatus = operatorOrigin('presenti', false);
    }
    // Rows now recorded: a pending "no allergies" proposal can no longer be applied.
    if (path === 'allergie')
      for (const other of proposals)
        if (
          other.path === 'allergieStatus' &&
          other.status === 'pending' &&
          negativeAllergyStatus(other.value)
        )
          other.status = 'kept';
    data._fieldOrigin = origins;
    proposal.status = 'applied';
    for (const other of proposals)
      if (other !== proposal && other.path === path && other.status === 'pending')
        other.status = 'kept';
    if (sectionOf(path) === 'anagrafica') resetAccepted(data, 'demographics');
  }
  data._fieldProposals = proposals;
  return data;
}

export const pendingFieldProposals = (data: unknown) =>
  (Array.isArray(object(data)._fieldProposals) ? (object(data)._fieldProposals as unknown[]) : [])
    .map(object)
    .filter((p) => p.status === 'pending').length;
