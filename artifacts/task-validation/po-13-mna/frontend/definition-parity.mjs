import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import * as definition from '../../../../frontend/src/lib/assessments/mnaItems.ts';
import * as domain from '../../../../frontend/src/lib/assessments/mnaDefinition.ts';
import { parseMnaAnswers } from '../../../../frontend/src/lib/assessments/mnaInputValidation.ts';
import { completeMna } from '../../../../frontend/src/lib/__tests__/mna.fixtures.ts';
const be = 'C:/Workspace/ClinicOSHouse-worktrees/po13-mna-backend/backend/src/assessments/';
const backendDefinition = await import(pathToFileURL(be + 'mna-definition.ts').href);
const backend = await import(pathToFileURL(be + 'mna.ts').href);
const input = await import(pathToFileURL(be + 'mna-input.ts').href);
for (const name of ['MNA_ITEMS','MNA_K_LABELS','MNA_MEASUREMENT_LABELS','MNA_PROVENANCE','MNA_REFERENCES','MNA_COPYRIGHT'])
  assert.deepEqual(definition[name], backendDefinition[name], name);
const scenarios = [domain.emptyMnaAnswers(), completeMna(), completeMna(false)];
for (const item of definition.MNA_ITEMS.filter(item => item.id !== 'K')) for (const option of item.options)
  scenarios.push({ ...completeMna(false), [item.id]: ['F','Q','R'].includes(item.id) ? {method:'category',category:option.value} : option.value });
for (let bits=0;bits<8;bits++) {
  const answers = completeMna(); answers.K = {dairyDaily:!!(bits&4),eggsOrLegumesWeekly:!!(bits&2),meatFishOrPoultryDaily:!!(bits&1)};
  scenarios.push(answers);
  for (const key of Object.keys(answers.K)) scenarios.push({...answers,extent:'screening',K:{...answers.K,[key]:null}});
}
for (const weight of [18.999999,19,20.999999,21,22.999999,23]) {
  const answers=completeMna(); answers.F={method:'measured'}; answers.measurements.weightKg=weight; answers.measurements.heightCm=100;
  scenarios.push(answers);
}
for (const answers of scenarios) {
  assert.deepEqual(parseMnaAnswers(answers), input.parseMnaAnswers(answers));
  assert.deepEqual(domain.mnaCompletion(answers), backend.mnaCompletion(answers));
  assert.deepEqual(domain.mnaResult(answers), backend.mnaResult(answers));
  assert.deepEqual(domain.mnaSnapshotItems(answers), backend.mnaSnapshotItems(answers));
}
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const report={task:'PO-13-frontend',generatedAt:new Date().toISOString(),scenarios:scenarios.length,itemCount:18,scoredOptions:48,kQuestions:3,
  exactLabelsDescriptionsOptionsProvenanceAndCopyright:true,canonicalAnswersCompletionResultsAndSnapshotsMatch:true,
  frontendDefinitionSha256:hash('frontend/src/lib/assessments/mnaItems.ts'),
  backendDefinitionSha256:hash(be+'mna-definition.ts'),backendDomainSha256:hash(be+'mna.ts'),backendInputSha256:hash(be+'mna-input.ts')};
writeFileSync(new URL('definition-parity.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
