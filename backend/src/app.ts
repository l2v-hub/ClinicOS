import cors from 'cors';
import express from 'express';
import { adminRouter as adminRoomsRouter, patientAssignmentRouter } from './routes/admin-rooms.js';
import patientRoomOptionsRouter from './routes/patient-room-options.js';
import patientTherapiesRouter from './routes/patient-therapies.js';
import patientsRouter from './routes/patients.js';
import { meRosterOrderRouter, adminRosterOrderRouter } from './routes/roster-order.js';
import appointmentsRouter from './routes/appointments.js';
import therapyRouter from './routes/therapy.js';
import patientIntakeRouter from './routes/patient-intake.js';
import patientDiaryRouter from './routes/patient-diary.js';
import narrativeSectionsRouter from './routes/narrative-sections.js';
import patientDocumentsRouter from './routes/patient-documents.js';
import patientAssessmentsRouter from './routes/patient-assessments.js';
import consegneRouter from './routes/consegne.js';
import operatorsRouter from './routes/operators.js';
import noteRouter from './routes/note.js';
import aiExtractionRouter from './routes/ai-extraction.js';
import aiJobsRouter from './routes/ai-jobs.js';
import intakeDraftsRouter from './routes/intake-drafts.js';
import internalAiRouter from './routes/internal-ai.js';
import assistantPublicRouter from './routes/ai-assistant-public.js';
import voiceRouter from './routes/ai-voice.js';
import aiActionsRouter from './routes/ai-actions.js';
import aiAuditRouter from './routes/ai-audit.js';
import farmaciRouter from './routes/farmaci.js';
import { createToolRouter, isLargeBodyToolInvoke } from './tools/http.js';
import { authzRouter, simulatorRouter } from './routes/authz.js';
import { capabilityRouteGate } from './authz/route-gate.js';
import { authzOf, requireAuthorizationContext } from './authz/request-context.js';
import { effectiveCapabilities, roleDefinition } from './authz/decision.js';
import { simulatorEnabled } from './authz/simulator.js';
import { defaultToolRegistry } from './tools/index.js';
import { createSkillRouter } from './skills/http.js';
import { defaultSkillDeps } from './skills/index.js';
import {
  operatorAuthMode,
  productionDemoAuthEnabled,
  requireOperator,
  type AuthedRequest,
} from './ai/auth.js';

const app = express();
app.disable('x-powered-by');

export function trustedProxyHops(env: NodeJS.ProcessEnv = process.env): number {
  const fallback = env.NODE_ENV === 'production' ? 1 : 0;
  if (env.TRUST_PROXY_HOPS === undefined) return fallback;
  const configured = Number(env.TRUST_PROXY_HOPS);
  return Number.isInteger(configured) && configured >= 0 && configured <= 10
    ? configured
    : fallback;
}

// Railway terminates public traffic at one reverse proxy. Trust exactly that hop in production so
// IP-based abuse controls do not collapse every user into the proxy's address. Direct deployments
// can explicitly set TRUST_PROXY_HOPS=0; deeper trusted proxy chains must opt in deliberately.
const proxyHops = trustedProxyHops();
if (proxyHops > 0) app.set('trust proxy', proxyHops);

// Apply hardening before CORS and body parsing so rejected origins and oversized payloads receive
// the same non-renderable API policy as successful JSON responses.
app.use((_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=(), usb=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ── CORS configuration ─────────────────────────────────────────────────────
//
// Allowed origins:
//  1. Localhost variants for local development
//  2. FRONTEND_URL env var (single URL)
//  3. FRONTEND_URLS env var (comma-separated list)
// Preview origins must be listed explicitly: substring matching would allow an
// attacker-controlled project such as clinicos-evil.vercel.app.
//
// In Railway, set:
//   FRONTEND_URL=https://clinicos-eosin.vercel.app
//   FRONTEND_URLS=https://clinicos-eosin.vercel.app,https://clinicos-el91lyszt-lucalavia-2482s-projects.vercel.app

export function developmentOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  if (env.NODE_ENV === 'production') return [];
  return ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];
}

const staticAllowed = developmentOrigins();

export function configuredOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  return [env.FRONTEND_URL, env.FRONTEND_URLS]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(','))
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const envAllowed = configuredOrigins();

export const allowedOrigins = Array.from(new Set([...staticAllowed, ...envAllowed]));

console.log('CORS allowed origins:', allowedOrigins);

export function isAllowedOrigin(origin: string, allowlist = allowedOrigins): boolean {
  return allowlist.includes(origin);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin)) return callback(null, true);
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);

// Public AI routes can return patient names, clinical summaries, source references and action
// previews. Apply privacy before body parsing and route authentication so successes, denials and
// parser failures cannot be stored by a browser or intermediary cache.
app.use('/ai', (_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});

export const STANDARD_JSON_LIMIT = '512kb';
const standardJsonParser = express.json({ limit: STANDARD_JSON_LIMIT });
app.use((req, res, next) => {
  // The deprecated base64 intake path owns a larger parser behind auth + RBAC in its router.
  // Skipping it here prevents anonymous 8 MB parsing while all current JSON APIs stay bounded.
  // Same for Tool Layer invocations that declare a larger body (base64 uploads): parsed by the
  // tool router after requireOperator.
  if (
    req.path === '/patient-intake' ||
    req.path.startsWith('/patient-intake/') ||
    (req.method === 'POST' && isLargeBodyToolInvoke(defaultToolRegistry, req.path))
  ) {
    next();
    return;
  }
  standardJsonParser(req, res, next);
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/auth/status', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    mode: operatorAuthMode(),
    simulator: simulatorEnabled(operatorAuthMode()),
    temporaryDemo: productionDemoAuthEnabled(),
    syntheticOnly: process.env.DEMO_DATASET_ID === 'synthetic-v1',
    expiresAt: process.env.DEMO_AUTH_EXPIRES_AT || null,
  });
});

app.get('/auth/me', requireOperator, requireAuthorizationContext, (req, res) => {
  const operator = (req as AuthedRequest).operator;
  const authz = authzOf(req)!;
  const role = roleDefinition(authz.policy.document, authz.identity.roleId);
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).json({
    id: operator!.id,
    // Compat role (admin|manager|operatore|operator) kept for existing clients.
    role: operator!.role,
    name: operator!.name,
    // Identity → Role → Capability policy (server-resolved; the client cannot assert any of it).
    appRole: authz.identity.roleId,
    roleLabel: role?.label ?? authz.identity.roleId,
    roleSource: authz.identity.roleSource,
    identitySource: authz.identity.identitySource,
    uiShell:
      role?.uiShell ?? (['admin', 'manager'].includes(operator!.role) ? 'admin' : 'operator'),
    policyVersion: authz.policy.version,
    capabilities: Object.fromEntries(
      effectiveCapabilities(authz.policy.document, authz.identity.roleId).map((cap) => [
        cap.id,
        {
          effect: cap.effect,
          allowed: cap.allowed,
          requiresConfirmation: cap.requiresConfirmation,
        },
      ]),
    ),
    authMode: operatorAuthMode(),
    temporaryDemo: productionDemoAuthEnabled(),
    syntheticOnly: process.env.DEMO_DATASET_ID === 'synthetic-v1',
    expiresAt: process.env.DEMO_AUTH_EXPIRES_AT || null,
  });
});

// Phase 2: Role Simulator (dev identity source) and the Role & Capability policy API.
app.use('/auth/simulator', simulatorRouter);
app.use('/authz', authzRouter);
// Backend enforcement of the capability policy for every catalogued route, before any router.
app.use(capabilityRouteGate);

app.use('/admin', adminRoomsRouter);
app.use('/admin', adminRosterOrderRouter);
app.use('/me', meRosterOrderRouter);
// patientDocumentsRouter va montato PRIMA degli altri router /patients ora protetti da
// `router.use(requireOperator)`: quel middleware, essendo montato senza path, intercetta
// OGNI richiesta sotto /patients (anche quelle che non hanno una route corrispondente in quel
// router), non solo le proprie — esattamente il meccanismo descritto nel commento in cima a
// patient-documents.ts, ma nella direzione opposta. patientDocumentsRouter usa il proprio gate
// (demo/entra) per-route, distinto dal requireOperator header-based degli altri: se venisse
// dopo, una richiesta in modalita' entra (Bearer JWT, senza header X-Operator-Id) prenderebbe
// 401 dal gate generico di un router precedente prima di raggiungere il proprio gate corretto.
app.use('/patients', patientDocumentsRouter);
app.use('/patients', patientAssessmentsRouter);
app.use('/patients', patientRoomOptionsRouter);
app.use('/patients', patientAssignmentRouter);
app.use('/patients', patientTherapiesRouter);
app.use('/patients', patientDiaryRouter);
app.use('/patients', narrativeSectionsRouter);
app.use('/patients', patientsRouter);
// SPEC-015 (US4): real agenda appointments — same service as the Agnos AI actions; DELETE = UI only.
app.use('/appointments', appointmentsRouter);
app.use('/therapy-slots', therapyRouter);
app.use('/patient-intake', patientIntakeRouter);
app.use('/consegne', consegneRouter);
// Fase 1b: real operator CRUD for the admin "Gestione Operatori" screen.
app.use('/operators', operatorsRouter);
// Anagrafica farmaci AIFA (pubblica, nessun dato di paziente): stato, ricerca, ricaricamento.
app.use('/farmaci', farmaciRouter);
app.use('/notes', noteRouter);
app.use('/intake/drafts', intakeDraftsRouter);
app.use('/ai/extraction/jobs', aiJobsRouter);
app.use('/ai/extraction', aiExtractionRouter);
// REQ-040: public operator-facing assistant (operator-auth; runs the gateway in-process, no token).
app.use('/ai/assistant', assistantPublicRouter);
// REQ-041: operator-facing voice write-actions (transcript-only; audio stays client-side).
app.use('/ai/voice', voiceRouter);
// SPEC-015: unified Agnos orchestrator — text + voice commands, CRU-only allowlist (no delete).
app.use('/ai/actions', aiActionsRouter);
// SPEC-015 (US2): persistent AI audit consultation — admin/manager only.
app.use('/ai/audit', aiAuditRouter);
// Phase 1 Tool Layer: catalogued capabilities invocable by an orchestrator (Agno) through the
// same services as the GUI routes, behind requireOperator + authorization/audit hooks.
app.use('/tools', createToolRouter(defaultToolRegistry));
// Phase 3 Skill layer: natural language → skill → workflow → Tool Layer (see .ai-architecture/phase-3-skills).
app.use('/skills', createSkillRouter(defaultSkillDeps));
// REQ-039: internal AI Data Gateway (service-token gated; the model's only data path).
app.use('/internal/ai', internalAiRouter);

interface JsonParserError extends SyntaxError {
  status?: number;
  type?: string;
  body?: unknown;
}

app.use(
  (error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    const parserError = error as JsonParserError;
    if (parserError?.status === 413 || parserError?.type === 'entity.too.large') {
      res.status(413).json({ error: 'Payload JSON troppo grande', code: 'payload_too_large' });
      return;
    }
    if (parserError instanceof SyntaxError && parserError.status === 400 && 'body' in parserError) {
      res.status(400).json({ error: 'JSON non valido', code: 'invalid_json' });
      return;
    }
    next(error);
  },
);

// Phase 6 (error disclosure): last-resort handler. Clients never receive stack traces, internal
// messages, provider details or prompts — only a generic error; diagnostics stay server-side.
app.use(
  (error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('CORS:')) {
      res.status(403).json({ error: 'Origine non consentita', code: 'cors_forbidden' });
      return;
    }
    // Client errors raised by middleware (malformed URI, unsupported charset, payload too large…)
    // keep their 4xx status, still with a generic body.
    const status = Number(
      (error as { status?: unknown; statusCode?: unknown })?.status ??
        (error as { statusCode?: unknown })?.statusCode,
    );
    if (Number.isInteger(status) && status >= 400 && status < 500) {
      res.status(status).json({ error: 'Richiesta non valida', code: 'bad_request' });
      return;
    }
    console.error(
      `[unhandled] ${req.method} ${req.path}: ${error instanceof Error ? error.name : typeof error}: ${message.slice(0, 200)}`,
    );
    res.status(500).json({ error: 'Errore interno del servizio', code: 'internal_error' });
  },
);

export default app;
