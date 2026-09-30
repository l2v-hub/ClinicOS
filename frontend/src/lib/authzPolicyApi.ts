// Client della Policy API (Identity → Role → Capability, fase 2).
//
//   GET  /authz/policy                    policy attiva + catalogo capability + identità
//   GET  /authz/policy/versions           storico versioni
//   GET  /authz/policy/versions/:v        una versione con documento
//   POST /authz/policy/impact             anteprima impatto di un documento proposto
//   POST /authz/policy/versions           Salva bozza (apply:false) / Salva e applica (apply:true)
//   POST /authz/policy/versions/:v/apply  applica una bozza
//
// Le credenziali arrivano solo da operatorHeaders(): nessun ruolo viene mai deciso dal client.

import { API_URL } from '../config';
import { operatorHeaders } from './operatorSession';

export const EFFECTS = ['ALLOWED', 'READ_ONLY', 'ALLOWED_WITH_CONFIRMATION', 'DENIED'] as const;
export type Effect = (typeof EFFECTS)[number];

export interface RoleDefinition {
  id: string;
  label: string;
  description: string;
  legacy?: boolean;
  legacyRole: 'admin' | 'manager' | 'operatore';
  uiShell: 'admin' | 'operator';
}

export interface PolicyDocument {
  schema: 'clinicos.authz-policy/v1';
  defaultEffect: Effect;
  roles: RoleDefinition[];
  grants: Record<string, Record<string, Effect>>;
  assignments: Record<string, string>;
  review?: Record<string, string>;
}

export type CapabilityType = 'read' | 'write' | 'action';
export type Sensitivity = 'low' | 'medium' | 'high' | 'critical';

export interface PolicyCapability {
  id: string;
  name: string;
  domain: string;
  type: CapabilityType;
  sensitivity: Sensitivity;
  exposure: string;
  legacyRoles: string[];
  tool: boolean;
}

export interface DerivedCapability {
  id: string;
  name: string;
  domain: string;
  governedBy: string;
}

export interface PolicyIdentity {
  id: string;
  name: string;
  ruolo: string;
  legacyRole: string;
  active: boolean;
  simulated: boolean;
}

export interface PolicyResponse {
  active: {
    version: number;
    source: 'database' | 'baseline';
    appliedAt: string | null;
    document: PolicyDocument;
  };
  capabilities: PolicyCapability[];
  derived: DerivedCapability[];
  identities: PolicyIdentity[];
}

export interface GrantChange {
  roleId: string;
  capabilityId: string;
  before: Effect | null;
  after: Effect | null;
}

export interface AssignmentChange {
  operatorId: string;
  before: string | null;
  after: string | null;
}

export interface PolicyDiff {
  grants: GrantChange[];
  rolesAdded: string[];
  rolesRemoved: string[];
  rolesChanged: string[];
  assignments: AssignmentChange[];
  defaultEffect: { before: Effect; after: Effect } | null;
}

export interface ChangeSummary extends PolicyDiff {
  counts: { grants: number; roles: number; assignments: number };
}

export type VersionStatus = 'draft' | 'active' | 'superseded';

export interface PolicyVersion {
  version: number;
  status: VersionStatus;
  basedOnVersion: number | null;
  changeSummary: ChangeSummary | null;
  note: string | null;
  createdById: string;
  createdByName: string | null;
  createdByRole: string;
  createdAt: string;
  appliedAt: string | null;
  appliedById: string | null;
}

export interface RoleImpact {
  roleId: string;
  gained: string[];
  lost: string[];
  confirmationChanged: string[];
  toolsGained: string[];
  toolsLost: string[];
  identities: string[];
}

export interface PolicyImpactResponse {
  basedOnVersion: number;
  diff: PolicyDiff;
  roles: RoleImpact[];
  warnings: string[];
}

/** Errore HTTP della Policy API con il `code` stabile restituito dal backend. */
export class AuthzApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'AuthzApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...operatorHeaders() };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new AuthzApiError('Server non raggiungibile', 0, 'network_error');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const body = (payload && typeof payload === 'object' ? payload : {}) as {
      error?: unknown;
      code?: unknown;
    };
    throw new AuthzApiError(
      typeof body.error === 'string' ? body.error : `Errore ${response.status}`,
      response.status,
      typeof body.code === 'string' ? body.code : `http_${response.status}`,
    );
  }
  return payload as T;
}

export function fetchPolicy(signal?: AbortSignal): Promise<PolicyResponse> {
  return request<PolicyResponse>('/authz/policy', { signal });
}

export async function fetchPolicyVersions(signal?: AbortSignal): Promise<PolicyVersion[]> {
  const body = await request<{ versions: PolicyVersion[] }>('/authz/policy/versions', { signal });
  return Array.isArray(body?.versions) ? body.versions : [];
}

export function fetchPolicyVersion(
  version: number,
  signal?: AbortSignal,
): Promise<PolicyVersion & { document: PolicyDocument }> {
  return request(`/authz/policy/versions/${encodeURIComponent(String(version))}`, { signal });
}

export function previewPolicyImpact(document: PolicyDocument): Promise<PolicyImpactResponse> {
  return request<PolicyImpactResponse>('/authz/policy/impact', {
    method: 'POST',
    body: JSON.stringify({ document }),
  });
}

export function savePolicyVersion(input: {
  document: PolicyDocument;
  basedOnVersion: number;
  note?: string;
  apply: boolean;
}): Promise<PolicyVersion> {
  return request<PolicyVersion>('/authz/policy/versions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function applyPolicyVersion(version: number): Promise<PolicyVersion> {
  return request<PolicyVersion>(
    `/authz/policy/versions/${encodeURIComponent(String(version))}/apply`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}
