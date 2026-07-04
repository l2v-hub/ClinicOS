// REQ-041: the real VoiceWriter — applies confirmed plans through ClinicOS's existing domain writes.
// This is the trusted backend boundary (like the read gateway): it touches the DB; the "model" never
// does. Each method writes only whitelisted fields and returns the new/updated recordId for audit.

import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { asCartella, type VitalItem } from '../gateway/filters.js';
import {
  getNarrativeSection, upsertNarrativeSection, pickDisplayText,
  NARRATIVE_SECTION_KEYS, type NarrativeSectionKey,
} from '../sections/patient-narrative.js';
import { createAppointment, updateAppointment } from '../../services/appointment-service.js';
import { createConsegna as createConsegnaService } from '../../services/consegna-service.js';
import type { VoiceWriter, WriteMeta } from './execute.js';

const DEMOGRAPHIC_FIELDS = new Set(['phone', 'email', 'address', 'emergencyContactName', 'emergencyContactPhone']);

/** Combine the run date with a spoken HH:MM into an ISO timestamp (falls back to now). */
function rilevatoFrom(meta: WriteMeta, timeHHMM: unknown): string {
  const datePart = meta.nowISO.slice(0, 10);
  if (typeof timeHHMM === 'string' && /^\d{2}:\d{2}$/.test(timeHHMM)) return `${datePart}T${timeHHMM}:00`;
  return meta.nowISO;
}

export const prismaVoiceWriter: VoiceWriter = {
  async createVitalSign(patientId, fields, meta) {
    const existing = await prisma.cartella.findUnique({ where: { patientId } });
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
    const next = { ...data, parametriVitali };
    await prisma.cartella.upsert({
      where: { patientId },
      create: { patientId, data: next as object },
      update: { data: next as object },
    });
    return id;
  },

  async updateDemographics(patientId, field, value, _meta) {
    if (!DEMOGRAPHIC_FIELDS.has(field)) throw new Error(`Campo anagrafico non consentito: ${field}`);
    await prisma.patient.update({ where: { id: patientId }, data: { [field]: value } });
    return patientId;
  },

  async appendNarrative(patientId, sectionKey, addedText, meta) {
    if (!NARRATIVE_SECTION_KEYS.includes(sectionKey as NarrativeSectionKey)) throw new Error(`sectionKey non valido: ${sectionKey}`);
    const current = await getNarrativeSection(patientId, sectionKey);
    const currentText = current ? pickDisplayText(current.originalText, current.reviewedText) : '';
    const resulting = currentText.trim() ? `${currentText}\n${addedText}` : addedText;
    await upsertNarrativeSection(patientId, sectionKey as NarrativeSectionKey, {
      reviewedText: resulting,
      reviewStatus: 'modified',
      updatedBy: meta.operatorName,
    });
    return `${patientId}:${sectionKey}`;
  },

  async addDiaryNote(patientId, content, meta) {
    const entry = await prisma.patientDiaryEntry.create({
      data: {
        patientId,
        authorType: 'operatore',
        authorName: meta.operatorName,
        content,
        priority: 'normale',
        status: 'aperta',
        entryDateTime: meta.nowISO,
        category: 'voce',
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
      operatorName: meta.operatorName,
      data: String(fields.data ?? ''),
      ora: String(fields.ora ?? ''),
      tipologia: String(fields.tipologia ?? 'visita'),
      note: fields.note !== undefined ? String(fields.note) : undefined,
    });
    return dto.id;
  },

  async updateAppointment(targetRecordId, fields, _meta) {
    const dto = await updateAppointment(targetRecordId, {
      data: fields.data !== undefined ? String(fields.data) : undefined,
      ora: fields.newTime !== undefined ? String(fields.newTime) : undefined,
    });
    return dto.id;
  },

  // Issue #130: consegne go through the SAME service as the UI route POST /consegne (FR-007).
  // The AI can only create — the route's delete is UI-only and never imported here.
  async createConsegna(patientId, fields, meta) {
    const created = await createConsegnaService({
      pazienteId: patientId,
      pazienteNome: String(fields.pazienteNome ?? ''),
      note: String(fields.note ?? ''),
      scadenza: meta.nowISO.slice(0, 10),
      creatoDA: meta.operatorName,
    });
    return created.id;
  },
};
