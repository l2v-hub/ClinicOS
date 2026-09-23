import { readFileSync, writeFileSync } from 'node:fs';
const path = 'frontend/src/components/operator/assessments/AssessmentWorkspace.tsx';
let source = readFileSync(path, 'utf8');
const start = source.indexOf("{record?.status === 'final' ? (");
const end = source.indexOf(') : draft.preview && record ? (', start);
if (start < 0 || end < start) throw new Error('Final view boundaries not found');
source = source.slice(0, start) + `{record?.status === 'final' ? (
                <AssessmentFinal record={record} busy={pdfBusy} onPdf={() => void openPdf()} onRefreshPdf={retry => void pdfAction(retry)} onOpenArchive={onOpenArchive} onOpenRecord={id => void open(id)} onCorrect={() => create(record)} />
              ` + source.slice(end);
source = source.replace("import { AssessmentSummary } from './AssessmentSummary';", "import { AssessmentSummary } from './AssessmentSummary';\nimport { AssessmentFinal } from './AssessmentFinal';");
writeFileSync(path, source);
