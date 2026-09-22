import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { normalizza, nucleoNome } from './normalizza.js';
import { queryNameHints } from './query.js';

type Client = typeof prisma;
export const MAX_CACHED_NAMES = 30000;
let namesCache = new WeakMap<object, { at: number; names: string[] | null }>();
export function invalidaCacheNomi() {
  namesCache = new WeakMap();
}

/** Only typo fallback needs a global index. NULL switches to bounded package scans. */
export async function catalogNames(client: Client) {
  const cached = namesCache.get(client);
  if (cached && Date.now() - cached.at < 3600000) return cached.names;
  // SQL DISTINCT runs on the DB; Prisma distinct can materialize all package rows.
  const rows = await client.$queryRaw<Array<{ denominazioneNorm: string }>>(Prisma.sql`
    SELECT DISTINCT "denominazioneNorm" FROM "Farmaco"
    ORDER BY "denominazioneNorm" LIMIT ${MAX_CACHED_NAMES + 1}
  `);
  const names = rows.length > MAX_CACHED_NAMES ? null : rows.map((row) => row.denominazioneNorm);
  namesCache.set(client, { at: Date.now(), names });
  return names;
}

/** Two narrow existence probes preserve full numeric brands and recognize their base. */
export async function knownQueryNames(text: string, client: Client) {
  const hints = queryNameHints(text);
  const known = new Set<string>();
  if (!hints) return known;
  const [full, base] = await Promise.all([
    client.farmaco.findFirst({
      where: {
        OR: [
          { denominazioneNorm: hints.full },
          {
            denominazioneNorm: nucleoNome(hints.full),
            denominazione: { equals: hints.full, mode: 'insensitive' },
          },
        ],
      },
      select: { aic: true },
    }),
    client.farmaco.findFirst({
      where: { denominazioneNorm: nucleoNome(hints.base) },
      select: { aic: true },
    }),
  ]);
  if (full) known.add(normalizza(hints.full));
  if (base) known.add(normalizza(hints.base));
  return known;
}
