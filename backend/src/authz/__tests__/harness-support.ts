// Shared support for Phase 2 end-to-end tests: the REAL app over HTTP, Role Simulator sessions,
// real Postgres. No privileged shortcut: every call goes through requireOperator → policy → gate.
// Not a *.test.ts file (the runner does not execute it directly).

import type { Server } from 'node:http';
import { prisma } from '../../lib/prisma.js';

// The simulator is the identity source of these tests (dev-only flag, read at request time).
process.env.ROLE_SIMULATOR_ENABLED = 'true';

export const runTag = `az-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export interface Session {
  identityId: string;
  token: string;
}

export async function startApp(): Promise<{ base: string; close: () => Promise<void> }> {
  const { default: app } = await import('../../app.js');
  let server!: Server;
  const base = await new Promise<string>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`);
    });
  });
  return { base, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
}

export async function login(base: string, identityId: string): Promise<Session> {
  const response = await fetch(`${base}/auth/simulator/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identityId }),
  });
  if (response.status !== 201) throw new Error(`login ${identityId}: ${response.status}`);
  const body = (await response.json()) as { token: string };
  return { identityId, token: body.token };
}

export async function call(
  base: string,
  session: Session | null,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: any }> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body */
  }
  return { status: response.status, body: parsed };
}

export async function createPatientOwnedBy(operatorId: string, label: string) {
  return prisma.patient.create({
    data: {
      medicalRecordNumber: `MRN-${runTag}-${label}`,
      firstName: 'Paziente',
      lastName: `Authz ${label}`,
      dateOfBirth: new Date('1938-03-04T00:00:00.000Z'),
      sex: 'M',
      registeredById: operatorId,
    },
  });
}

/** AiAuditEvent writes are fire-and-forget: poll until the expected row is persisted. */
export async function waitForAudit(where: Record<string, unknown>, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const row = await prisma.aiAuditEvent.findFirst({ where, orderBy: { createdAt: 'desc' } });
    if (row || Date.now() > deadline) return row;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
