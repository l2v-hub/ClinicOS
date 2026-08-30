// Authorization for the AI import flow (REQ-019).
//
// Production identity is verified through Entra/OIDC and resolved server-side.
// Self-declared operator headers remain available only in explicit/non-production
// demo mode so local fixtures keep working without becoming a production bypass.

import type { NextFunction, Request, Response } from 'express';
import { entraConfig, requireEntraOperator } from '../lib/entra-auth.js';

export interface Operator {
  id: string;
  role: string;
  name?: string;
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

export function requireOperator(req: AuthedRequest, res: Response, next: NextFunction): void {
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
    requireEntraOperator(config)(req, res, next);
    return;
  }
  if (mode === 'disabled') {
    res.status(503).json({
      error: 'Endpoint clinici disabilitati: configurare esplicitamente AUTH_MODE',
      code: 'auth_disabled',
    });
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
  next();
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
