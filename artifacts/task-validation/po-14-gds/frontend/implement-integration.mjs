import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '../../../..');
function edit(path, changes) {
  const file = resolve(root, path);
  let text = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  for (const [before, after] of changes) {
    if (!text.includes(before)) throw new Error(`Missing exact edit in ${path}: ${before}`);
    text = text.replace(before, after);
  }
  writeFileSync(file, text);
}
edit('frontend/src/lib/assessments/assessmentTypes.ts', [
  ["import type { PatientIdentityData }", "import { GDS15_VERSION, type Gds15Answers, type Gds15Result, type Gds15Snapshot } from './gds15Types';\nimport type { PatientIdentityData }"],
  ["'tinetti' | 'mna';", "'tinetti' | 'mna' | 'gds15';"],
  ['| TinettiAnswers | MnaAnswers;', '| TinettiAnswers | MnaAnswers | Gds15Answers;'],
  ['  mna: MNA_VERSION,', '  mna: MNA_VERSION,\n  gds15: GDS15_VERSION,'],
  ['export type AssessmentHistoryItem =', "export type Gds15HistoryItem = AssessmentHistoryBase & {\n  type: 'gds15';\n  formVersion: typeof GDS15_VERSION;\n  answeredCount: number;\n  completion: AssessmentCompletion;\n  result: Gds15Result | null;\n};\nexport type AssessmentHistoryItem ="],
  ['TinettiHistoryItem | MnaHistoryItem;', 'TinettiHistoryItem | MnaHistoryItem | Gds15HistoryItem;'],
  ['export type AssessmentDto =', 'export type Gds15AssessmentDto = Gds15HistoryItem & {\n  answers: Gds15Answers;\n  finalSnapshot: Gds15Snapshot | null;\n  snapshotSha256: string | null;\n};\nexport type AssessmentDto ='],
  ['TinettiAssessmentDto | MnaAssessmentDto;', 'TinettiAssessmentDto | MnaAssessmentDto | Gds15AssessmentDto;'],
  ['typeof TINETTI_VERSION | typeof MNA_VERSION;', 'typeof TINETTI_VERSION | typeof MNA_VERSION | typeof GDS15_VERSION;'],
]);
edit('frontend/src/lib/assessments/assessmentDefinition.ts', [
  ["export const assessmentDefinition", "import { GDS15, assertGds15Answers, emptyGds15Answers } from './gds15Definition';\nexport const assessmentDefinition"],
  ['tinetti: TINETTI, mna: MNA', 'tinetti: TINETTI, mna: MNA, gds15: GDS15'],
  ['        : emptyTransfersAnswers();', "        : type === 'gds15'\n          ? emptyGds15Answers()\n          : emptyTransfersAnswers();"],
  ["  else assertTransfersAnswers(value);", "  else if (type === 'gds15') assertGds15Answers(value);\n  else assertTransfersAnswers(value);"],
]);
edit('frontend/src/lib/assessments/assessmentValidation.ts', [
  ['export const validAssessmentId', "import { GDS15_VERSION } from './gds15Types';\nimport { assertGds15History, assertGds15Assessment } from './gds15Validation';\nexport const validAssessmentId"],
  ["value === 'mna';", "value === 'mna' || value === 'gds15';"],
  ['        mna: MNA_VERSION,', '        mna: MNA_VERSION,\n        gds15: GDS15_VERSION,'],
  ["  } else if (row.type === 'mna') {", "  } else if (row.type === 'gds15') {\n    assertGds15History(row);\n  } else if (row.type === 'mna') {"],
  ["  if (row.type === 'postural_transfers') {", "  if (row.type === 'gds15') {\n    assertGds15Assessment(row, patientId);\n    return;\n  }\n  if (row.type === 'postural_transfers') {"],
]);
edit('frontend/src/lib/assessments/assessmentDraftStore.ts', [
  ['export interface AssessmentDraft {', "import { validGds15Notes } from './gds15Definition';\nimport type { Gds15Answers } from './gds15Types';\nexport interface AssessmentDraft {"],
  ["          if (draft.type === 'mna') {", "          if (draft.type === 'gds15' && !validGds15Notes((draft.fields.answers as Gds15Answers).notes)) {\n            set(key, { ...draft, failure: { ...validation('Le note devono contenere al massimo 4000 caratteri validi.'), missingPaths: ['notes'] } });\n            return null;\n          }\n          if (draft.type === 'mna') {"],
]);
edit('frontend/src/components/operator/assessments/AssessmentWorkspace.tsx', [
  ["import { MnaForm } from './MnaForm';", "import { MnaForm } from './MnaForm';\nimport { GdsForm } from './GdsForm';"],
  ["import './Mna.css';", "import './Mna.css';\nimport './Gds.css';"],
  ['          : TransfersForm;', "          : type === 'gds15'\n            ? GdsForm\n            : TransfersForm;"],
]);
edit('frontend/src/components/operator/assessments/AssessmentSummary.tsx', [
  ['export function AssessmentSummary', "import { GdsSummary } from './GdsSummary';\nexport function AssessmentSummary"],
  ["  const snapshot = record.finalSnapshot;", "  if (record.type === 'gds15') return <GdsSummary record={record} />;\n  const snapshot = record.finalSnapshot;"],
]);
edit('frontend/src/components/operator/assessments/AssessmentHistory.tsx', [
  ["  return record.result", "  if (record.type === 'gds15') return record.result\n    ? `Screening GDS-15 · ${record.result.total}/15 · ${record.result.label}`\n    : `${record.answeredCount} di 15 risposte`;\n  return record.result"],
]);
edit('frontend/src/components/operator/tabGroups.ts', [
  ['export type TabId =', "import type { AssessmentType } from '../../lib/assessments/assessmentTypes';\nexport type TabId ="],
  ["  | 'mna'", "  | 'mna'\n  | 'gds'"],
  ["      { id: 'mna', label: 'MNA · Nutrizione' },", "      { id: 'mna', label: 'MNA · Nutrizione' },\n      { id: 'gds', label: 'GDS-15 · Depressione' },"],
  ['export function tabLabel', "export const assessmentPatientTab = (type: AssessmentType): TabId => type === 'gds15' ? 'gds' : type;\n\nexport function tabLabel"],
]);
edit('frontend/src/components/operator/PatientDetail.tsx', [
  ['  resolvePatientTab,', '  resolvePatientTab,\n  assessmentPatientTab,'],
  ['switchTab(assessment.type);', 'switchTab(assessmentPatientTab(assessment.type));'],
  ["|| tab === 'mna') && (", "|| tab === 'mna' || tab === 'gds') && ("],
  ['                type={tab} draftStore=', "                type={tab === 'gds' ? 'gds15' : tab} draftStore="],
]);
edit('frontend/src/App.tsx', [["  'mna',", "  'mna',\n  'gds',"]]);
edit('frontend/src/lib/patientDocumentArchive.ts', [["  mna: 'MNA · Nutrizione',", "  mna: 'MNA · Nutrizione',\n  gds15: 'GDS-15 · Depressione',"]]);
edit('frontend/src/lib/patientDocumentArchiveIO.ts', [
  ["import { MNA_VERSION }", "import { GDS15_VERSION } from './assessments/gds15Types';\nimport { MNA_VERSION }"],
  ["'tinetti', 'mna'].includes", "'tinetti', 'mna', 'gds15'].includes"],
  ['            mna: MNA_VERSION,', '            mna: MNA_VERSION,\n            gds15: GDS15_VERSION,'],
]);
