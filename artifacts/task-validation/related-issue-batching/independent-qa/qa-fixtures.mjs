export const repo = 'l2v-hub/ClinicOS';
export const blank = () => ({ schemaVersion: 1, repository: repo, batches: [] });
export const groupFor = (numbers, scope = ['frontend/src/synthetic-filter.ts']) => ({
  title: 'Synthetic related filtering bugs', feature: 'Synthetic filtering',
  rationale: 'Two distinct symptoms share the same affected filter implementation.',
  analysis: 'Synthetic source inspection establishes a shared filtering path.',
  execution: { difficulty: 'medium', mode: 'direct', reason: 'Shared state requires one executor.' },
  issues: numbers, scope, fileMap: numbers.map(issue => ({ issue, files: scope })), separationReason: '',
  acceptance: numbers.map(issue => ({ issue, criteria: [`Synthetic regression ${issue} passes`] })),
  tasks: [{ title: 'Correct shared predicate', files: scope, steps: ['Reproduce each case; fix and regress.'] }],
  verification: [{command:'npm',args:['--prefix','frontend','run','build']},{command:'node',args:['--test','synthetic.test.mjs']}],
  evidence: numbers.map(issue => ({issue,screenshot:`artifacts/task-validation/bug-batch-${Math.min(...numbers)}/evidence/${issue}.png`,trace:`artifacts/task-validation/bug-batch-${Math.min(...numbers)}/evidence/${issue}.zip`,video:''})),
});
export const batchFor = (numbers, overrides = {}) => {
  const {fileMap,separationReason,...plan}=groupFor(numbers);
  return ({
  id:`bug-batch-${Math.min(...numbers)}`, branch:`codex/bug-batch-${Math.min(...numbers)}`,
  issues:numbers, plan, grouping:{fileMap,separationReason}, phase:'planned', implementation:[],reviews:[],sha:null,pr:null,...overrides,
});
};
