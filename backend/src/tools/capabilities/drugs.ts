// Drug catalog (AIFA open data) tools — thin adapters over services/farmaci (the same symbols used
// by routes/farmaci.ts). Public reference data: no patient payload passes through here.
// Not exposed in Phase 1: POST /farmaci/ricarica (downloads ~82 MB from AIFA and replaces the
// catalog) and GET /farmaci/documento (external AIFA PDF fetch) — external side effects.
//
// Note: the public HTTP routes are rate limited per IP (ai/rate-limit.ts); over /tools these tools
// share the per-operator AI limiter (importRateLimit, 60/min) instead.

import { cercaPaginaFarmaci, dosaggiInCommercio } from '../../services/farmaci/ricerca.js';
import { MAX_FARMACI_QUERY_LENGTH, parseSearchInput } from '../../services/farmaci/query.js';
import { ToolError } from '../errors.js';
import type { ToolDefinition } from '../types.js';

// Same bound and messages as routes/farmaci.ts (shared constant).
function boundedText(value: string, param: 'q' | 'pa'): string {
  const text = value.trim();
  if (text.length > MAX_FARMACI_QUERY_LENGTH) {
    throw new ToolError(
      'invalid_input',
      `Parametro ${param} troppo lungo: massimo ${MAX_FARMACI_QUERY_LENGTH} caratteri`,
    );
  }
  return text;
}

export const drugTools: ToolDefinition[] = [
  {
    name: 'drugs.search',
    domain: 'drugs',
    kind: 'read',
    auditKind: 'read',
    description:
      'Ricerca nell’anagrafica farmaci AIFA per nome commerciale (con recupero dei nomi storpiati) o, con query.pa = "1"/"true", per principio attivo; paginata a cursore (query.limite 1..25).',
    sensitivity: 'low',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: {
          type: 'object',
          required: ['q'],
          properties: {
            q: {
              type: 'string',
              pattern: '\\S',
              description: 'max 80 caratteri (validato dal servizio)',
            },
            limite: { type: ['string', 'number'] },
            cursor: { type: 'string' },
            // Exactly the values the route accepts for `pa`.
            pa: { type: 'string', enum: ['0', '1', 'false', 'true'] },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'GET /farmaci/cerca',
    services: [
      'services/farmaci/query.ts#parseSearchInput',
      'services/farmaci/search-page.ts#cercaPaginaFarmaci',
    ],
    handler: async (input) => {
      const query = input.query as { q: string; limite?: unknown; cursor?: unknown; pa?: string };
      const q = boundedText(query.q, 'q');
      const parsed = parseSearchInput(query.q, query.limite, query.cursor);
      const perPa = query.pa === '1' || query.pa === 'true';
      const page = await cercaPaginaFarmaci(parsed.q, {
        limite: parsed.limit,
        cursor: parsed.cursor,
        perPa,
      });
      return { query: q, ...page };
    },
  },
  {
    name: 'drugs.strengths',
    domain: 'drugs',
    kind: 'read',
    auditKind: 'read',
    description:
      'Dosaggi realmente in commercio (quantità + unità) per un principio attivo (query.pa, max 80 caratteri).',
    sensitivity: 'low',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: {
          type: 'object',
          required: ['pa'],
          properties: { pa: { type: 'string', pattern: '\\S' } },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'GET /farmaci/dosaggi',
    services: ['services/farmaci/ricerca.ts#dosaggiInCommercio'],
    handler: async (input) => {
      const pa = boundedText(String((input.query as { pa: string }).pa), 'pa');
      return { principioAttivo: pa, dosaggi: await dosaggiInCommercio(pa) };
    },
  },
];
