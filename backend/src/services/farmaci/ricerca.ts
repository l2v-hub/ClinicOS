// Backwards-compatible array API; the paged search shares one query/filtering path.
import { prisma } from '../../lib/prisma.js';
import { normalizza, dosaggiCitati } from './normalizza.js';
import { cercaPaginaFarmaci, invalidaCacheNomi } from './search-page.js';
import type { FarmacoTrovato } from './search-model.js';
export { distanza } from './search-model.js';
export type { FarmacoTrovato } from './search-model.js';
export { cercaPaginaFarmaci } from './search-page.js';

export const invalidaIndice = invalidaCacheNomi;
const MAX_LEGACY_PAGES = 16;
async function arraySearch(
  testo: string,
  options: { limite?: number; client?: typeof prisma; perPa?: boolean },
) {
  if (!testo.trim()) return [];
  const results: FarmacoTrovato[] = [];
  const limit = options.limite ?? 8;
  let cursor: string | undefined;
  for (let page = 0; page < MAX_LEGACY_PAGES; page++) {
    const next = await cercaPaginaFarmaci(testo, { ...options, cursor });
    results.push(...next.esiti);
    if (results.length >= limit || !next.pageInfo.hasMore) return results.slice(0, limit);
    cursor = next.pageInfo.nextCursor!;
  }
  throw new Error('Ricerca farmaci incompleta: usare cercaPaginaFarmaci per continuare');
}
export async function cercaFarmaci(
  testo: string,
  opzioni: { limite?: number; client?: typeof prisma } = {},
) {
  return arraySearch(testo, opzioni);
}
export async function cercaPerPrincipioAttivo(
  testo: string,
  opzioni: { limite?: number; client?: typeof prisma } = {},
) {
  return arraySearch(testo, { ...opzioni, perPa: true });
}

/**
 * Dosaggi realmente in commercio per un principio attivo: e' cio' che si propone
 * all'operatore quando la lettera cita il farmaco senza la dose.
 */
export async function dosaggiInCommercio(
  principioAttivo: string,
  opzioni: { client?: typeof prisma } = {},
): Promise<Array<{ quantita: number; unita: string }>> {
  const { client = prisma } = opzioni;
  const pa = normalizza(principioAttivo);
  if (!pa) return [];
  const righe = await client.farmacoPrincipioAttivo.findMany({
    where: { principioAttivoNorm: { startsWith: pa }, quantita: { not: null } },
    select: { quantita: true, unitaMisura: true },
    take: 5000,
  });
  const visti = new Map<string, { quantita: number; unita: string }>();
  for (const r of righe) {
    if (r.quantita == null || !r.unitaMisura) continue;
    const chiave = `${r.quantita}|${r.unitaMisura}`;
    if (!visti.has(chiave)) visti.set(chiave, { quantita: r.quantita, unita: r.unitaMisura });
  }
  return [...visti.values()].sort((a, b) => a.quantita - b.quantita);
}

/**
 * Verifica se il dosaggio citato nel testo corrisponde a una confezione in commercio.
 * Un "no" quasi sempre significa errore di lettura, non prescrizione anomala: per questo
 * il risultato e' un'informazione da mostrare, mai un blocco.
 */
export async function dosaggioPlausibile(
  testo: string,
  principioAttivo: string,
  opzioni: { client?: typeof prisma } = {},
): Promise<{ verificabile: boolean; plausibile: boolean; disponibili: number[] }> {
  const citati = dosaggiCitati(testo);
  const disponibili = await dosaggiInCommercio(principioAttivo, opzioni);
  const valori = disponibili.map((d) => d.quantita);
  if (!citati.length || !disponibili.length) {
    return { verificabile: false, plausibile: true, disponibili: valori };
  }
  const plausibile = citati.some((c) =>
    disponibili.some(
      (d) =>
        Math.abs(d.quantita - c.valore) < 0.001 &&
        d.unita.toLowerCase().startsWith(c.unita[0].toLowerCase()),
    ),
  );
  return { verificabile: true, plausibile, disponibili: valori };
}
