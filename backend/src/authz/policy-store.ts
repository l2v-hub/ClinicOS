// Versioned policy store (AuthzPolicyVersion). The active policy is read FRESH on every protected
// operation (one indexed query), so a revocation applies to already-open sessions at their next
// protected call, on every backend instance. No version is ever rewritten: Save inserts a new row
// (draft or active); Apply only moves status draft → active and active → superseded.

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { buildBaselinePolicy } from './baseline.js';
import { diffPolicies, parsePolicyDocument, type PolicyDiff } from './policy-document.js';
import type { ActivePolicy, PolicyDocument } from './types.js';

export class PolicyStoreError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'PolicyStoreError';
  }
}

export interface PolicyActor {
  operatorId: string;
  name?: string;
  roleId: string;
}

const LOCK_KEY = 'clinicos-authz-policy';
let baselineCache: PolicyDocument | null = null;

export function baselinePolicy(): PolicyDocument {
  baselineCache ??= buildBaselinePolicy();
  return structuredClone(baselineCache);
}

export async function loadActivePolicy(): Promise<ActivePolicy> {
  const row = await prisma.authzPolicyVersion.findFirst({
    where: { status: 'active' },
    orderBy: { version: 'desc' },
    select: { version: true, document: true, appliedAt: true },
  });
  if (!row) return { version: 0, document: baselinePolicy(), source: 'baseline', appliedAt: null };
  return {
    version: row.version,
    // Stored documents were validated on save; re-parse defends against manual DB edits.
    document: parsePolicyDocument(row.document),
    source: 'database',
    appliedAt: row.appliedAt?.toISOString() ?? null,
  };
}

async function documentOfVersion(
  tx: Prisma.TransactionClient,
  version: number,
): Promise<PolicyDocument> {
  if (version === 0) return baselinePolicy();
  const row = await tx.authzPolicyVersion.findUnique({
    where: { version },
    select: { document: true },
  });
  if (!row) throw new PolicyStoreError(`Versione ${version} inesistente`, 404, 'version_not_found');
  return parsePolicyDocument(row.document);
}

function summaryOf(diff: PolicyDiff) {
  return {
    grants: diff.grants,
    rolesAdded: diff.rolesAdded,
    rolesRemoved: diff.rolesRemoved,
    rolesChanged: diff.rolesChanged,
    assignments: diff.assignments,
    defaultEffect: diff.defaultEffect,
    counts: {
      grants: diff.grants.length,
      roles: diff.rolesAdded.length + diff.rolesRemoved.length + diff.rolesChanged.length,
      assignments: diff.assignments.length,
    },
  };
}

async function activeVersion(tx: Prisma.TransactionClient): Promise<number> {
  const row = await tx.authzPolicyVersion.findFirst({
    where: { status: 'active' },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  return row?.version ?? 0;
}

async function lock(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${LOCK_KEY}))`;
}

export interface SaveInput {
  document: unknown;
  basedOnVersion: number;
  note?: string;
  apply: boolean;
  actor: PolicyActor;
}

/**
 * Save a new version based on the ACTIVE one (optimistic concurrency: a stale basedOnVersion is a
 * 409). `apply: true` activates it in the same transaction (Save + Apply); otherwise it is a draft.
 */
export async function savePolicyVersion(input: SaveInput) {
  const document = parsePolicyDocument(input.document);
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 500) : undefined;
  return prisma.$transaction(async (tx) => {
    await lock(tx);
    const current = await activeVersion(tx);
    if (input.basedOnVersion !== current) {
      throw new PolicyStoreError(
        `La policy è cambiata nel frattempo (attiva: v${current}, base della modifica: v${input.basedOnVersion}). Ricarica e ripeti.`,
        409,
        'policy_version_conflict',
      );
    }
    const before = await documentOfVersion(tx, current);
    const diff = diffPolicies(before, document);
    if (
      diff.grants.length +
        diff.assignments.length +
        diff.rolesAdded.length +
        diff.rolesRemoved.length +
        diff.rolesChanged.length ===
        0 &&
      !diff.defaultEffect
    ) {
      throw new PolicyStoreError(
        'Nessuna modifica rispetto alla versione attiva',
        400,
        'policy_unchanged',
      );
    }
    const last = await tx.authzPolicyVersion.findFirst({
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (last?.version ?? 0) + 1;
    const now = new Date();
    if (input.apply) {
      await tx.authzPolicyVersion.updateMany({
        where: { status: 'active' },
        data: { status: 'superseded' },
      });
    }
    return tx.authzPolicyVersion.create({
      data: {
        version,
        status: input.apply ? 'active' : 'draft',
        document: document as unknown as Prisma.InputJsonValue,
        basedOnVersion: current,
        changeSummary: summaryOf(diff) as unknown as Prisma.InputJsonValue,
        note: note || null,
        createdById: input.actor.operatorId,
        createdByName: input.actor.name ?? null,
        createdByRole: input.actor.roleId,
        ...(input.apply ? { appliedAt: now, appliedById: input.actor.operatorId } : {}),
      },
      select: versionSelect,
    });
  });
}

/** Activate a draft. Only a draft based on the currently active version can be applied. */
export async function applyPolicyVersion(version: number, actor: PolicyActor) {
  return prisma.$transaction(async (tx) => {
    await lock(tx);
    const draft = await tx.authzPolicyVersion.findUnique({ where: { version } });
    if (!draft)
      throw new PolicyStoreError(`Versione ${version} inesistente`, 404, 'version_not_found');
    if (draft.status !== 'draft')
      throw new PolicyStoreError('Solo una bozza può essere applicata', 409, 'version_not_draft');
    const current = await activeVersion(tx);
    if (draft.basedOnVersion !== current) {
      throw new PolicyStoreError(
        `La bozza v${version} è basata su v${draft.basedOnVersion}, ma la policy attiva è v${current}. Crea una nuova bozza.`,
        409,
        'stale_draft',
      );
    }
    parsePolicyDocument(draft.document);
    await tx.authzPolicyVersion.updateMany({
      where: { status: 'active' },
      data: { status: 'superseded' },
    });
    return tx.authzPolicyVersion.update({
      where: { version },
      data: { status: 'active', appliedAt: new Date(), appliedById: actor.operatorId },
      select: versionSelect,
    });
  });
}

const versionSelect = {
  version: true,
  status: true,
  basedOnVersion: true,
  changeSummary: true,
  note: true,
  createdById: true,
  createdByName: true,
  createdByRole: true,
  createdAt: true,
  appliedAt: true,
  appliedById: true,
} as const;

export async function listPolicyVersions(limit = 50) {
  return prisma.authzPolicyVersion.findMany({
    orderBy: { version: 'desc' },
    take: Math.min(Math.max(limit, 1), 200),
    select: versionSelect,
  });
}

export async function getPolicyVersion(version: number) {
  if (version === 0) {
    return { version: 0, status: 'baseline', document: baselinePolicy() };
  }
  const row = await prisma.authzPolicyVersion.findUnique({
    where: { version },
    select: { ...versionSelect, document: true },
  });
  if (!row) throw new PolicyStoreError(`Versione ${version} inesistente`, 404, 'version_not_found');
  return row;
}
