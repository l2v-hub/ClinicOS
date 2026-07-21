// #260: production-grade Azure Entra ID (OIDC) authentication for clinical document endpoints.
//
// Verifies RS256 JWTs against the tenant JWKS (signature, issuer, audience, expiry, required
// claims) via `jose`, then maps the verified identity to a ClinicOS User/Operator SERVER-SIDE:
// primary key is the Entra object id (claim `oid`, persisted on User.entraObjectId); a one-time
// fallback matches the verified e-mail (preferred_username) and auto-links the oid. Self-declared
// headers are NEVER an identity source here (AC6).
//
// PRIVACY (AC7): this module never logs tokens, claims, e-mails or PHI — only outcome codes.
// Fail closed (AC5): incomplete configuration means requests are rejected, never passed through.

import type { NextFunction, Response } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { prisma } from './prisma.js';
import type { AuthedRequest } from '../ai/auth.js';

export interface EntraConfig {
  tenantId: string;
  audience: string;
  issuer: string;
  jwksUrl: string;
}

/** Read and validate the Entra configuration from env. Returns null when incomplete (fail closed).
 *  ENTRA_ISSUER / ENTRA_JWKS_URL override the tenant defaults (used by tests with a local JWKS). */
export function entraConfig(env: NodeJS.ProcessEnv = process.env): EntraConfig | null {
  const tenantId = (env.ENTRA_TENANT_ID || '').trim();
  const audience = (env.ENTRA_AUDIENCE || '').trim();
  if (!tenantId || !audience) return null;
  const issuer =
    (env.ENTRA_ISSUER || '').trim() || `https://login.microsoftonline.com/${tenantId}/v2.0`;
  const jwksUrl =
    (env.ENTRA_JWKS_URL || '').trim() ||
    `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;
  return { tenantId, audience, issuer, jwksUrl };
}

// Remote JWKS is cached per URL (jose handles refresh/cooldown internally).
type JwksResolver = ReturnType<typeof createRemoteJWKSet>;
const jwksCache = new Map<string, JwksResolver>();
function jwksFor(url: string): JwksResolver {
  let resolver = jwksCache.get(url);
  if (!resolver) {
    resolver = createRemoteJWKSet(new URL(url), { cooldownDuration: 30000 });
    jwksCache.set(url, resolver);
  }
  return resolver;
}

/** Test hook: clear the JWKS cache (e.g. when a test JWKS server restarts on a new port). */
export function resetJwksCache(): void {
  jwksCache.clear();
}

export type EntraAuthFailure =
  | { status: 401; code: 'token_missing' | 'token_invalid' }
  | { status: 403; code: 'identity_not_mapped' | 'identity_inactive' };

export interface EntraIdentity {
  userId: string;
  operatorId: string;
  role: string;
}

function bearerToken(header: string | undefined): string | null {
  const m = /^Bearer\s+(.+)$/i.exec((header || '').trim());
  return m ? m[1].trim() : null;
}

/** Verify the JWT and resolve the ClinicOS identity. Returns the identity or a typed failure —
 *  never throws for auth reasons; unexpected errors (DB down) propagate. */
export async function authenticateEntra(
  authorizationHeader: string | undefined,
  config: EntraConfig,
): Promise<{ ok: true; identity: EntraIdentity } | { ok: false; failure: EntraAuthFailure }> {
  const token = bearerToken(authorizationHeader);
  if (!token) return { ok: false, failure: { status: 401, code: 'token_missing' } };

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, jwksFor(config.jwksUrl), {
      issuer: config.issuer,
      audience: config.audience,
      algorithms: ['RS256'],
    }));
  } catch {
    // Signature/issuer/audience/expiry failures all collapse to one non-enumerating 401.
    return { ok: false, failure: { status: 401, code: 'token_invalid' } };
  }

  const oid = typeof payload.oid === 'string' ? payload.oid.trim() : '';
  if (!oid) return { ok: false, failure: { status: 401, code: 'token_invalid' } };

  // Server-side mapping: oid first; one-time fallback by verified e-mail with oid auto-link.
  let user = await prisma.user.findUnique({
    where: { entraObjectId: oid },
    include: { operator: true },
  });
  if (!user) {
    const email =
      typeof payload.preferred_username === 'string'
        ? payload.preferred_username.trim().toLowerCase()
        : '';
    if (email) {
      const byEmail = await prisma.user.findUnique({
        where: { email },
        include: { operator: true },
      });
      // Link only an unlinked account: a user already bound to a DIFFERENT oid is not up for grabs.
      if (byEmail && !byEmail.entraObjectId) {
        user = await prisma.user
          .update({
            where: { id: byEmail.id },
            data: { entraObjectId: oid },
            include: { operator: true },
          })
          .catch(() => null);
      }
    }
  }
  if (!user || !user.operator) {
    return { ok: false, failure: { status: 403, code: 'identity_not_mapped' } };
  }
  if (!user.isActive) return { ok: false, failure: { status: 403, code: 'identity_inactive' } };

  return {
    ok: true,
    identity: {
      userId: user.id,
      operatorId: user.operator.id,
      role: user.role.toLowerCase(),
    },
  };
}

/** Express middleware for AUTH_MODE=entra. Attaches req.operator from VERIFIED claims only. */
export function requireEntraOperator(config: EntraConfig) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    authenticateEntra(req.header('authorization'), config)
      .then((result) => {
        if (!result.ok) {
          const { status, code } = result.failure;
          if (status === 401) {
            res.setHeader('WWW-Authenticate', 'Bearer realm="clinicos-documents"');
          }
          res.status(status).json({ error: 'Accesso non autorizzato ai documenti clinici', code });
          return;
        }
        // AC6: identity comes ONLY from verified claims — any X-Operator-* header is ignored.
        req.operator = { id: result.identity.operatorId, role: result.identity.role };
        next();
      })
      .catch(() => {
        // Unexpected (e.g. DB unavailable): fail closed without leaking details.
        res
          .status(503)
          .json({ error: 'Verifica identità non disponibile', code: 'auth_unavailable' });
      });
  };
}
