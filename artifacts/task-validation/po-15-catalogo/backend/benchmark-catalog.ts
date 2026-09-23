import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
import { prisma } from '../../../../backend/src/lib/prisma.js';
import { seed, actor, patient, input } from '../../../../backend/src/assessments/__tests__/fixture.js';
import { transfersInput, completeTransfers } from '../../../../backend/src/assessments/__tests__/transfers-fixture.js';
import { tinettiInput, tinettiAnswers } from '../../../../backend/src/assessments/__tests__/tinetti-fixture.js';
import { mnaInput, mnaAnswers } from '../../../../backend/src/assessments/__tests__/mna-fixture.js';
import { gds15Input, gds15Answers } from '../../../../backend/src/assessments/__tests__/gds15-fixture.js';
import { createAssessment, finalizeAssessment } from '../../../../backend/src/assessments/service.js';
import { currentAssessment } from '../../../../backend/src/assessments/current.js';
import { assessmentCatalog, CATALOG_FORMS } from '../../../../backend/src/assessments/catalog.js';
const folder = 'artifacts/task-validation/po-15-catalogo/backend/';
const hash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const sourceBytes = await readFile(folder + 'source-manifest.json'), source = JSON.parse(sourceBytes.toString());
const originalFiles = [];
for (const path of ['backend/src/assessments/current.ts', 'backend/src/assessments/access.ts']) {
  const original = execFileSync('git', ['show', `${source.baseline}:${path}`], { encoding: 'utf8', windowsHide: true });
  const current = await readFile(path, 'utf8');
  assert.equal(current.replace(/\r\n/g, '\n'), original.replace(/\r\n/g, '\n'));
  originalFiles.push({ path, baselineGitBytesSha256: hash(original), executedBytesSha256: hash(current) });
}
try {
  await seed();
  const notes = 'Nota sintetica per benchmark. '.repeat(160).slice(0, 4000);
  for (const body of [input(), transfersInput({ answers: { ...completeTransfers(), notes } }),
    tinettiInput({ answers: { ...tinettiAnswers(), notes } }), mnaInput({ answers: { ...mnaAnswers(), notes } }),
    gds15Input({ answers: { ...gds15Answers(), notes } })]) {
    const draft = (await createAssessment(patient, body, actor)).assessment;
    await finalizeAssessment(patient, draft.id, { requestId: randomUUID(), expectedVersion: 1 }, actor);
  }
  const created = (await createAssessment(patient, input(), actor)).assessment;
  const { finalSnapshot: _sqlNull, ...template } = await prisma.patientAssessment.findUniqueOrThrow({ where: { id: created.id } });
  await prisma.patientAssessment.createMany({ data: Array.from({ length: 249 }, () => ({ ...template, id: randomUUID(), requestId: randomUUID() })) });
  const baseline = async () => {
    const rows = [];
    for (const form of CATALOG_FORMS) rows.push(await currentAssessment(patient, { type: form.type }, actor));
    return rows;
  };
  const candidate = () => assessmentCatalog(patient, {}, actor);
  const baselineResult = await baseline(), candidateResult = await candidate();
  assert.deepEqual(candidateResult.items.map(row => row.latestFinal?.id), baselineResult.map(row => row?.id));
  assert.equal(candidateResult.items[0].ownDraftCount, 250);
  for (let warm = 0; warm < 2; warm++) { await baseline(); await candidate(); }
  const baselineMs = [], candidateMs = [];
  for (let sample = 0; sample < 12; sample++) {
    const ordered = sample % 2 ? [[candidate, candidateMs], [baseline, baselineMs]] : [[baseline, baselineMs], [candidate, candidateMs]];
    for (const [action, times] of ordered as [() => Promise<unknown>, number[]][]) {
      const started = performance.now(); await action(); times.push(performance.now() - started);
    }
  }
  const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return (sorted[5] + sorted[6]) / 2; };
  const baselineBytes = Buffer.byteLength(JSON.stringify(baselineResult)), candidateBytes = Buffer.byteLength(JSON.stringify(candidateResult));
  const result = {
    sourceManifestSha256: hash(sourceBytes), sourceTreeSha256: source.sourceTreeSha256, inputTreeSha256: source.inputTreeSha256,
    recordedAt: new Date().toISOString(), baselineSource: { commit: source.baseline, unchangedExecutedFiles: originalFiles },
    candidateSource: source.sourcePaths.filter((row: {path: string}) => row.path.endsWith('/catalog.ts')),
    workload: { patientAssessments: 255, finalForms: 5, ownPainadDrafts: 250, notesPerNonPainadFinal: 4000, samples: 12, warmups: 2, alternatingOrder: true },
    environment: { node: process.version, database: 'synthetic native PostgreSQL loopback', networkRequests: 0, compiledBuildUsed: false },
    baseline: { operation: 'Five existing currentAssessment calls', serviceCalls: 5, payloadBytes: baselineBytes, medianMs: median(baselineMs), samplesMs: baselineMs },
    candidate: { operation: 'One assessmentCatalog call', serviceCalls: 1, metadataQueries: 1, patientLockQueries: 1, payloadBytes: candidateBytes, medianMs: median(candidateMs), samplesMs: candidateMs },
    sameLatestFinalIds: true, ownDraftCountExact: true, payloadReductionPercent: (1 - candidateBytes / baselineBytes) * 100,
    limitations: ['Synthetic service-level comparison, not a production latency claim or HTTP benchmark.', 'Baseline intentionally obtains full current assessments for five types; candidate returns catalog metadata plus own-draft metadata.', 'No real patient data or PDF generation is part of this benchmark; all fixtures are synthetic.'],
  };
  await writeFile(folder + 'catalog-benchmark.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ benchmarkPassed: true, baselineMedianMs: result.baseline.medianMs, candidateMedianMs: result.candidate.medianMs, baselineBytes, candidateBytes, inputTreeSha256: source.inputTreeSha256 }));
} finally { await prisma.$disconnect(); }
