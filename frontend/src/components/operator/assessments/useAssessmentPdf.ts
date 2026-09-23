import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Paziente } from '../../../types';
import type { AssessmentDto } from '../../../lib/assessments/assessmentTypes';
import type { AssessmentClient } from '../../../lib/assessments/assessmentClient';
import type { AssessmentDraftStore } from '../../../lib/assessments/assessmentDraftStore';
import type { PatientDocumentMeta } from '../../../lib/patientDocumentsPage';
import { documentAuthHeaders } from '../../../lib/entraAuth';
import { readArchiveDocumentMetadata } from '../../../lib/patientDocumentArchiveIO';
export function useAssessmentPdf({
  record,
  selectedKey,
  life,
  selected,
  patient,
  operatorId,
  operatorRole,
  client,
  store,
  refresh,
  setError,
}: {
  record?: AssessmentDto | null;
  selectedKey: string | null;
  life: RefObject<number>;
  selected: RefObject<string | null>;
  patient: Paziente;
  operatorId?: string;
  operatorRole?: string;
  client: AssessmentClient;
  store: AssessmentDraftStore;
  refresh: () => void;
  setError: (error: string) => void;
}) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const pdfLock = useRef(false);
  const [pdfDocument, setPdfDocument] = useState<PatientDocumentMeta | null>(null);
  const requests = useRef(new Set<AbortController>());
  useEffect(() => {
    const active = requests.current;
    return () => {
      active.forEach((controller) => controller.abort());
      active.clear();
    };
  }, []);
  async function pdfAction(retry: boolean) {
    if (!record || record.status !== 'final' || pdfLock.current) return;
    const key = selectedKey;
    const version = life.current;
    pdfLock.current = true;
    setPdfBusy(true);
    setError('');
    try {
      const incoming = retry
        ? await client.retryPdf(patient.id, record.id)
        : await client.get(patient.id, record.id);
      if (incoming.type !== record.type) throw new Error('Tipo di scheda non corrispondente.');
      if (version === life.current && selected.current === key) {
        store.load(incoming);
        refresh();
      }
    } catch (cause) {
      if (version === life.current && selected.current === key)
        setError(
          cause instanceof Error
            ? cause.message
            : 'PDF non disponibile. La valutazione finale è conservata.',
        );
    } finally {
      pdfLock.current = false;
      if (version === life.current) setPdfBusy(false);
    }
  }
  async function openPdf() {
    if (!record?.pdf?.documentId || pdfLock.current) return;
    const key = selectedKey;
    const version = life.current;
    const controller = new AbortController();
    requests.current.add(controller);
    pdfLock.current = true;
    setPdfBusy(true);
    setError('');
    try {
      const document = await readArchiveDocumentMetadata(
        {
          patientId: patient.id,
          signal: controller.signal,
          getHeaders: () => documentAuthHeaders(patient.id, operatorId, operatorRole),
        },
        record.pdf.documentId,
      );
      if (document.assessment?.id !== record.id || document.assessment.type !== record.type)
        throw new Error('Documento non associato a questa valutazione.');
      if (!controller.signal.aborted && version === life.current && selected.current === key)
        setPdfDocument(document);
    } catch (cause) {
      if (!controller.signal.aborted && version === life.current && selected.current === key)
        setError(cause instanceof Error ? cause.message : 'PDF non disponibile.');
    } finally {
      requests.current.delete(controller);
      pdfLock.current = false;
      if (version === life.current) setPdfBusy(false);
    }
  }

  return { pdfBusy, pdfDocument, setPdfDocument, pdfAction, openPdf };
}
