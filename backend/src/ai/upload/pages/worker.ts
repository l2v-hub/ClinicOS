import { randomUUID } from 'node:crypto';
import { prisma } from '../../../lib/prisma.js';
import { classifyImportFailure, requireOcrText } from '../import-failure.js';
import {
  ImportSessionError,
  hash,
  jsonInput,
  manifest,
  object,
  orderPages,
  type Tx,
} from './model.js';
import { lockJob } from './repository.js';
import { extractionConfig, groupHash, OCR_PROMPT, OCR_SCHEMA, pageHash } from './inputs.js';
import { createPageReader } from './pdf.js';
import { validateExtraction } from '../../extraction-validate.js';
import { executeRuntimeUnit, type RuntimeUnit } from './runtime.js';
import { assembleResult, buildGroupResult, type GroupResult } from './results.js';
import { reviewHash } from './review.js';
const LEASE_MS = 60000;
export class SupersededRun extends Error {}
export async function reclaimPageRuns() {
  const result = await prisma.importJob.updateMany({
    where: { status: 'processing_pages', leaseExpiresAt: { lt: new Date() } },
    data: { status: 'queued_pages', runToken: null, leaseExpiresAt: null },
  });
  return result.count;
}
export async function runNextPageJob(options: { pollMs?: number } = {}) {
  await reclaimPageRuns();
  const next = await prisma.importJob.findFirst({
    where: { status: 'queued_pages' },
    orderBy: { updatedAt: 'asc' },
    select: { id: true, manifestRevision: true },
  });
  if (!next) return false;
  const token = randomUUID();
  const claimed = await prisma.importJob.updateMany({
    where: { id: next.id, status: 'queued_pages', manifestRevision: next.manifestRevision },
    data: {
      status: 'processing_pages',
      runToken: token,
      runRevision: next.manifestRevision,
      leaseExpiresAt: new Date(Date.now() + LEASE_MS),
      startedAt: new Date(),
      stage: 'ocr',
    },
  });
  if (claimed.count !== 1) return false;
  await runClaimedPageJob(next.id, token, next.manifestRevision, options);
  return true;
}
export async function runClaimedPageJob(
  jobId: string,
  token: string,
  sourceRevision: number,
  options: { pollMs?: number } = {},
) {
  const cfg = extractionConfig();
  let lost = false;
  const reader = createPageReader((documentId) =>
    prisma.importDocument.findFirstOrThrow({ where: { id: documentId, jobId } }),
  );
  async function fenced<T>(fn: (tx: Tx) => Promise<T>) {
    if (lost) throw new SupersededRun();
    return prisma.$transaction(
      async (tx) => {
        const job = await lockJob(tx, jobId);
        if (
          job.runToken !== token ||
          job.manifestRevision !== sourceRevision ||
          job.runRevision !== sourceRevision ||
          job.status !== 'processing_pages' ||
          !job.leaseExpiresAt ||
          job.leaseExpiresAt.getTime() <= Date.now()
        ) {
          lost = true;
          throw new SupersededRun();
        }
        return fn(tx);
      },
      { timeout: 30000 },
    );
  }
  const current = async () => {
    await fenced(async () => undefined);
  };
  const heartbeat = setInterval(() => {
    void prisma.importJob
      .updateMany({
        where: {
          id: jobId,
          runToken: token,
          manifestRevision: sourceRevision,
          status: 'processing_pages',
          leaseExpiresAt: { gt: new Date() },
        },
        data: {
          leaseExpiresAt: new Date(Date.now() + LEASE_MS),
          expiresAt: new Date(Date.now() + cfg.cfg.jobRetentionMin * 60000),
        },
      })
      .then((r) => {
        if (r.count !== 1) lost = true;
      })
      .catch(() => {
        lost = true;
      });
  }, 10000);
  heartbeat.unref?.();
  async function unit(
    kind: 'ocr' | 'extraction',
    key: string,
    inputHash: string,
    make: () => Promise<
      Omit<RuntimeUnit, 'runtimeJobId' | 'runtimeAttempt' | 'externalId' | 'inputHash'>
    >,
    validate: (value: unknown, model: string) => unknown,
  ) {
    const unique = { jobId, kind, unitKey: key, inputHash };
    const previous = await prisma.importProcessingUnit.findUnique({
      where: { jobId_kind_unitKey_inputHash: unique },
    });
    if (previous?.status === 'completed') return previous.result;
    if (previous?.status === 'failed') return null;
    await fenced(async (tx) => {
      await tx.importProcessingUnit.upsert({
        where: { jobId_kind_unitKey_inputHash: unique },
        create: { ...unique, status: 'running' },
        update: { status: 'running' },
      });
    });
    try {
      const input = await make();
      await current();
      const response = await executeRuntimeUnit(
        {
          ...input,
          inputHash,
          externalId: `po05:${jobId}:${kind}:${key}:${inputHash}`,
          runtimeJobId: previous?.runtimeJobId ?? null,
          runtimeAttempt: previous?.runtimeAttempt ?? 0,
        },
        async (runtimeJobId, runtimeAttempt) => {
          await fenced(async (tx) => {
            await tx.importProcessingUnit.update({
              where: { jobId_kind_unitKey_inputHash: unique },
              data: { runtimeJobId, runtimeAttempt },
            });
          });
        },
        current,
        options.pollMs,
      );
      const result = validate(response.data, response.model);
      await fenced(async (tx) => {
        await tx.importProcessingUnit.update({
          where: { jobId_kind_unitKey_inputHash: unique },
          data: {
            status: 'completed',
            result: jsonInput(result),
            outputHash: hash(result),
            errorCode: null,
            errorMessage: null,
          },
        });
      });
      return result;
    } catch (e) {
      if (e instanceof SupersededRun) throw e;
      const code = e instanceof ImportSessionError ? e.code : classifyImportFailure(e).code;
      const message =
        e instanceof ImportSessionError ? e.message : classifyImportFailure(e).message;
      await fenced(async (tx) => {
        await tx.importProcessingUnit.update({
          where: { jobId_kind_unitKey_inputHash: unique },
          data: { status: 'failed', errorCode: code, errorMessage: message },
        });
      });
      return null;
    }
  }
  try {
    const job = await prisma.importJob.findUniqueOrThrow({
      where: { id: jobId },
      select: {
        manifest: true,
        documents: {
          select: { id: true, sha256: true, sizeBytes: true, filename: true, mimeType: true },
        },
      },
    });
    const m = manifest(job.manifest);
    const shas = new Map(job.documents.map((d) => [d.id, d.sha256]));
    const ocr = new Map<string, string>();
    let failed = false;
    for (const p of orderPages(m)) {
      await current();
      const inputHash = pageHash(p, shas.get(p.documentId) ?? '');
      const result = await unit(
        'ocr',
        p.id,
        inputHash,
        async () => {
          const doc = job.documents.find((d) => d.id === p.documentId);
          if (!doc)
            throw new ImportSessionError(422, 'source_missing', 'Documento non disponibile');
          const data = await reader.read(doc, p.sourcePageNumber);
          return {
            mode: 'ocr',
            files: [
              {
                filename: `page-${p.id}.${doc.mimeType === 'application/pdf' ? 'pdf' : doc.mimeType === 'image/jpeg' ? 'jpg' : 'png'}`,
                mime_type: doc.mimeType,
                content_base64: data.toString('base64'),
                sort_order: 0,
              },
            ],
            schema: OCR_SCHEMA,
            prompt: OCR_PROMPT,
          };
        },
        (value) => ({ rawText: requireOcrText(value) }),
      );
      if (result) ocr.set(p.id, String(object(result).rawText));
      else failed = true;
    }
    await fenced(async (tx) => {
      await tx.importJob.update({ where: { id: jobId }, data: { stage: 'extraction' } });
    });
    const groups: GroupResult[] = [];
    for (const g of [...m.groups].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const pages = orderPages(m, g.id);
      if (pages.some((p) => !ocr.has(p.id))) {
        failed = true;
        continue;
      }
      const rawText = pages.map((p) => ocr.get(p.id)!).join('\n\n');
      const inputHash = groupHash(
        m,
        g.id,
        shas,
        cfg.digest,
        new Map(pages.map((p) => [p.id, hash({ rawText: ocr.get(p.id)! })])),
      );
      const result = await unit(
        'extraction',
        g.id,
        inputHash,
        async () => ({
          mode: 'extraction',
          files: [],
          schema: cfg.schema,
          prompt: `${cfg.prompt}\n\nTESTO INTEGRALE DELLA LETTERA, PAGINE IN ORDINE:\n${rawText}`,
        }),
        (raw, model) => {
          if (!validateExtraction(raw).valid)
            throw new ImportSessionError(
              422,
              'extraction_schema',
              'I dati estratti non rispettano il formato clinico previsto. Verifica la lettera.',
            );
          return buildGroupResult(m, g.id, inputHash, rawText, raw, model);
        },
      );
      if (result) {
        const cached = result as GroupResult;
        groups.push(
          buildGroupResult(m, g.id, inputHash, cached.rawText, cached._full, cached.model),
        );
      } else failed = true;
    }
    await fenced(async (tx) => {
      if (failed || groups.length !== m.groups.length) {
        await tx.importJob.update({
          where: { id: jobId },
          data: {
            status: 'retryable_error',
            stage: 'error',
            runToken: null,
            leaseExpiresAt: null,
            error:
              'Alcune pagine o lettere richiedono un nuovo tentativo. Le altre sono conservate.',
          },
        });
        return;
      }
      const result = assembleResult(m, sourceRevision, groups);
      await tx.importJob.update({
        where: { id: jobId },
        data: {
          status: 'review_ready',
          stage: 'completed',
          resultData: jsonInput(result),
          resultSummary: jsonInput({
            source: result._source,
            unresolvedConflicts: result._conflicts.length,
            reviewHash: reviewHash(result),
          }),
          model: [...new Set(groups.map((g) => g.model))].join(', '),
          runToken: null,
          leaseExpiresAt: null,
          error: null,
        },
      });
    });
  } catch (e) {
    if (!(e instanceof SupersededRun) && !lost) {
      await fenced(async (tx) => {
        await tx.importJob.update({
          where: { id: jobId },
          data: {
            status: 'retryable_error',
            stage: 'error',
            runToken: null,
            leaseExpiresAt: null,
            error: 'Elaborazione interrotta. Le pagine già elaborate sono conservate.',
          },
        });
      }).catch(() => {});
    }
  } finally {
    clearInterval(heartbeat);
    reader.clear();
  }
}
