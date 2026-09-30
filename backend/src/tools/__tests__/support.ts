// Shared fixtures for Tool Layer tests. Real Postgres (the suite's DATABASE_URL), unique ids per
// run, explicit cleanup. Not a *.test.ts file, so the runner does not execute it directly.

import express from 'express';
import type { Router } from 'express';
import type { Server } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import { setAuditHook, type ToolAuditEvent } from '../hooks.js';
import type { InvokeContext } from '../registry.js';

export const runId = `tl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export interface TestOperator {
  operatorId: string;
  userId: string;
  role: string;
  name: string;
}

/** Creates User + Operator (ruolo = professional title) and returns a tool identity. */
export async function createOperator(
  label: string,
  role: 'operatore' | 'admin' = 'operatore',
  ruolo = 'infermiere',
): Promise<TestOperator> {
  const operatorId = `${runId}-${label}`;
  const name = `Tool ${label}`;
  const user = await prisma.user.create({
    data: {
      email: `${operatorId}@example.test`,
      passwordHash: 'TEST_ONLY_NOT_A_REAL_HASH',
      fullName: name,
      role: role === 'admin' ? 'MANAGER' : 'OPERATOR',
      operator: { create: { id: operatorId, ruolo } },
    },
  });
  return { operatorId, userId: user.id, role, name };
}

export async function createPatient(label: string, owner: TestOperator) {
  return prisma.patient.create({
    data: {
      medicalRecordNumber: `MRN-${runId}-${label}`,
      firstName: 'Paziente',
      lastName: `Tool ${label}`,
      dateOfBirth: new Date('1940-05-06T00:00:00.000Z'),
      sex: 'F',
      registeredById: owner.operatorId,
    },
  });
}

export function ctxOf(op: TestOperator, origin: InvokeContext['origin'] = 'test'): InvokeContext {
  return { identity: { operatorId: op.operatorId, role: op.role, name: op.name }, origin };
}

/** HTTP headers accepted by `requireOperator` in AUTH_MODE=demo (set by the test runner). */
export function demoHeaders(op: TestOperator): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Operator-Id': op.operatorId,
    'X-Operator-Role': op.role,
  };
}

export async function cleanup(operators: TestOperator[], patientIds: string[]): Promise<void> {
  for (const id of patientIds) await prisma.patient.delete({ where: { id } }).catch(() => {});
  for (const op of operators)
    await prisma.user.delete({ where: { id: op.userId } }).catch(() => {});
}

/** Capture audit events instead of writing AiAuditEvent rows. Returns the captured list. */
export function captureAudit(): ToolAuditEvent[] {
  const events: ToolAuditEvent[] = [];
  setAuditHook((event) => events.push(event));
  return events;
}

export function restoreAudit(): void {
  setAuditHook(null);
}

/** Mount one existing router on an ephemeral port (GUI path for parity checks). */
export async function serve(
  mount: string,
  router: Router,
): Promise<{ base: string; close: () => Promise<void> }> {
  const app = express();
  app.use(express.json());
  app.use(mount, router);
  let server!: Server;
  const base = await new Promise<string>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`);
    });
  });
  return { base, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
}
