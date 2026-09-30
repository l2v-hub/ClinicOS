// Narrative clinical sections tools — thin adapters over ai/sections/patient-narrative (the same
// symbols used by routes/narrative-sections.ts and by the Agnos update_narrative_section writer).
// The services take no scope parameter: `patientScoped: true` applies the same ownership check as
// the route's `requirePatientScope` middleware.

import {
  NARRATIVE_SECTION_KEYS,
  getNarrativeSection,
  getNarrativeSections,
  upsertNarrativeSection,
  type NarrativeSectionKey,
} from '../../ai/sections/patient-narrative.js';
import { parseNarrativeSaveInput } from '../../ai/sections/narrative-input.js';
import { ToolError } from '../errors.js';
import { actorOf, type ToolDefinition } from '../types.js';

const patientId = { type: 'string', minLength: 1 } as const;
// Same allow-list as the route's isKey() check (exported constant, reused).
const sectionKey = { type: 'string', enum: [...NARRATIVE_SECTION_KEYS] } as const;

export const narrativeTools: ToolDefinition[] = [
  {
    name: 'narrative.list',
    domain: 'narrative',
    kind: 'read',
    auditKind: 'read',
    description:
      'Tutte le sezioni narrative canoniche del paziente (vuote con reviewStatus absent se mai compilate).',
    sensitivity: 'high',
    patientScoped: true,
    inputSchema: {
      type: 'object',
      required: ['patientId'],
      properties: { patientId },
      additionalProperties: false,
    },
    entryPoint: 'GET /patients/:patientId/narrative-sections',
    services: ['ai/sections/patient-narrative.ts#getNarrativeSections'],
    handler: async (input) => {
      const sections = await getNarrativeSections(String(input.patientId));
      return { sections, total: sections.length };
    },
  },
  {
    name: 'narrative.get',
    domain: 'narrative',
    kind: 'read',
    auditKind: 'read',
    description: 'Una sezione narrativa del paziente per chiave canonica.',
    sensitivity: 'high',
    patientScoped: true,
    inputSchema: {
      type: 'object',
      required: ['patientId', 'sectionKey'],
      properties: { patientId, sectionKey },
      additionalProperties: false,
    },
    entryPoint: 'GET /patients/:patientId/narrative-sections/:sectionKey',
    services: ['ai/sections/patient-narrative.ts#getNarrativeSection'],
    handler: async (input) => {
      const dto = await getNarrativeSection(String(input.patientId), String(input.sectionKey));
      if (!dto) throw new ToolError('invalid_input', 'sectionKey non valido');
      return dto;
    },
  },
  {
    name: 'narrative.save',
    domain: 'narrative',
    kind: 'write',
    auditKind: 'update',
    description:
      'Salva il testo revisionato di una sezione narrativa (crea la sezione manuale se assente); originalText resta immutabile una volta creato.',
    sensitivity: 'high',
    patientScoped: true,
    idempotency: 'natural',
    inputSchema: {
      type: 'object',
      required: ['patientId', 'sectionKey', 'body'],
      properties: {
        patientId,
        sectionKey,
        body: {
          type: 'object',
          properties: {
            reviewedText: { type: 'string' },
            originalText: { type: 'string' },
            reviewStatus: { type: 'string' },
          },
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'PUT|PATCH /patients/:patientId/narrative-sections/:sectionKey',
    services: [
      'ai/sections/narrative-input.ts#parseNarrativeSaveInput',
      'ai/sections/patient-narrative.ts#upsertNarrativeSection',
    ],
    handler: async (input, ctx) => {
      const body = parseNarrativeSaveInput(input.body);
      return upsertNarrativeSection(
        String(input.patientId),
        String(input.sectionKey) as NarrativeSectionKey,
        {
          reviewedText: body.reviewedText,
          originalText: body.originalText,
          reviewStatus: body.reviewStatus,
          updatedBy: actorOf(ctx).id,
        },
      );
    },
  },
];
