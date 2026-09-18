import type { MedicazioneRecord } from '../types';
import type { PatientDocumentMeta } from './patientDocumentsPage';

export function attachDressingDocument(
  records: MedicazioneRecord[],
  id: string,
  documentId: string,
) {
  if (!records.some((record) => record.id === id)) return null;
  return records.map((record) =>
    record.id === id
      ? {
          ...record,
          patientDocumentIds: [...new Set([...(record.patientDocumentIds ?? []), documentId])],
        }
      : record,
  );
}

/** Remember the upload before linking so retry never duplicates successfully stored bytes. */
export async function saveClinicalAttachment(input: {
  stored: PatientDocumentMeta | null;
  signal: AbortSignal;
  upload: () => Promise<PatientDocumentMeta>;
  remember: (document: PatientDocumentMeta) => void;
  link: (document: PatientDocumentMeta) => void | boolean | Promise<void | boolean>;
}) {
  input.signal.throwIfAborted();
  const document = input.stored ?? (await input.upload());
  input.signal.throwIfAborted();
  input.remember(document);
  const result = await input.link(document);
  input.signal.throwIfAborted();
  if (result === false) throw new Error('link_failed');
}
