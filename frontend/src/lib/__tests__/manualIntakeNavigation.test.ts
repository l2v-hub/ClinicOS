import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const list = source('../../components/operator/PatientList.tsx');
const workspace = source('../../components/shared/intake/IntakeWorkspace.tsx');
const flow = source('../../components/operator/NewPatientFlow.tsx');

test('manual path stays on method route across the actual keyed App page boundary', () => {
  const app = source('../../App.tsx');
  assert.match(app, /WidgetGroup key=\{`\$\{navKey\}/);
  const chooser = list.slice(
    list.indexOf('if (newIntake && canIntake)'),
    list.indexOf('className="patient-list-view"'),
  );
  assert.match(chooser, /onChoose=\{setNewPatientPath\}/);
  assert.match(chooser, /\{newPatientFlow\}/);
  assert.doesNotMatch(chooser, /onChoose=\{[\s\S]*onCloseNewIntake/);
  assert.match(list, /const newPatientFlow = canIntake && newPatientPath/);
  assert.match(list, /\{canIntake && !ricerca && filtroSesso === 'tutti' &&/);
});

test('draft opening has announced explicit retry and manual-only first field focus', () => {
  assert.match(workspace, /openingAttempt, setOpeningAttempt/);
  assert.match(workspace, /operatorRole, openingAttempt\]/);
  assert.match(
    workspace,
    /role="alert"[\s\S]{0,450}setOpeningAttempt\(\(attempt\) => attempt \+ 1\)/,
  );
  assert.match(workspace, /data-testid="intake-retry-opening"/);
  assert.match(workspace, /if \(!open \|\| importDraftId \|\| !draftId \|\| loading \|\| error/);
  assert.match(workspace, /data-demographic-field="firstName"/);
  assert.match(workspace, /initialManualFocusRef\.current = true/);
  assert.match(workspace, /first\.scrollIntoView\(\{ block: 'center', behavior: 'instant' \}\)/);
});

test('cancel keeps draft save behavior but never performs patient confirmation', () => {
  const save = workspace.slice(
    workspace.indexOf('async function saveAndClose'),
    workspace.indexOf('// ── Pagina unica'),
  );
  assert.match(save, /await persistDraft\(data\)/);
  assert.doesNotMatch(save, /confirmPersistedDraft|handleConfirm/);
  assert.match(
    list,
    /onClose=\{\(\) => \{\s*focusNewIntakeRef\.current = true;\s*setNewPatientPath\(null\);/,
  );
  assert.match(list, /data-intake-trigger/);
  assert.match(list, /if \(!newIntake && intakeReturnFocus\?\.current\)/);
  assert.match(list, /intakeReturnFocus\.current = false/);
});

test('failed lazy module gets local announced retry and cancel instead of silent roster navigation', () => {
  assert.match(flow, /class IntakeFlowBoundary extends Component/);
  assert.match(flow, /role="alert"/);
  assert.match(flow, /Riprova/);
  assert.match(flow, /window\.location\.reload\(\)/);
  assert.match(flow, /Annulla/);
  assert.match(flow, /<IntakeFlowBoundary onClose=\{onClose\}>/);
});
