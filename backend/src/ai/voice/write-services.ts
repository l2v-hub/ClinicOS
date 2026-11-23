// REQ-041: the real VoiceWriter — applies confirmed plans through ClinicOS's existing domain writes.
// This is the trusted backend boundary (like the read gateway): it touches the DB; the "model" never
// does. Each method writes only whitelisted fields and returns the new/updated recordId for audit.

import { Prisma } from '@prisma/client';
import { hasFacilityPatientScope } from '../../patients/patient-scope.js';
import { preserveTemporaryPsExits } from '../../patients/temporary-ps-exits.js';
import { createHash, randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { validatePatientPhone } from '../../lib/patient-phone.js';
import { parseDiaryCreateBody } from '../../patients/diary-write-validation.js';
import { asCartella, type VitalItem } from '../gateway/filters.js';
import {
  getNarrativeSection,
  upsertNarrativeSection,
  pickDisplayText,
  NARRATIVE_SECTION_KEYS,
  type NarrativeSectionKey,
} from '../sections/patient-narrative.js';
import { createAppointment, updateAppointment } from '../../services/appointment-service.js';
import { createConsegna as createConsegnaService } from '../../services/consegna-service.js';
import { createParameterReading as createParameterReadingService } from '../../patients/parameter-readings.js';
import { ParameterReadingError } from '../../patients/parameter-reading-input.js';
import { VoiceError, type VoiceWriter, type WriteMeta } from './execute.js';

const DEMOGRAPHIC_FIELDS = new Set([
  'phone',
  'email',
  'address',
  'emergencyContactName',
  'emergencyContactPhone',
]);

/** Combine the run date with a spoken HH:MM into an ISO timestamp (falls back to now). */
function rilevatoFrom(meta: WriteMeta, timeHHMM: unknown): string {
  const datePart = meta.nowISO.slice(0, 10);
  if (typeof timeHHMM === 'string' && /^\d{2}:\d{2}$/.test(timeHHMM))
    return `${datePart}T${timeHHMM}:00`;
  return meta.nowISO;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** La pagina Parametri vuole un UUID: una chiave d'azione diversa diventa un UUID stabile. */
function stableRequestId(key: string): string {
  if (UUID_RE.test(key)) return key.toLowerCase();
  const h = createHash('sha256').update(key).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export const prismaVoiceWriter: VoiceWriter = {
  async createVitalSign(patientId, fields, meta) {
    return prisma.$transaction(async (tx) => {
      const patients = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT p.id FROM "Patient" p WHERE p.id = ${patientId}
      ${hasFacilityPatientScope(meta.operatorRole ?? 'operatore') ? Prisma.empty : Prisma.sql`AND p."registeredById" = ${meta.operatorId}`}
      FOR UPDATE OF p`);
      if (!patients.length) throw new VoiceError('not_executable', 'Paziente non trovato');
      const rows = await tx.$queryRaw<Array<{ data: Prisma.JsonValue }>>`
      SELECT data FROM "Cartella" WHERE "patientId" = ${patientId} FOR UPDATE`;
      const existing = rows[0];
      const data = asCartella(existing?.data);
      const id = randomUUID();
      const entry: VitalItem = {
        id,
        etichetta: String(fields.etichetta ?? ''),
        valore: String(fields.valore ?? ''),
        unita: String(fields.unita ?? ''),
        stato: '',
        rilevato: rilevatoFrom(meta, fields.timeHHMM),
      };
      (entry as Record<string, unknown>).rilevatoDa = meta.operatorName;
      const parametriVitali = [...(data.parametriVitali ?? []), entry];
      const next = preserveTemporaryPsExits(existing?.data, { ...data, parametriVitali });
      await tx.cartella.upsert({
        where: { patientId },
        create: { patientId, data: next as object },
        update: { data: next as object },
      });
      return id;
    });
  },

  // Milo: la rilevazione passa dallo STESSO servizio della pagina Parametri (limiti, perimetro
  // paziente, autore). Una conferma ripetuta ritrova la rilevazione già scritta, mai un doppione.
  async createParameterReading(patientId, fields, meta) {
    const requestId = stableRequestId(meta.requestId ?? randomUUID());
    const prior = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "PatientParameterReading"
      WHERE "patientId" = ${patientId} AND "requestId" = ${requestId}
        AND "authorOperatorId" = ${meta.operatorId}`;
    if (prior[0]) return { id: prior[0].id, replayed: true };
    const measuredAt =
      typeof fields.measuredAt === 'string'
        ? fields.measuredAt
        : new Date(Math.floor(Date.parse(meta.nowISO) / 1000) * 1000).toISOString();
    try {
      const created = await createParameterReadingService(
        patientId,
        { requestId, measuredAt, values: fields.values ?? {} },
        { id: meta.operatorId, role: meta.operatorRole ?? 'operatore', name: meta.operatorName },
      );
      return { id: created.reading.id, replayed: created.replayed };
    } catch (error) {
      if (error instanceof ParameterReadingError)
        throw new VoiceError('not_executable', error.message);
      throw error;
    }
  },

  async updateDemographics(patientId, field, value, _meta) {
    if (!DEMOGRAPHIC_FIELDS.has(field))
      throw new Error(`Campo anagrafico non consentito: ${field}`);
    if (field === 'phone') {
      const validated = validatePatientPhone(value);
      if (!validated.ok) throw new VoiceError('not_executable', validated.error);
      value = validated.phone;
    }
    await prisma.patient.update({ where: { id: patientId }, data: { [field]: value } });
    return patientId;
  },

  async appendNarrative(patientId, sectionKey, addedText, meta) {
    if (!NARRATIVE_SECTION_KEYS.includes(sectionKey as NarrativeSectionKey))
      throw new Error(`sectionKey non valido: ${sectionKey}`);
    const current = await getNarrativeSection(patientId, sectionKey);
    const currentText = current ? pickDisplayText(current.originalText, current.reviewedText) : '';
    const resulting = currentText.trim() ? `${currentText}\n${addedText}` : addedText;
    await upsertNarrativeSection(patientId, sectionKey as NarrativeSectionKey, {
      reviewedText: resulting,
      reviewStatus: 'modified',
      updatedBy: meta.operatorId,
    });
    return `${patientId}:${sectionKey}`;
  },

  async addDiaryNote(patientId, content, meta) {
    const input = parseDiaryCreateBody({
      content,
      priority: 'normale',
      status: 'aperta',
      entryDateTime: meta.nowISO,
      category: 'voce',
    });
    const entry = await prisma.patientDiaryEntry.create({
      data: {
        patientId,
        authorType: 'operatore',
        authorName: meta.operatorName,
        authorId: meta.operatorId,
        ...input,
      },
    });
    return entry.id;
  },

  // SPEC-015 US4: agenda appointments go through the SAME service as the UI routes (FR-007).
  // The AI can only create/update — the service's delete is UI-only and never imported here.
  async createAppointment(patientId, fields, meta) {
    const dto = await createAppointment({
      patientId,
      operatorId: meta.operatorId,
      actor: {
        operatorId: meta.operatorId,
        role: meta.operatorRole ?? 'operatore',
        name: meta.operatorName,
      },
      data: String(fields.data ?? ''),
      ora: String(fields.ora ?? ''),
      tipologia: String(fields.tipologia ?? 'visita'),
      note: fields.note !== undefined ? String(fields.note) : undefined,
    });
    return dto.id;
  },

  async updateAppointment(targetRecordId, fields, meta) {
    const dto = await updateAppointment(
      targetRecordId,
      {
        data: fields.data !== undefined ? String(fields.data) : undefined,
        ora: fields.newTime !== undefined ? String(fields.newTime) : undefined,
      },
      {
        operatorId: meta.operatorId,
        role: meta.operatorRole ?? 'operatore',
        name: meta.operatorName,
      },
    );
    return dto.id;
  },

  // Issue #130: consegne go through the SAME service as the UI route POST /consegne (FR-007).
  // The AI can only create — the route's delete is UI-only and never imported here.
  async createConsegna(patientId, fields, meta) {
    const created = await createConsegnaService(
      {
        pazienteId: patientId,
        priorita: 'normale',
        tipo: 'Monitoraggio',
        note: String(fields.note ?? ''),
        oraScadenza: null,
        operatoreAssegnatoId: null,
        requestId: meta.requestId,
      },
      {
        id: meta.operatorId,
        role: meta.operatorRole ?? 'operatore',
        name: meta.operatorName,
      },
      new Date(meta.nowISO),
    );
    return { id: created.id, replayed: created.replayed };
  },
};
