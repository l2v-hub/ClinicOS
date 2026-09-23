import { before, after } from 'node:test';
import { randomUUID, createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { startPo05Postgres } from './po05-postgres.mjs';
import { selectLocalParameterDatabase, closeParameterPrisma } from './parameter-database.mjs';
import { startPo05Runtime, po05Actor as actor } from './po05-runtime-api.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(resolve(root, 'backend/package.json'));
export const { PDFDocument } = require('pdf-lib');
export let db: any,
  prisma: any,
  uploads: any,
  lifecycle: any,
  worker: any,
  repo: any,
  pdf: any,
  results: any,
  review: any,
  drafts: any,
  mutations: any,
  archive: any,
  confirm: any,
  cleanup: any,
  runtimeUnit: any;
before(
  async () => {
    db = await startPo05Postgres({
      repositoryRoot: root,
      artifactRoot: resolve(root, 'artifacts/task-validation/po-05-scansioni-lunghe/backend/db'),
    });
    selectLocalParameterDatabase(db.url);
    process.env.AI_PROVIDER = 'mock';
    process.env.AI_REQUEST_TIMEOUT_MS = '3000';
    ({ prisma } = await import('../../backend/src/lib/prisma.js'));
    [
      uploads,
      lifecycle,
      worker,
      repo,
      pdf,
      results,
      review,
      drafts,
      mutations,
      archive,
      confirm,
      cleanup,
      runtimeUnit,
    ] = await Promise.all([
      import('../../backend/src/ai/upload/pages/uploads.js'),
      import('../../backend/src/ai/upload/pages/lifecycle.js'),
      import('../../backend/src/ai/upload/pages/worker.js'),
      import('../../backend/src/ai/upload/pages/repository.js'),
      import('../../backend/src/ai/upload/pages/pdf.js'),
      import('../../backend/src/ai/upload/pages/results.js'),
      import('../../backend/src/ai/upload/pages/review.js'),
      import('../../backend/src/intake/draft-service.js'),
      import('../../backend/src/ai/upload/pages/draft-mutations.js'),
      import('../../backend/src/ai/upload/pages/archive.js'),
      import('../../backend/src/ai/upload/confirm-service.js'),
      import('../../backend/src/ai/upload/pages/cleanup.js'),
      import('../../backend/src/ai/upload/pages/runtime.js'),
    ]);
    await prisma.operator.create({
      data: {
        id: actor.id,
        user: {
          create: {
            email: 'po05@example.invalid',
            passwordHash: 'synthetic',
            fullName: 'Operatore sintetico',
          },
        },
      },
    });
  },
  { timeout: 60000 },
);
after(async () => {
  if (prisma) await closeParameterPrisma(prisma);
  await db?.close();
});
export const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
export const errorCode = (code: string) => (e: any) => e?.code === code;
export async function makePdf(n: number, offset = 0) {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= n; i++) doc.addPage([200 + i + offset, 300]);
  return Buffer.from(await doc.save());
}
export async function session(n = 1) {
  let job = await uploads.createPageSession(randomUUID(), actor.id);
  const bytes = await makePdf(n);
  const response = await uploads.addPageFiles(
    job.id,
    [{ filename: 'source.pdf', declaredMime: 'application/pdf', data: bytes }],
    {
      requestId: randomUUID(),
      expectedRevision: 0,
      groupId: job.manifest.groups[0].id,
      items: [{ clientFileId: randomUUID() }],
    },
  );
  return response.job;
}
export async function withRuntime(respond: any, fn: (runtime: any) => Promise<void>) {
  const rt = await startPo05Runtime({ respond });
  process.env.AI_RUNTIME_URL = rt.url;
  process.env.AI_RUNTIME_SERVICE_TOKEN = rt.token;
  try {
    await fn(rt);
  } finally {
    await rt.close();
  }
}
export async function waitFor(fn: () => Promise<boolean>, timeout = 5000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error('Fixture timed out');
}
export async function resultFor(
  job: any,
  raws: Record<string, string> = {},
  full: Record<string, any> = {},
) {
  const row = await prisma.importJob.findUniqueOrThrow({ where: { id: job.id } });
  const m = row.manifest;
  const groups = m.groups.map((g: any) =>
    results.buildGroupResult(
      m,
      g.id,
      sha(
        Buffer.from(
          JSON.stringify([m.pages.filter((p: any) => p.groupId === g.id), raws[g.id] ?? '']),
        ),
      ),
      raws[g.id] ?? '## DIAGNOSI\nOsservazione sintetica.',
      full[g.id] ?? { anagrafica: { nome: 'Persona', cognome: 'Sintetica' }, cartella: {} },
      'synthetic',
    ),
  );
  const result = results.assembleResult(m, row.manifestRevision, groups);
  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: 'review_ready',
      resultData: result,
      resultSummary: {
        source: result._source,
        reviewHash: review.reviewHash(result),
        unresolvedConflicts: result._conflicts.length,
      },
    },
  });
  return result;
}
export async function twoGroups(job: any) {
  const pages = job.manifest.pages;
  const groups = [job.manifest.groups[0], { id: randomUUID(), label: 'Lettera 2', sortOrder: 1 }];
  return lifecycle.editManifest(job.id, {
    requestId: randomUUID(),
    expectedRevision: job.manifest.revision,
    groups,
    pages: pages.map((p: any, i: number) => ({
      id: p.id,
      groupId: groups[i % 2].id,
      sortOrder: Math.floor(i / 2),
    })),
  });
}

export { actor };
