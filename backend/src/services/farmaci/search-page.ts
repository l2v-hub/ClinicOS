import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { normalizza } from './normalizza.js';
import { FarmaciQueryError, packageMatches, parseDrugQuery, parseSearchInput } from './query.js';
import { SELEZIONE, componi, distanza, type RigaDb, type FarmacoTrovato } from './search-model.js';
import { catalogNames, knownQueryNames } from './search-index.js';
export { invalidaCacheNomi } from './search-index.js';

type Client = typeof prisma;
type Stage = {
  where: Prisma.FarmacoWhereInput;
  confidence: number;
  criterion: FarmacoTrovato['criterio'];
  distance?: number;
  stopAfterMatches?: boolean;
};
type Position = { tier: number; last: [string, string] | null; matched: boolean };
const BATCH_SIZE = 128;
export const MAX_CANDIDATES_PER_PAGE = 1024;
function fingerprint(q: string, perPa: boolean, limit: number) {
  return createHash('sha256')
    .update(JSON.stringify(['farmaci-v2', q, perPa, limit]))
    .digest('hex');
}
function encode(position: Position, hash: string) {
  return Buffer.from(JSON.stringify({ v: 2, hash, ...position })).toString('base64url');
}
function decode(cursor: string | undefined, hash: string): Position {
  if (!cursor) return { tier: 0, last: null, matched: false };
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error();
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (
      value.v !== 2 ||
      value.hash !== hash ||
      !Number.isInteger(value.tier) ||
      value.tier < 0 ||
      value.tier > 5 ||
      typeof value.matched !== 'boolean' ||
      !(
        value.last === null ||
        (Array.isArray(value.last) &&
          value.last.length === 2 &&
          value.last.every((part: unknown) => typeof part === 'string' && part.length <= 300))
      )
    )
      throw new Error();
    return { tier: value.tier, last: value.last, matched: value.matched };
  } catch {
    throw new FarmaciQueryError('Cursore non valido per questa ricerca');
  }
}
function after(last: Position['last']): Prisma.FarmacoWhereInput {
  return last
    ? {
        OR: [
          { denominazioneNorm: { gt: last[0] } },
          { denominazioneNorm: last[0], aic: { gt: last[1] } },
        ],
      }
    : {};
}
function nameDistance(name: string, candidate: string, threshold: number) {
  return Math.min(
    distanza(name, candidate, threshold),
    distanza(name, candidate.split(' ')[0], threshold),
  );
}
function searchStages(name: string, perPa: boolean, aic?: string): Stage[] {
  if (aic) return [{ where: { aic }, confidence: 1, criterion: 'esatto' }];
  const ingredient: Prisma.FarmacoWhereInput = {
    principiAttivi: { some: { principioAttivoNorm: { startsWith: normalizza(name) } } },
  };
  if (perPa) return [{ where: ingredient, confidence: 0.8, criterion: 'principio-attivo' }];
  const threshold = name.length <= 6 ? 1 : name.length <= 12 ? 2 : 3;
  const prefix: Prisma.FarmacoWhereInput = { denominazioneNorm: { startsWith: name } };
  return [
    { where: { denominazioneNorm: name }, confidence: 1, criterion: 'esatto' },
    {
      where: { AND: [prefix, { NOT: { denominazioneNorm: name } }] },
      confidence: 0.9,
      criterion: 'prefisso',
      stopAfterMatches: true,
    },
    ...[1, 2, 3].map((distance, index): Stage => ({
      where: distance <= threshold ? { NOT: prefix } : { aic: { in: [] } },
      confidence: 0.75 - index * 0.1,
      criterion: 'approssimato',
      distance,
      stopAfterMatches: distance === 3,
    })),
    {
      where: ingredient,
      confidence: 0.8,
      criterion: 'principio-attivo',
    },
  ];
}

/** Bounded candidate scans. Filtering happens before the output limit, with no lost tail. */
export async function cercaPaginaFarmaci(
  testo: string,
  options: { limite?: number; cursor?: string; perPa?: boolean; client?: Client } = {},
) {
  const input = parseSearchInput(testo, options.limite, options.cursor);
  const client = options.client ?? prisma;
  const perPa = options.perPa === true;
  const hash = fingerprint(input.q, perPa, input.limit);
  let position = decode(input.cursor, hash);
  const known = /^\d{9}$/.test(input.q)
    ? new Set<string>()
    : await knownQueryNames(input.q, client);
  const query = parseDrugQuery(input.q, known);
  if (!query.name) throw new FarmaciQueryError('Indica il nome del farmaco o del principio attivo');
  const stages = searchStages(query.name, perPa, query.aic);
  if (position.tier >= stages.length)
    throw new FarmaciQueryError('Cursore non valido per questa ricerca');
  const esiti: FarmacoTrovato[] = [];
  let scanned = 0;
  let fuzzyGroups: string[][] | null | undefined;
  const threshold = query.name.length <= 6 ? 1 : query.name.length <= 12 ? 2 : 3;
  while (position.tier < stages.length) {
    const stage = stages[position.tier];
    let where = stage.where;
    if (stage.distance) {
      if (fuzzyGroups === undefined) {
        const names = await catalogNames(client);
        fuzzyGroups = names === null ? null : [[], [], []];
        for (const name of names ?? []) {
          if (name.startsWith(query.name)) continue;
          const distance = nameDistance(query.name, name, threshold);
          if (distance >= 1 && distance <= threshold) fuzzyGroups![distance - 1].push(name);
        }
      }
      if (fuzzyGroups) where = { denominazioneNorm: { in: fuzzyGroups[stage.distance - 1] } };
    }
    const size = Math.min(BATCH_SIZE, MAX_CANDIDATES_PER_PAGE - scanned);
    const rows = await client.farmaco.findMany({
      where: { AND: [where, after(position.last)] },
      select: { ...SELEZIONE, denominazioneNorm: true },
      orderBy: [{ denominazioneNorm: 'asc' }, { aic: 'asc' }],
      take: size,
    });
    for (const row of rows) {
      const before = position;
      position = { ...position, last: [row.denominazioneNorm, row.aic] };
      scanned++;
      if (
        stage.distance &&
        fuzzyGroups === null &&
        nameDistance(query.name, row.denominazioneNorm, threshold) !== stage.distance
      )
        continue;
      if (!packageMatches(query, row)) continue;
      if (esiti.length === input.limit)
        return { esiti, pageInfo: { hasMore: true, nextCursor: encode(before, hash) } };
      esiti.push(componi(row as RigaDb, stage.confidence, stage.criterion));
      position = { ...position, matched: true };
    }
    if (rows.length < size) {
      if (stage.stopAfterMatches && position.matched) break;
      position = { ...position, tier: position.tier + 1, last: null };
    }
    if (scanned >= MAX_CANDIDATES_PER_PAGE && position.tier < stages.length)
      return { esiti, pageInfo: { hasMore: true, nextCursor: encode(position, hash) } };
  }
  return { esiti, pageInfo: { hasMore: false, nextCursor: null } };
}
