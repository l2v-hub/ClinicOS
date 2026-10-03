// Tool Layer contract: pipeline order, error model, hooks, HTTP surface (/tools) on the real app.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import app from '../../app.js';
import { createToolRegistry } from '../registry.js';
import { ToolError, toToolErrorShape } from '../errors.js';
import { legacyRoleAuthorization, setAuthorizationHook } from '../hooks.js';
import type { ToolDefinition } from '../types.js';
import {
  captureAudit,
  cleanup,
  createOperator,
  createPatient,
  ctxOf,
  demoHeaders,
  restoreAudit,
  type TestOperator,
} from './support.js';

// #389: the default resident scope is facility-wide. This suite exercises the scope-enforcement
// plumbing (out-of-scope residents denied), so it pins the restricted, still-supported mode.
process.env.RESIDENT_SCOPE_CONFIG ??= JSON.stringify({ fallback: 'registered_by_me' });

const calls: string[] = [];
const echo: ToolDefinition = {
  name: 'test.echo',
  domain: 'test',
  kind: 'read',
  auditKind: 'read',
  description: 'echo',
  sensitivity: 'low',
  inputSchema: {
    type: 'object',
    required: ['patientId'],
    properties: { patientId: { type: 'string' }, body: { type: 'object' } },
    additionalProperties: false,
  },
  patientScoped: true,
  entryPoint: 'n/a',
  services: [],
  handler: async (input, ctx) => {
    calls.push(String(input.patientId));
    return { patientId: input.patientId, by: ctx.identity.operatorId, origin: ctx.origin };
  },
};
const adminOnly: ToolDefinition = {
  ...echo,
  name: 'test.admin_only',
  patientScoped: false,
  inputSchema: { type: 'object' },
  legacyRoles: ['admin', 'manager'],
  handler: async () => 'done',
};
const failing: ToolDefinition = {
  ...adminOnly,
  name: 'test.failing',
  legacyRoles: undefined,
  handler: async () => {
    const error = new Error('Documento in conflitto') as Error & { status: number; code: string };
    error.status = 409;
    error.code = 'assessment_document_immutable';
    throw error;
  },
};
const crashing: ToolDefinition = {
  ...failing,
  name: 'test.crashing',
  handler: async () => {
    throw new Error('dettaglio clinico riservato');
  },
};

const registry = createToolRegistry([echo, adminOnly, failing, crashing]);
let operator: TestOperator;
let admin: TestOperator;
let other: TestOperator;
let ownPatient = '';
let otherPatient = '';
let audit: ReturnType<typeof captureAudit>;
let server: Server;
let base = '';

before(async () => {
  // Synthetic `test.*` tools are not in the capability catalog: exercise the pipeline with the
  // Phase 1 legacy hook (the policy hook would deny unknown capabilities — covered in authz tests).
  setAuthorizationHook(legacyRoleAuthorization);
  audit = captureAudit();
  operator = await createOperator('core-op');
  admin = await createOperator('core-admin', 'admin', 'coordinatore');
  other = await createOperator('core-other');
  ownPatient = (await createPatient('core-own', operator)).id;
  otherPatient = (await createPatient('core-other', other)).id;
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
      resolve();
    });
  });
});

after(async () => {
  restoreAudit();
  setAuthorizationHook(null);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await cleanup([operator, admin, other], [ownPatient, otherPatient]);
});

test('patient-scoped tool: own patient reaches the handler, foreign patient never does', async () => {
  const own = await registry.invoke('test.echo', { patientId: ownPatient }, ctxOf(operator));
  assert.equal(own.ok, true);
  const foreign = await registry.invoke('test.echo', { patientId: otherPatient }, ctxOf(operator));
  assert.equal(foreign.ok, false);
  if (!foreign.ok) assert.equal(foreign.error.domainCode, 'patient_not_found');
  assert.deepEqual(calls, [ownPatient]);
  const global = await registry.invoke('test.echo', { patientId: otherPatient }, ctxOf(admin));
  assert.equal(global.ok, true, 'admin/manager keep facility-wide patient scope (legacy rule)');
});

test('legacy authorization mirrors requireRole(admin, manager)', async () => {
  const denied = await registry.invoke('test.admin_only', {}, ctxOf(operator));
  assert.equal(denied.ok, false);
  if (!denied.ok) {
    assert.equal(denied.error.code, 'forbidden');
    assert.equal(denied.error.status, 403);
  }
  const allowed = await registry.invoke('test.admin_only', {}, ctxOf(admin));
  assert.equal(allowed.ok, true);
  assert.ok(audit.some((e) => e.tool === 'test.admin_only' && e.outcome === 'denied'));
});

test('authorization hook is replaceable (Phase 2 anchor) and fails closed on error', async () => {
  setAuthorizationHook(() => ({ allowed: false, code: 'policy_denied', reason: 'Negato' }));
  const denied = await registry.invoke('test.echo', { patientId: ownPatient }, ctxOf(operator));
  assert.equal(denied.ok, false);
  if (!denied.ok) assert.equal(denied.error.domainCode, 'policy_denied');
  setAuthorizationHook(() => {
    throw new Error('policy store down');
  });
  const broken = await registry.invoke('test.echo', { patientId: ownPatient }, ctxOf(operator));
  assert.equal(broken.ok, false);
  if (!broken.ok) assert.equal(broken.error.domainCode, 'authorization_unavailable');
  setAuthorizationHook(legacyRoleAuthorization);
});

test('error model: status-carrying domain errors keep status; unknown errors never leak text', async () => {
  const conflict = await registry.invoke('test.failing', {}, ctxOf(operator));
  assert.equal(conflict.ok, false);
  if (!conflict.ok) {
    assert.equal(conflict.error.code, 'conflict');
    assert.equal(conflict.error.status, 409);
    assert.equal(conflict.error.domainCode, 'assessment_document_immutable');
  }
  const crash = await registry.invoke('test.crashing', {}, ctxOf(operator));
  assert.equal(crash.ok, false);
  if (!crash.ok) {
    assert.equal(crash.error.code, 'internal');
    assert.ok(!crash.error.message.includes('clinico'));
  }
  class PatientPageInputError extends Error {}
  assert.equal(
    toToolErrorShape(new PatientPageInputError('limite non valido')).code,
    'invalid_input',
  );
  assert.equal(toToolErrorShape({ code: 'P2025' }).code, 'not_found');
  assert.equal(new ToolError('forbidden', 'x').status, 403);
});

test('schema rejects unexpected envelope keys before any handler/scope work', async () => {
  const result = await registry.invoke(
    'test.echo',
    { patientId: ownPatient, identity: { role: 'admin' } },
    ctxOf(operator),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'invalid_input');
});

test('HTTP /tools: identity from the auth gate only; discovery and invocation on the real app', async () => {
  const anonymous = await fetch(`${base}/tools`);
  assert.equal(anonymous.status, 401);

  const listed = await fetch(`${base}/tools`, { headers: demoHeaders(operator) });
  assert.equal(listed.status, 200);
  const { tools } = (await listed.json()) as { tools: { name: string; inputSchema: unknown }[] };
  assert.ok(tools.some((t) => t.name === 'consegne.overview'));
  assert.ok(tools.every((t) => typeof t.inputSchema === 'object'));

  const invoked = await fetch(`${base}/tools/consegne.overview/invoke`, {
    method: 'POST',
    headers: { ...demoHeaders(operator), 'X-Tool-Origin': 'ai' },
    body: JSON.stringify({ input: {}, requestId: 'core-http-1' }),
  });
  assert.equal(invoked.status, 200);
  const envelope = (await invoked.json()) as {
    ok: boolean;
    requestId: string;
    data: { scope: string };
  };
  assert.equal(envelope.ok, true);
  assert.equal(envelope.requestId, 'core-http-1');
  assert.equal(envelope.data.scope, 'operator');
  const event = audit.find((e) => e.requestId === 'core-http-1');
  assert.equal(event?.origin, 'ai');
  assert.equal(event?.operatorId, operator.operatorId);

  const missing = await fetch(`${base}/tools/nope.nope/invoke`, {
    method: 'POST',
    headers: demoHeaders(operator),
    body: JSON.stringify({ input: {} }),
  });
  assert.equal(missing.status, 404);
});

test('HTTP /tools: large-body tools parse after auth; other tools keep the 512 kB limit', async () => {
  // ~1 MB PDF: above the standard JSON limit, below the 15 MB upload limit.
  const pdf = Buffer.concat([
    Buffer.from('%PDF-1.4\n', 'ascii'),
    Buffer.alloc(1024 * 1024, 0x20),
    Buffer.from('\n%%EOF\n', 'ascii'),
  ]);
  const payload = JSON.stringify({
    input: {
      patientId: ownPatient,
      body: {
        fileName: 'scansione.pdf',
        mimeType: 'application/pdf',
        documentType: 'rx',
        base64: pdf.toString('base64'),
      },
    },
  });

  const anonymous = await fetch(`${base}/tools/documents.upload/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  assert.equal(anonymous.status, 401, 'large body is never parsed before authentication');

  const uploaded = await fetch(`${base}/tools/documents.upload/invoke`, {
    method: 'POST',
    headers: demoHeaders(operator),
    body: payload,
  });
  assert.equal(uploaded.status, 200);
  const envelope = (await uploaded.json()) as {
    ok: boolean;
    data: { document: { id: string; sizeBytes?: number } };
  };
  assert.equal(envelope.ok, true);

  const tooLargeForOthers = await fetch(`${base}/tools/consegne.overview/invoke`, {
    method: 'POST',
    headers: demoHeaders(operator),
    body: JSON.stringify({ input: {}, padding: 'x'.repeat(600 * 1024) }),
  });
  assert.equal(tooLargeForOthers.status, 413);
});
