import { useEffect, useRef, useState } from 'react';
import type { PreviewDoc } from '../components/shared/DocumentPreview';

export interface UploadOutcome {
  filename: string;
  status: string;
  documentId?: string;
  message?: string;
}
export interface UploadedDocument {
  id: string;
  filename: string;
  mimeType: string;
  logicalDoc?: string | null;
}

export function isImportPhotoReplacement(files: File[]): boolean {
  return (
    files.length === 1 &&
    (files[0].type.startsWith('image/') || files[0].type === 'application/pdf')
  );
}

// The upload API returns one outcome per input, in input order. Filenames are not unique.
export class ImportPreviewSession {
  generation = 0;
  documents: PreviewDoc[] = [];

  accept(files: File[], outcomes: UploadOutcome[], documents: UploadedDocument[]) {
    if (files.length !== outcomes.length) return [];
    const added: PreviewDoc[] = [];
    outcomes.forEach((outcome, index) => {
      if (outcome.status !== 'accepted' || !outcome.documentId) return;
      const doc = documents.find((d) => d.id === outcome.documentId);
      if (!doc || [...this.documents, ...added].some((p) => p.id === doc.id)) return;
      const f = files[index];
      added.push({
        id: doc.id,
        name: doc.filename,
        type: doc.mimeType,
        url: URL.createObjectURL(f),
      });
    });
    this.documents = [...this.documents, ...added];
    return added;
  }

  remove(id: string) {
    this.documents.filter((p) => p.id === id).forEach((p) => URL.revokeObjectURL(p.url));
    this.documents = this.documents.filter((p) => p.id !== id);
  }

  clear() {
    this.documents.forEach((p) => URL.revokeObjectURL(p.url));
    this.documents = [];
    this.generation++;
  }
}

export function useImportPreviews(open: boolean) {
  const session = useRef(new ImportPreviewSession()).current;
  const [previews, setPreviews] = useState<PreviewDoc[]>([]);
  useEffect(() => {
    // Closing the import discards session-only documents; cleanup also covers unmounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) setPreviews([]);
    return () => session.clear();
  }, [open, session]);
  return {
    previews,
    session,
    acceptFiles(files: File[], outcomes: UploadOutcome[], documents: UploadedDocument[]) {
      const added = session.accept(files, outcomes, documents);
      setPreviews(session.documents);
      return added;
    },
    removePreview(id: string) {
      session.remove(id);
      setPreviews(session.documents);
    },
  };
}

/** Called only after a replacement upload is accepted. Retain the original on any failure. */
export async function finishPhotoReplacement<T extends { documents: UploadedDocument[] }>(
  baseUrl: string,
  job: T,
  originalId: string,
  replacementId: string,
  request: (url: string, options: RequestInit) => Promise<Response>,
  onUpdate: (job: T) => void,
  isCurrent: () => boolean,
): Promise<boolean> {
  const original = job.documents.find((d) => d.id === originalId);
  if (
    !original ||
    originalId === replacementId ||
    !job.documents.some((d) => d.id === replacementId)
  )
    return false;
  const send = async (path: string, method: string, body?: unknown) => {
    if (!isCurrent()) throw new Error('Import session closed');
    const res = await request(`${baseUrl}${path}`, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
    if (!res.ok) throw new Error('Photo replacement failed');
    const updated = (await res.json()) as T;
    if (!isCurrent()) throw new Error('Import session closed');
    onUpdate(updated);
  };
  if (original.logicalDoc)
    await send(`/files/${replacementId}/logical`, 'POST', { logicalDoc: original.logicalDoc });
  const order = job.documents
    .filter((d) => d.id !== replacementId)
    .flatMap((d) => (d.id === originalId ? [replacementId, originalId] : [d.id]));
  await send('/reorder', 'POST', { order });
  await send(`/files/${originalId}`, 'DELETE');
  return true;
}
