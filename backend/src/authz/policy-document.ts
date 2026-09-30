// Validation and diff of the versioned authorization document. Every save goes through
// parsePolicyDocument: unknown roles/capabilities/effects are rejected, legacy roles cannot be
// removed while they are the fallback, and the policy can never lose its last policy manager.

import { capabilityById, governedCapabilities } from './registry.js';
import { EFFECTS, type Effect, type PolicyDocument, type RoleDefinition } from './types.js';

export class PolicyValidationError extends Error {
  readonly status = 400;
  readonly code = 'invalid_policy';

  constructor(
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'PolicyValidationError';
  }
}

const ROLE_ID = /^[a-z][a-z0-9_]{1,31}$/;
const OPERATOR_ID = /^[A-Za-z0-9._:@-]{1,64}$/;
const LEGACY_FALLBACK_ROLES = ['operator', 'legacy_admin'];
export const POLICY_MANAGER_CAPABILITY = 'authz.manage_policy';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseRole(value: unknown, index: number): RoleDefinition {
  if (!isRecord(value)) throw new PolicyValidationError(`Ruolo ${index} non valido`);
  const { id, label, description, legacy, legacyRole, uiShell } = value;
  if (typeof id !== 'string' || !ROLE_ID.test(id))
    throw new PolicyValidationError(`Identificativo ruolo non valido: ${String(id)}`);
  if (typeof label !== 'string' || !label.trim() || label.length > 60)
    throw new PolicyValidationError(`Nome ruolo non valido per ${id}`);
  if (description !== undefined && (typeof description !== 'string' || description.length > 300))
    throw new PolicyValidationError(`Descrizione ruolo non valida per ${id}`);
  if (!['admin', 'manager', 'operatore'].includes(String(legacyRole)))
    throw new PolicyValidationError(`Ambito dati non valido per ${id}`);
  if (!['admin', 'operator'].includes(String(uiShell)))
    throw new PolicyValidationError(`Interfaccia non valida per ${id}`);
  return {
    id,
    label: label.trim(),
    description: typeof description === 'string' ? description : '',
    ...(legacy === true ? { legacy: true } : {}),
    legacyRole: legacyRole as RoleDefinition['legacyRole'],
    uiShell: uiShell as RoleDefinition['uiShell'],
  };
}

/** Strict parse of a proposed document. Throws PolicyValidationError with a precise message. */
export function parsePolicyDocument(value: unknown): PolicyDocument {
  if (!isRecord(value)) throw new PolicyValidationError('Documento di policy non valido');
  if (value.schema !== 'clinicos.authz-policy/v1')
    throw new PolicyValidationError('Schema di policy non supportato');
  const defaultEffect = value.defaultEffect as Effect;
  if (!EFFECTS.includes(defaultEffect))
    throw new PolicyValidationError('Effetto di default non valido');
  if (!Array.isArray(value.roles) || value.roles.length === 0 || value.roles.length > 50)
    throw new PolicyValidationError('Elenco ruoli non valido');
  const roles = value.roles.map(parseRole);
  const roleIds = new Set<string>();
  for (const role of roles) {
    if (roleIds.has(role.id)) throw new PolicyValidationError(`Ruolo duplicato: ${role.id}`);
    roleIds.add(role.id);
  }
  for (const legacy of LEGACY_FALLBACK_ROLES) {
    if (!roleIds.has(legacy))
      throw new PolicyValidationError(
        `Il ruolo legacy "${legacy}" è ancora il fallback delle identità non migrate e non può essere rimosso`,
      );
  }

  if (!isRecord(value.grants)) throw new PolicyValidationError('Matrice permessi non valida');
  const grants: PolicyDocument['grants'] = {};
  const governedIds = new Set(governedCapabilities().map((cap) => cap.id));
  for (const [roleId, roleGrants] of Object.entries(value.grants)) {
    if (!roleIds.has(roleId))
      throw new PolicyValidationError(`Permessi per ruolo sconosciuto: ${roleId}`);
    if (!isRecord(roleGrants)) throw new PolicyValidationError(`Permessi non validi per ${roleId}`);
    grants[roleId] = {};
    for (const [capabilityId, effect] of Object.entries(roleGrants)) {
      if (!governedIds.has(capabilityId)) {
        const known = capabilityById(capabilityId);
        throw new PolicyValidationError(
          known
            ? `La capability ${capabilityId} non è governata dalla matrice (${known.governedBy ? `derivata da ${known.governedBy}` : known.gate})`
            : `Capability sconosciuta: ${capabilityId}`,
        );
      }
      if (!EFFECTS.includes(effect as Effect))
        throw new PolicyValidationError(`Effetto non valido per ${roleId}/${capabilityId}`);
      grants[roleId][capabilityId] = effect as Effect;
    }
  }
  for (const roleId of roleIds) grants[roleId] ??= {};

  if (!isRecord(value.assignments)) throw new PolicyValidationError('Assegnazioni non valide');
  const assignments: Record<string, string> = {};
  for (const [operatorId, roleId] of Object.entries(value.assignments)) {
    if (!OPERATOR_ID.test(operatorId))
      throw new PolicyValidationError(`Identità non valida: ${operatorId}`);
    if (typeof roleId !== 'string' || !roleIds.has(roleId))
      throw new PolicyValidationError(`Ruolo sconosciuto assegnato a ${operatorId}`);
    assignments[operatorId] = roleId;
  }

  const review: Record<string, string> = {};
  if (isRecord(value.review)) {
    for (const [key, note] of Object.entries(value.review)) {
      if (typeof note === 'string' && note.length <= 300) review[key] = note;
    }
  }

  const document: PolicyDocument = {
    schema: 'clinicos.authz-policy/v1',
    defaultEffect,
    roles,
    grants,
    assignments,
    review,
  };
  const managers = roles.filter(
    (role) =>
      (document.grants[role.id]?.[POLICY_MANAGER_CAPABILITY] ?? defaultEffect) !== 'DENIED' &&
      (document.grants[role.id]?.[POLICY_MANAGER_CAPABILITY] ?? defaultEffect) !== 'READ_ONLY',
  );
  if (managers.length === 0) {
    throw new PolicyValidationError(
      'Almeno un ruolo deve poter gestire ruoli e permessi (authz.manage_policy): altrimenti nessuno potrebbe più modificarli',
    );
  }
  return document;
}

export interface GrantChange {
  roleId: string;
  capabilityId: string;
  before: Effect | null;
  after: Effect | null;
}

export interface PolicyDiff {
  grants: GrantChange[];
  rolesAdded: string[];
  rolesRemoved: string[];
  rolesChanged: string[];
  assignments: { operatorId: string; before: string | null; after: string | null }[];
  defaultEffect: { before: Effect; after: Effect } | null;
}

/** Before/after of two documents (effective effects, so defaultEffect changes are visible). */
export function diffPolicies(before: PolicyDocument, after: PolicyDocument): PolicyDiff {
  const beforeRoles = new Map(before.roles.map((role) => [role.id, role]));
  const afterRoles = new Map(after.roles.map((role) => [role.id, role]));
  const grants: GrantChange[] = [];
  const allRoles = new Set([...beforeRoles.keys(), ...afterRoles.keys()]);
  for (const roleId of allRoles) {
    for (const cap of governedCapabilities()) {
      const was = beforeRoles.has(roleId)
        ? (before.grants[roleId]?.[cap.id] ?? before.defaultEffect)
        : null;
      const now = afterRoles.has(roleId)
        ? (after.grants[roleId]?.[cap.id] ?? after.defaultEffect)
        : null;
      if (was !== now) grants.push({ roleId, capabilityId: cap.id, before: was, after: now });
    }
  }
  const assignments: PolicyDiff['assignments'] = [];
  for (const operatorId of new Set([
    ...Object.keys(before.assignments),
    ...Object.keys(after.assignments),
  ])) {
    const was = before.assignments[operatorId] ?? null;
    const now = after.assignments[operatorId] ?? null;
    if (was !== now) assignments.push({ operatorId, before: was, after: now });
  }
  return {
    grants,
    rolesAdded: [...afterRoles.keys()].filter((id) => !beforeRoles.has(id)),
    rolesRemoved: [...beforeRoles.keys()].filter((id) => !afterRoles.has(id)),
    rolesChanged: [...afterRoles.keys()].filter(
      (id) =>
        beforeRoles.has(id) &&
        JSON.stringify(beforeRoles.get(id)) !== JSON.stringify(afterRoles.get(id)),
    ),
    assignments,
    defaultEffect:
      before.defaultEffect === after.defaultEffect
        ? null
        : { before: before.defaultEffect, after: after.defaultEffect },
  };
}
