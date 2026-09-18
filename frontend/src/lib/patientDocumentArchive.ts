import type { DocumentoConsegnato, TipoDocumento } from '../types';
import type { PatientDocumentMeta } from './patientDocumentsPage';

export const DOCUMENT_TYPE_LABELS: Record<TipoDocumento, string> = {
  documento_identita: 'Documento di identità',
  tessera_sanitaria: 'Tessera sanitaria',
  consulenza: 'Visita specialistica',
  esame: 'Analisi di laboratorio',
  rx: 'Esame strumentale / radiologico',
  consenso_privacy: 'Consenso privacy',
  consenso_trattamento: 'Consenso trattamento',
  invio_centro_medico: 'Invio centro medico',
  lettera_dimissione: 'Lettera di dimissione',
  referto: 'Altro referto clinico',
  prescrizione: 'Prescrizione',
  delega: 'Delega',
  liberatoria_uscita: 'Liberatoria di uscita',
  consenso_contenzioni: 'Consenso contenzioni',
  documentazione_medicazioni: 'Documentazione medicazioni',
  consenso_informato: 'Consenso informato',
  privacy: 'Informativa privacy',
  regolamento: 'Regolamento struttura',
  carta_servizi: 'Carta dei servizi',
  modulo_allergie: 'Modulo allergie',
  piano_terapeutico: 'Piano terapeutico',
  altro: 'Altro documento',
};

export const ARCHIVE_CATEGORIES = [
  { id: 'personali', label: 'Personali', types: ['documento_identita', 'tessera_sanitaria'] },
  { id: 'visite', label: 'Visite specialistiche', types: ['consulenza'] },
  { id: 'analisi', label: 'Analisi', types: ['esame'] },
  { id: 'esami', label: 'Esami e referti', types: ['rx', 'referto'] },
  {
    id: 'terapie',
    label: 'Terapie',
    types: ['prescrizione', 'piano_terapeutico'],
  },
  { id: 'medicazioni', label: 'Medicazioni', types: ['documentazione_medicazioni'] },
  {
    id: 'dimissioni',
    label: 'Dimissioni e invii',
    types: ['lettera_dimissione', 'invio_centro_medico'],
  },
  {
    id: 'consensi',
    label: 'Consensi e moduli',
    types: [
      'consenso_privacy',
      'consenso_trattamento',
      'delega',
      'liberatoria_uscita',
      'consenso_contenzioni',
      'consenso_informato',
      'privacy',
      'regolamento',
      'carta_servizi',
      'modulo_allergie',
    ],
  },
  { id: 'altro', label: 'Altri documenti', types: ['altro'] },
] as const;
export type ArchiveCategory = (typeof ARCHIVE_CATEGORIES)[number]['id'];
export type ArchiveStatus = boolean | 'tutti';
export interface ArchiveFolder {
  category: ArchiveCategory | 'tutti';
  type?: TipoDocumento;
}
export function archiveFolderLabel(folder: ArchiveFolder): string {
  if (folder.type) return DOCUMENT_TYPE_LABELS[folder.type];
  return (
    ARCHIVE_CATEGORIES.find((item) => item.id === folder.category)?.label ?? 'Tutti i documenti'
  );
}

export function normalizeDocumentType(type: string): TipoDocumento {
  if (type === 'discharge_import') return 'lettera_dimissione';
  return Object.hasOwn(DOCUMENT_TYPE_LABELS, type) ? (type as TipoDocumento) : 'altro';
}
export function documentCategory(type: string): ArchiveCategory {
  const canonical = normalizeDocumentType(type);
  return (
    ARCHIVE_CATEGORIES.find((category) => (category.types as readonly string[]).includes(canonical))
      ?.id ?? 'altro'
  );
}

export interface ArchiveEntry {
  id: string;
  type: TipoDocumento;
  title: string;
  date: string;
  archived: boolean;
  record?: DocumentoConsegnato;
  document?: PatientDocumentMeta;
  unavailable: boolean;
}

export function buildDocumentArchive(
  records: DocumentoConsegnato[],
  documents: PatientDocumentMeta[],
): ArchiveEntry[] {
  const byId = new Map(documents.map((document) => [document.id, document]));
  const linked = new Set(records.map((record) => record.patientDocumentId).filter(Boolean));
  const entries: ArchiveEntry[] = records.map((record) => {
    const attached = record.patientDocumentId ? byId.get(record.patientDocumentId) : undefined;
    const type = normalizeDocumentType(attached?.documentType ?? record.tipo);
    return {
      id: `record:${record.id}`,
      type,
      title: record.descrizione || DOCUMENT_TYPE_LABELS[type],
      date: record.dataConsegna,
      archived: !!record.archiviato,
      record,
      document: attached,
      unavailable: !!record.patientDocumentId && !byId.has(record.patientDocumentId),
    };
  });
  for (const document of documents)
    if (!linked.has(document.id)) {
      entries.push({
        id: `file:${document.id}`,
        type: normalizeDocumentType(document.documentType),
        title: document.originalName,
        date: document.createdAt.slice(0, 10),
        archived: false,
        document,
        unavailable: false,
      });
    }
  return entries.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      a.title.localeCompare(b.title, 'it') ||
      a.id.localeCompare(b.id),
  );
}

function searchable(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('it');
}
export function filterDocumentArchive(
  entries: ArchiveEntry[],
  category: ArchiveCategory | 'tutti',
  query: string,
  archived: ArchiveStatus,
  type?: TipoDocumento,
): ArchiveEntry[] {
  const term = searchable(query.trim());
  return entries.filter(
    (entry) =>
      (archived === 'tutti' || entry.archived === archived) &&
      (!type || entry.type === type) &&
      (category === 'tutti' || documentCategory(entry.type) === category) &&
      (!term ||
        searchable(
          [
            entry.title,
            DOCUMENT_TYPE_LABELS[entry.type],
            entry.document?.originalName,
            entry.record?.provenienza,
            entry.record?.note,
          ]
            .filter(Boolean)
            .join(' '),
        ).includes(term)),
  );
}
