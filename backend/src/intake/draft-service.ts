import { prisma } from '../lib/prisma.js';

// ── Patient Intake Draft Service (F3 EPIC #120 / Issue #125) ─────────────────
// CRUD + autosave for PatientIntakeDraft. patchDraft shallow-merges top-level
// keys of `patch` into the stored `data` JSON (last-write-wins per section).

export interface CreateDraftOpts {
  createdById?: string;
  source?: 'manual' | 'import';
  importJobId?: string;
}

export async function createDraft(opts: CreateDraftOpts = {}) {
  return prisma.patientIntakeDraft.create({
    data: {
      status: 'draft',
      source: opts.source ?? 'manual',
      createdById: opts.createdById,
      importJobId: opts.importJobId,
      data: {},
    },
  });
}

export async function getDraft(id: string) {
  return prisma.patientIntakeDraft.findUnique({ where: { id } });
}

export async function patchDraft(id: string, patch: Record<string, unknown>) {
  const current = await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id } });
  const existingData = (current.data ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...existingData, ...patch };
  return prisma.patientIntakeDraft.update({
    where: { id },
    data: { data: merged as Parameters<typeof prisma.patientIntakeDraft.update>[0]['data']['data'] },
  });
}

export async function listDrafts(createdById?: string) {
  return prisma.patientIntakeDraft.findMany({
    where: {
      status: 'draft',
      ...(createdById ? { createdById } : {}),
    },
    orderBy: { updatedAt: 'desc' },
  });
}
