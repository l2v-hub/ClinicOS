import { readFileSync, writeFileSync } from 'node:fs';
const directory = 'frontend/src/components/operator/assessments/';
let source = readFileSync(directory + 'AssessmentWorkspace.tsx', 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('  async function pdfAction(');
const end = source.indexOf('  return (\n    <div className="assessment-workspace"', start);
if (start < 0 || end < 0) throw new Error('Extraction markers not found; run only once.');
const functions = source.slice(start, end).replaceAll('history.refresh()', 'refresh()');
const hook = `import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Paziente } from '../../../types';
import type { AssessmentDto } from '../../../lib/assessments/assessmentTypes';
import type { AssessmentClient } from '../../../lib/assessments/assessmentClient';
import type { AssessmentDraftStore } from '../../../lib/assessments/assessmentDraftStore';
import type { PatientDocumentMeta } from '../../../lib/patientDocumentsPage';
import { documentAuthHeaders } from '../../../lib/entraAuth';
import { readArchiveDocumentMetadata } from '../../../lib/patientDocumentArchiveIO';
export function useAssessmentPdf({ record, selectedKey, life, selected, patient, operatorId, operatorRole, client, store, refresh, setError }: {
  record?: AssessmentDto; selectedKey: string | null; life: RefObject<number>; selected: RefObject<string | null>;
  patient: Paziente; operatorId?: string; operatorRole?: string; client: AssessmentClient; store: AssessmentDraftStore;
  refresh: () => void; setError: (error: string) => void;
}) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const pdfLock = useRef(false);
  const [pdfDocument, setPdfDocument] = useState<PatientDocumentMeta | null>(null);
  const requests = useRef(new Set<AbortController>());
  useEffect(() => { const active = requests.current; return () => { active.forEach(controller => controller.abort()); active.clear(); }; }, []);
${functions}
  return { pdfBusy, pdfDocument, setPdfDocument, pdfAction, openPdf };
}
`;
source = source.slice(0, start) + source.slice(end);
for (const line of ["import { documentAuthHeaders } from '../../../lib/entraAuth';", "import { readArchiveDocumentMetadata } from '../../../lib/patientDocumentArchiveIO';", "import type { PatientDocumentMeta } from '../../../lib/patientDocumentsPage';",
  '  const [pdfBusy, setPdfBusy] = useState(false);', '  const pdfLock = useRef(false);', '  const [pdfDocument, setPdfDocument] = useState<PatientDocumentMeta | null>(null);']) source = source.replace(line + '\n', '');
source = source.replace("import './AssessmentWorkspace.css';", "import { useAssessmentPdf } from './useAssessmentPdf';\nimport './AssessmentWorkspace.css';");
source = source.replace('  const record = draft?.record;', '  const record = draft?.record;\n  const { pdfBusy, pdfDocument, setPdfDocument, pdfAction, openPdf } = useAssessmentPdf({ record, selectedKey, life, selected, patient, operatorId, operatorRole, client, store, refresh: history.refresh, setError });');
writeFileSync(directory + 'useAssessmentPdf.ts', hook);
writeFileSync(directory + 'AssessmentWorkspace.tsx', source);
