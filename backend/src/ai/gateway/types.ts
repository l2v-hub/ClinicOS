// REQ-039: typed contracts for the ClinicOS AI Data Gateway.
//
// This is the ONLY way the AI runtime reads ClinicOS data. There is NO SQL tool, no raw query,
// no Prisma access for the model. Every result carries at least one verifiable SourceReference,
// and every call is bound to a user/tenant context that the backend enforces.

export type SourceType =
  | 'PATIENT_FIELD'
  | 'NARRATIVE_SECTION'
  | 'VITAL_SIGN'
  | 'DIARY_ENTRY'
  | 'DOCUMENT'
  | 'APPOINTMENT'
  | 'THERAPY'
  | 'ROOM'
  | 'OCCUPANCY'
  | 'STAFF';

/** A verifiable pointer back to the exact record a value came from. Never omit on a result. */
export interface SourceReference {
  sourceType: SourceType;
  patientId: string;
  recordId: string;
  sectionKey?: string;
  documentId?: string;
  pageNumber?: number;
  label: string;
  exactText?: string;
  recordedAt?: string;
}

/** The authenticated caller context. The backend enforces tenant + patient scoping from this —
 *  the model never decides what it may access. */
export interface UserContext {
  userId: string;
  tenantId: string;
  roles: string[];
  /** When provided (non-null), the caller may ONLY touch these patients. null = operator scope. */
  permittedPatientIds: string[] | null;
  requestId: string;
}

export interface SourcedResult<T> {
  data: T;
  sourceRefs: SourceReference[];
}

export interface PatientSearchInput {
  query?: string;
  fiscalCode?: string;
  allergy?: string;
  therapy?: string;
  admissionFrom?: string; // YYYY-MM-DD
  admissionTo?: string;
  limit?: number;
}

export interface PatientSearchResult {
  patientId: string;
  displayName: string;
  dateOfBirth: string | null;
  matchingFields: string[];
  sourceRefs: SourceReference[];
}

export interface ClinicalSectionSearchInput {
  query: string;
  patientId?: string;
  sectionKey?: string;
  limit?: number;
}

export interface ClinicalSectionMatch {
  patientId: string;
  sectionKey: string;
  excerpt: string;
  sourceRefs: SourceReference[];
}

export interface VitalSignQueryInput {
  patientId: string;
  label?: string; // 'PA' | 'FC' | 'SpO2' | 'TC' | 'DTX' ...
  systolicMin?: number;
  systolicMax?: number;
  valueMin?: number;
  valueMax?: number;
  from?: string;
  to?: string;
  /** Fase 1a: finestra andamento in giorni; il service la traduce in `from` = oggi−days. */
  days?: number;
}

export interface CorrelateInput {
  allergy?: string;
  therapy?: string;
  sectionContains?: { sectionKey?: string; text: string };
  limit?: number;
}

/** A typed gateway error. The HTTP layer maps `kind` to a status; messages carry no PHI. */
export class GatewayError extends Error {
  constructor(
    public kind:
      | 'unauthorized'
      | 'forbidden'
      | 'tenant_isolation'
      | 'not_found'
      | 'bad_request'
      | 'cross_patient_disabled',
    message: string,
  ) {
    super(message);
    this.name = 'GatewayError';
  }
}
