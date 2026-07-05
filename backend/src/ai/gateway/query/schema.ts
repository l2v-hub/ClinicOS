// 016 F3: declarative WHITELIST of what the composable query engine may read. This is where the
// security lives: only entities/fields/relations listed here are reachable by an LLM-emitted plan
// (deny-by-default). Each entity carries an authz-class the engine enforces per step. Extending
// coverage = adding rows here, with NO new executor code.

export type AuthzClass = 'public' | 'facility' | 'patient-scoped';

export interface FieldDef {
  type: 'string' | 'number' | 'date' | 'boolean';
  /** PHI / sensitive — surfaced only under the appropriate authz gate; always source-cited. */
  sensitive?: boolean;
  /** Physical Prisma column when the logical name differs (unused in v1; reserved). */
  column?: string;
}

export interface RelationDef {
  target: string;
  kind: 'toOne' | 'toMany';
}

export interface EntityDef {
  /** Prisma delegate name (e.g. 'patientRoomAssignment'); absent for custom-loader entities. */
  prismaModel?: string;
  authz: AuthzClass;
  /** Field holding the owning patient id — enforced for patient-scoped authz. */
  patientIdField?: string;
  fields: Record<string, FieldDef>;
  relations: Record<string, RelationDef>;
  /** True → not a plain Prisma table; the engine uses a dedicated loader (e.g. vitalSign). */
  custom?: boolean;
}

const S = (sensitive = false): FieldDef => ({ type: 'string', sensitive });
const N: FieldDef = { type: 'number' };
const D: FieldDef = { type: 'date' };

export const QUERY_SCHEMA: Record<string, EntityDef> = {
  patient: {
    prismaModel: 'patient', authz: 'public', patientIdField: 'id',
    fields: { id: S(), firstName: S(true), lastName: S(true), medicalRecordNumber: S(true), dateOfBirth: D, sex: S(), createdAt: D },
    relations: {},
  },
  room: {
    prismaModel: 'room', authz: 'facility',
    fields: { id: S(), numero: S(), tipo: S(), piano: S(), reparto: S(), stato: S() },
    relations: { beds: { target: 'bed', kind: 'toMany' } },
  },
  bed: {
    prismaModel: 'bed', authz: 'facility',
    fields: { id: S(), label: S(), stato: S(), roomId: S() },
    relations: { room: { target: 'room', kind: 'toOne' } },
  },
  roomAssignment: {
    prismaModel: 'patientRoomAssignment', authz: 'facility', patientIdField: 'patientId',
    fields: { id: S(), patientId: S(), roomId: S(), bedId: S(), startDate: S(), endDate: S() },
    relations: {
      patient: { target: 'patient', kind: 'toOne' },
      bed: { target: 'bed', kind: 'toOne' },
      room: { target: 'room', kind: 'toOne' },
    },
  },
  appointment: {
    prismaModel: 'appointment', authz: 'facility', patientIdField: 'patientId',
    fields: { id: S(), patientId: S(), scheduledAt: D, status: S(), reason: S() },
    relations: { patient: { target: 'patient', kind: 'toOne' } },
  },
  therapy: {
    prismaModel: 'patientTherapy', authz: 'patient-scoped', patientIdField: 'patientId',
    fields: { id: S(), patientId: S(), farmacoNome: S(), dosaggio: S(), tipo: S(), stato: S(), dataInizio: S(), dataFine: S(), createdAt: D },
    relations: {},
  },
  vitalSign: {
    authz: 'patient-scoped', custom: true, patientIdField: 'patientId',
    fields: { patientId: S(), etichetta: S(), valore: N, systolic: N, rilevato: D },
    relations: {},
  },
};

export function getEntity(name: string): EntityDef | null {
  return Object.prototype.hasOwnProperty.call(QUERY_SCHEMA, name) ? QUERY_SCHEMA[name] : null;
}

/** Resolve a field path against the schema. Supports 'field' and 1-hop 'relation.field'. Returns
 *  null (denied) for unknown entities/relations/fields or paths deeper than one hop. */
export function resolveField(entityName: string, path: string): { entity: EntityDef; field: string; def: FieldDef } | null {
  const e = getEntity(entityName);
  if (!e) return null;
  const parts = path.split('.');
  if (parts.length === 1) {
    const def = e.fields[parts[0]];
    return def ? { entity: e, field: parts[0], def } : null;
  }
  if (parts.length === 2) {
    const rel = e.relations[parts[0]];
    if (!rel) return null;
    const te = getEntity(rel.target);
    if (!te) return null;
    const def = te.fields[parts[1]];
    return def ? { entity: te, field: parts[1], def } : null;
  }
  return null; // >1 hop denied in v1
}
