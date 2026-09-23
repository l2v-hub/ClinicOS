import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const directory = 'artifacts/task-validation/po-15-catalogo/frontend';
const testFiles = [
  ...['gds15Definition','gds15Workflow','mnaDefinition','mnaWorkflow','painadDefinition','assessmentDraftStore','assessmentClient','assessmentArchive','transfersDefinition','transfersDraftStore','transfersClient','tinettiDefinition','tinettiWorkflow','patientDocumentArchive','patientIdentity','patientDocumentsPage','cartellaWriteQueue','medicazioniConcurrency','patientDetailLazyGuard','patientDetailWorkspace','patientRecordPrint','assessmentCatalog','assessmentCatalogWorkflow','nrsLegacy','patientIntakeReview'].map(name=>`src/lib/__tests__/${name}.test.ts`),
  ...['gds15Ui','mnaUi','assessmentsUi','transfersUi','tinettiUi','assessmentCatalogUi','nrsLegacyUi'].map(name=>`src/components/operator/__tests__/${name}.test.ts`),
  ...['legacyPainDraft','confirmCartella','intakeDraftApi','intakeDraftSession'].map(name=>`src/components/shared/intake/__tests__/${name}.test.ts`),
  'src/components/operator/sections/__tests__/patientSections.test.ts',
];
const args = ['--import','tsx','--import','../scripts/stub-css-loader.mjs','--import','../artifacts/task-validation/po-15-catalogo/frontend/stub-test-assets.mjs','--test',...testFiles];
const result = spawnSync(process.execPath,args,{cwd:'frontend',encoding:'utf8',maxBuffer:16*1024*1024});
const output = result.stdout + result.stderr;
writeFileSync(`${directory}/test-focused.log`,output);
writeFileSync(`${directory}/test-command.json`,JSON.stringify({cwd:'frontend',command:[process.execPath,...args],exitCode:result.status,files:testFiles.length},null,2)+'\n');
console.log(output.split('\n').filter(line=>/tests \d+|pass \d+|fail \d+|cancelled \d+|skipped \d+|todo \d+|✖|error:|AssertionError/.test(line)).join('\n'));
process.exitCode = result.status ?? 1;
