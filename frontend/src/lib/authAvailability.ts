export interface AuthStatus {
  mode: 'entra' | 'demo' | 'disabled';
  temporaryDemo: boolean;
  simulator: boolean;
  syntheticOnly: boolean;
  expiresAt: string | null;
}

export type AuthCheckState = 'checking' | 'available' | 'unavailable';
export type AuthAvailability = 'checking' | 'unavailable' | 'expired' | 'disabled' | 'ready';

/** Status is public configuration, never an identity or an authorization grant. */
export function parseAuthStatus(payload: unknown): AuthStatus {
  const invalid = () => {
    throw new Error('auth_status_invalid');
  };
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return invalid();
  const value = payload as Record<string, unknown>;
  if (value.mode !== 'entra' && value.mode !== 'demo' && value.mode !== 'disabled')
    return invalid();
  if (typeof value.temporaryDemo !== 'boolean') return invalid();
  if (value.simulator !== undefined && typeof value.simulator !== 'boolean') return invalid();
  if (value.syntheticOnly !== undefined && typeof value.syntheticOnly !== 'boolean')
    return invalid();
  // Expiry is optional explanatory metadata, not an authentication gate.
  // A stale demo variable must not override an enabled Entra/demo server mode.
  // Unusable metadata cannot prove expiration of an already-disabled service.
  const expiresAt =
    typeof value.expiresAt === 'string' &&
    value.expiresAt.length <= 50 &&
    Number.isFinite(Date.parse(value.expiresAt))
      ? value.expiresAt
      : null;
  if (value.mode !== 'demo' && (value.simulator === true || value.temporaryDemo)) return invalid();
  return {
    mode: value.mode,
    temporaryDemo: value.temporaryDemo,
    simulator: value.simulator === true,
    syntheticOnly: value.syntheticOnly === true,
    expiresAt,
  };
}

export function canStartLogin(check: AuthCheckState, status: AuthStatus | null): boolean {
  return check === 'available' && (status?.mode === 'demo' || status?.mode === 'entra');
}

export function authAvailability(
  check: AuthCheckState,
  status: AuthStatus | null,
  now = Date.now(),
): AuthAvailability {
  if (check !== 'available') return check;
  if (!status) return 'unavailable';
  if (status.mode !== 'disabled') return 'ready';
  // The server mode alone denies access. Browser time only chooses explanatory copy;
  // it must never enable/disable a server-authorized demo or replace /auth/me.
  return status.syntheticOnly && status.expiresAt !== null && Date.parse(status.expiresAt) <= now
    ? 'expired'
    : 'disabled';
}
