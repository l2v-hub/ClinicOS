// Authorization for the AI import flow (REQ-019).
//
// Production identity is verified through Entra/OIDC and resolved server-side.
// Self-declared operator headers remain available only in explicit/non-production
// demo mode so local fixtures keep working without becoming a production bypass.

import type { NextFunction, Request, Response } from 'express';
import { entraConfig, requireEntraOperator } from '../lib/entra-auth.js';
import {
  SIMULATOR_TOKEN_PREFIX,
  simulatedIdentity,
  simulatorEnabled,
  verifySimulatorToken,
} from '../authz/simulator.js';
import type { ResolvedIdentity } from '../authz/types.js';

export interface Operator {
  id: string;
  /**
   * Compat role string read by the pre-existing services (data scope: admin|manager = facility).
   * Resolved server-side from the active policy (assigned role) or kept as verified (legacy).
   */
  role: string;
  name?: string;
  /** Role of the Identity → Role → Capability policy (e.g. doctor, nurse). Server-resolved. */
  appRole?: string;
}

// Accept the app's role values plus canonical names; everything else is forbidden.
const ALLOWED_ROLES = new Set(['operatore', 'admin', 'operator', 'manager']);

interface DemoIdentity extends Operator {
  aliases: readonly string[];
}

// Production demo access is intentionally limited to two synthetic seed identities. The role is
// server-owned: changing X-Operator-Role cannot promote the operator profile to administrator.
const DEMO_IDENTITIES: readonly DemoIdentity[] = [
  {
    id: 'SEED-OP-001',
    role: 'operatore',
    name: 'Laura Bianchi',
    aliases: ['op1', 'SEED-OP-001'],
  },
  {
    id: 'SEED-OP-004',
    role: 'admin',
    name: 'Admin Demo',
    aliases: ['admin1', 'SEED-OP-004'],
  },
];

const DEMO_IDENTITY_BY_ALIAS = new Map(
  DEMO_IDENTITIES.flatMap((identity) =>
    identity.aliases.map((alias) => [alias, identity] as const),
  ),
);

function explicitTrue(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

export function productionDemoAuthEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const expiresAt = Date.parse(env.DEMO_AUTH_EXPIRES_AT || '');
  return (
    env.NODE_ENV === 'production' &&
    (env.AUTH_MODE || '').trim().toLowerCase() === 'demo' &&
    explicitTrue(env.ALLOW_PRODUCTION_DEMO_AUTH) &&
    env.DEMO_DATASET_ID === 'synthetic-v1' &&
    Number.isFinite(expiresAt) &&
    expiresAt > Date.now()
  );
}

// Augment Express Request with the resolved operator (no global d.ts needed).
export interface AuthedRequest extends Request {
  operator?: Operator;
  /** Which identity source established `operator` (read by authz/request-context). */
  identitySource?: ResolvedIdentity['identitySource'];
}

export type OperatorAuthMode = 'entra' | 'demo' | 'disabled';

export function operatorAuthMode(env: NodeJS.ProcessEnv = process.env): OperatorAuthMode {
  const configured = (env.AUTH_MODE || '').trim().toLowerCase();
  if (configured === 'entra') return 'entra';
  if (configured === 'demo') {
    return env.NODE_ENV === 'development' ||
      env.NODE_ENV === 'test' ||
      productionDemoAuthEnabled(env)
      ? 'demo'
      : 'disabled';
  }
  // Missing, misspelled, and unsupported modes always fail closed. Synthetic
  // operator headers are accepted only after explicit local/test opt-in.
  return 'disabled';
}

/**
 * The single identity gate: establishes WHO the caller is (Entra token, Role Simulator session or
 * the legacy demo headers). The ROLE is resolved afterwards from the active policy by
 * authz/request-context.ts#ensureAuthorization (route gate, Tool Layer, /authz, /auth/me).
 * Idempotent within one request.
 */
export function requireOperator(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (req.operator && req.identitySource) {
    next();
    return;
  }
  const finish = (source: ResolvedIdentity['identitySource']) => {
    req.identitySource = source;
    next();
  };
  const mode = operatorAuthMode();
  if (mode === 'entra') {
    const config = entraConfig();
    if (!config) {
      res.status(503).json({
        error: 'Autenticazione Entra non configurata',
        code: 'auth_configuration_missing',
      });
      return;
    }
    requireEntraOperator(config)(req, res, (error?: unknown) => {
      if (error) {
        next(error);
        return;
      }
      finish('entra');
    });
    return;
  }
  if (mode === 'disabled') {
    res.status(503).json({
      error: 'Endpoint clinici disabilitati: configurare esplicitamente AUTH_MODE',
      code: 'auth_disabled',
    });
    return;
  }

  if (simulatorEnabled(mode)) {
    // Role Simulator: only a server-signed session names the identity; X-Operator-* are ignored,
    // so a client can never self-assign identity or role.
    const header = req.header('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const identityId = token.startsWith(SIMULATOR_TOKEN_PREFIX)
      ? verifySimulatorToken(token)
      : null;
    const identity = identityId ? simulatedIdentity(identityId) : undefined;
    if (!identity) {
      res.status(401).json({
        error: 'Sessione non valida: scegli un profilo dal simulatore',
        code: 'simulator_session_required',
      });
      return;
    }
    req.operator = {
      id: identity.id,
      role: identity.userRole === 'MANAGER' ? 'manager' : 'operator',
      name: identity.name,
    };
    res.setHeader('X-ClinicOS-Auth-Mode', 'demo-simulator');
    finish('simulator');
    return;
  }

  const id = (req.header('X-Operator-Id') || '').trim();
  const role = (req.header('X-Operator-Role') || '').trim().toLowerCase();

  if (!id || !role) {
    res.status(401).json({ error: 'Autenticazione richiesta: operatore non identificato' });
    return;
  }
  if (!ALLOWED_ROLES.has(role)) {
    res.status(403).json({ error: 'Ruolo non autorizzato per l’importazione' });
    return;
  }
  const boundedId = id.slice(0, 64);
  const demoIdentity = DEMO_IDENTITY_BY_ALIAS.get(boundedId);
  if (productionDemoAuthEnabled()) {
    if (!demoIdentity) {
      res.status(403).json({
        error: 'Identità non disponibile nella modalità demo temporanea',
        code: 'demo_identity_forbidden',
      });
      return;
    }
    if (role !== demoIdentity.role) {
      res.status(403).json({
        error: 'Il ruolo demo è assegnato dal server e non può essere modificato',
        code: 'demo_role_mismatch',
      });
      return;
    }
    req.operator = {
      id: demoIdentity.id,
      role: demoIdentity.role,
      name: demoIdentity.name,
    };
  } else {
    req.operator = {
      id: demoIdentity?.id ?? boundedId,
      role,
      name: demoIdentity?.name,
    };
  }
  res.setHeader('X-ClinicOS-Auth-Mode', 'demo');
  finish(productionDemoAuthEnabled() ? 'demo-production' : 'demo-header');
}

export function requireRole(...allowedRoles: string[]) {
  const allowed = new Set(allowedRoles.map((role) => role.toLowerCase()));
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.operator) {
      res.status(401).json({ error: 'Autenticazione richiesta', code: 'operator_missing' });
      return;
    }
    if (!allowed.has(req.operator.role.toLowerCase())) {
      res.status(403).json({ error: 'Ruolo non autorizzato', code: 'role_forbidden' });
      return;
    }
    next();
  };
}
