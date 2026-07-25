// Ricaricamento dell'anagrafica farmaci AIFA.
//
//   npx tsx src/scripts/importa-farmaci.ts
//
// Pensato per due usi: a mano, quando serve, e dal ricaricamento periodico. E' idempotente —
// ogni esecuzione sostituisce l'intera anagrafica con l'istantanea corrente di AIFA.

import { importaAnagraficaFarmaci } from '../services/farmaci/import.js';
import { invalidaIndice } from '../services/farmaci/ricerca.js';
import { prisma } from '../lib/prisma.js';

async function main(): Promise<void> {
  const avvio = Date.now();
  console.log('[farmaci] avvio ricaricamento anagrafica AIFA…');
  const esito = await importaAnagraficaFarmaci();
  // L'indice dei nomi in memoria si riferisce all'anagrafica precedente: va buttato,
  // altrimenti la ricerca approssimata continuerebbe a proporre voci non piu' esistenti.
  invalidaIndice();
  console.log(
    `[farmaci] completato: ${esito.righeScritte} righe scritte su ${esito.righeLette} lette ` +
      `in ${Math.round((Date.now() - avvio) / 1000)}s`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[farmaci] FALLITO:', err instanceof Error ? err.message : err);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });
