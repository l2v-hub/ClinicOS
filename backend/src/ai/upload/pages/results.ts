import {
  mergeExtractions,
  type DocResult,
  type MergedField,
  type MergedItem,
  type MergedProposal,
} from '../../merge.js';
import { filterRepeatedHeaders } from '../../sections/header-filter.js';
import { parseNarrativeFromMarkdown } from '../../sections/markdown-parse.js';
import { narrativeFromRawText, type DischargeNarrativeDraft } from '../../sections/narrative.js';
import { hash, object, orderPages, type Json, type Manifest } from './model.js';
export type GroupResult = {
  groupId: string;
  label: string;
  pageIds: string[];
  inputHash: string;
  model: string;
  _full: Json;
  _narrative: DischargeNarrativeDraft;
  rawText: string;
  cleanedRawText: string;
  _sections: unknown;
};
export type ConflictSource = {
  groupId: string;
  label: string;
  model: string;
  pages: Array<{ pageId: string; documentId: string; sourcePageNumber: number }>;
  snippet?: string;
};
export type Conflict = {
  id: string;
  field: string;
  label: string;
  itemKey?: string;
  candidates: Array<{
    id: string;
    value: unknown;
    displayValue: string;
    sources: ConflictSource[];
  }>;
};
export type Decision =
  | { conflictId: string; action: 'select'; candidateId: string }
  | { conflictId: string; action: 'defer' };
const TEXT_FIELDS = [
  'allergiesText',
  'diagnosisText',
  'anamnesisText',
  'hospitalCourseText',
  'consultationsText',
  'imagingDiagnosticsText',
  'proceduresAndInterventionsText',
  'therapyText',
  'adviceAndFollowUpText',
  'unmappedText',
] as const;
export function buildGroupResult(
  m: Manifest,
  groupId: string,
  inputHash: string,
  rawText: string,
  raw: unknown,
  model: string,
): GroupResult {
  const group = m.groups.find((g) => g.id === groupId)!;
  const data = object(raw);
  const ana = object(data.anagrafica);
  const cart = object(data.cartella);
  const demo = {
    firstName: String(ana.nome ?? ''),
    lastName: String(ana.cognome ?? ''),
    dateOfBirth: String(ana.dataNascita ?? ''),
    sex: String(ana.sesso ?? ''),
    fiscalCode: String(cart.codiceFiscale ?? ''),
  };
  const cleaned = filterRepeatedHeaders(rawText).cleanedText;
  const narrative = parseNarrativeFromMarkdown(cleaned, demo, {
    id: groupId,
    filename: group.label,
  });
  return {
    groupId,
    label: group.label,
    pageIds: orderPages(m, groupId).map((p) => p.id),
    inputHash,
    model,
    _full: data,
    _narrative: narrative,
    rawText,
    cleanedRawText: cleaned,
    _sections: null,
  };
}
const LABELS: Record<string, string> = {
  nome: 'Nome',
  cognome: 'Cognome',
  dataNascita: 'Data di nascita',
  sesso: 'Sesso',
  telefono: 'Telefono',
  email: 'Email',
  indirizzo: 'Indirizzo',
  contattoEmergenzaNome: 'Contatto di emergenza',
  contattoEmergenzaTel: 'Telefono di emergenza',
  codiceFiscale: 'Codice fiscale',
  statoRicovero: 'Stato del ricovero',
  cameraNumero: 'Camera',
  lettoNumero: 'Letto',
  patologiaIngresso: 'Patologia di ingresso',
  dataRicovero: 'Data del ricovero',
  noteGenerali: 'Note',
  medicoCurante: 'Medico curante',
  diagnosi: 'Diagnosi',
  allergie: 'Allergie',
  farmaci: 'Farmaci',
  terapie: 'Terapie',
  parametriVitali: 'Parametri vitali',
  noteClinica: 'Note cliniche',
  diarioMedico: 'Diario medico',
  indicatoriRischio: 'Indicatori di rischio',
  dosaggio: 'Dosaggio',
  dose: 'Dose',
  via: 'Via',
  viaSomministrazione: 'Via di somministrazione',
  orari: 'Orari',
  frequenza: 'Frequenza',
  descrizione: 'Descrizione',
  tipo: 'Tipo',
  allergene: 'Allergene',
  reazione: 'Reazione',
  gravita: 'Gravità',
  note: 'Note',
  dataInizio: 'Inizio',
  dataFine: 'Fine',
};
function display(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(display).join(', ');
  if (typeof value === 'object')
    return Object.entries(object(value))
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${LABELS[k] ?? k.replace(/([a-z])([A-Z])/g, '$1 $2')}: ${display(v)}`)
      .join(' · ');
  return String(value);
}
function conflictsIn(merged: MergedProposal, m: Manifest, groups: GroupResult[]): Conflict[] {
  const out: Conflict[] = [];
  function add(field: string, value: MergedField | MergedItem, itemKey?: string) {
    if (value.status !== 'conflict') return;
    const candidates = (value.candidates ?? []).map((c) => {
      const sources = c.sources.map((s) => ({
        groupId: s.docId,
        label: groups.find((g) => g.groupId === s.docId)?.label ?? s.filename,
        model: s.model,
        pages: orderPages(m, s.docId).map((p) => ({
          pageId: p.id,
          documentId: p.documentId,
          sourcePageNumber: p.sourcePageNumber,
        })),
        ...(s.snippet ? { snippet: s.snippet } : {}),
      }));
      return {
        id: hash([field, itemKey ?? null, c.value, sources]),
        value: c.value,
        displayValue: display(c.value),
        sources,
      };
    });
    const label = LABELS[field.split('.').at(-1)!] ?? 'Informazione clinica';
    out.push({
      id: hash([field, itemKey ?? null, candidates.map((c) => c.id)]),
      field,
      label: itemKey ? `${label}: ${itemKey.replace(/\|/g, ' ')}` : label,
      ...(itemKey ? { itemKey } : {}),
      candidates,
    });
  }
  Object.entries(merged.anagrafica).forEach(([k, v]) => add(`anagrafica.${k}`, v));
  Object.entries(merged.cartella).forEach(([k, v]) => {
    'items' in v ? v.items.forEach((i) => add(`cartella.${k}`, i, i.key)) : add(`cartella.${k}`, v);
  });
  return out;
}
export function assembleResult(m: Manifest, revision: number, groups: GroupResult[]) {
  const docs: DocResult[] = groups.map((g) => ({
    docId: g.groupId,
    filename: g.label,
    model: g.model,
    data: g._full,
  }));
  const merged = mergeExtractions(docs);
  const conflicts = conflictsIn(merged, m, groups);
  const narrative =
    groups.length === 1 ? structuredClone(groups[0]._narrative) : narrativeFromRawText('', {});
  if (groups.length > 1) {
    for (const field of TEXT_FIELDS)
      narrative[field] = groups
        .filter((g) => g._narrative[field])
        .map((g) => `[${g.label}]\n${g._narrative[field]}`)
        .join('\n\n');
    const names = {
      firstName: 'nome',
      lastName: 'cognome',
      dateOfBirth: 'dataNascita',
      sex: 'sesso',
      phone: 'telefono',
      email: 'email',
      address: 'indirizzo',
    } as const;
    for (const [to, from] of Object.entries(names))
      (narrative as unknown as Json)[to] =
        merged.anagrafica[from]?.status === 'extracted'
          ? String(merged.anagrafica[from].value ?? '')
          : '';
    narrative.fiscalCode =
      merged.cartella.codiceFiscale?.status === 'extracted'
        ? String((merged.cartella.codiceFiscale as MergedField).value ?? '')
        : '';
    const allergyStatuses = new Set(groups.map((g) => g._narrative.allergyStatus));
    narrative.allergyStatus =
      allergyStatuses.has('conflicting') ||
      (allergyStatuses.has('present') && allergyStatuses.has('explicitly_absent'))
        ? 'conflicting'
        : allergyStatuses.has('present')
          ? 'present'
          : allergyStatuses.has('explicitly_absent')
            ? 'explicitly_absent'
            : 'not_documented';
    narrative.sourceReferences = groups.flatMap((g) => g._narrative.sourceReferences);
  }
  const source = {
    manifestRevision: revision,
    resultHash: hash([revision, m, groups, 'merge-v1']),
  };
  return {
    ...merged,
    _source: source,
    _groups: groups,
    _conflicts: conflicts,
    _review: { decisions: [] as Decision[], unresolvedConflictIds: conflicts.map((c) => c.id) },
    _full: groups.length === 1 ? groups[0]._full : {},
    _narrative: narrative,
    _sections: null,
    rawText: groups.map((g) => `[${g.label}]\n${g.rawText}`).join('\n\n'),
    cleanedRawText: groups.map((g) => `[${g.label}]\n${g.cleanedRawText}`).join('\n\n'),
  };
}
