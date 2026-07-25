// Diagnostica dell'anagrafica farmaci: da eseguire dopo un ricaricamento per vedere,
// con i dati veri, come si comporta la ricerca sui casi che l'operatore incontra davvero.
//
//   npx tsx src/scripts/verifica-farmaci.ts
//
// Non modifica nulla: legge soltanto.

import {
  cercaFarmaci,
  dosaggiInCommercio,
  dosaggioPlausibile,
} from '../services/farmaci/ricerca.js';
import { prisma } from '../lib/prisma.js';

// Casi scelti apposta: nome corretto, nome storpiato come lo restituisce un OCR,
// principio attivo al posto del nome commerciale, farmaco di fascia C.
const CASI = [
  'Cardioaspirin 100',
  'Cardioasprina 100',
  'Tachipirina 1000 mg',
  'Metformna 500',
  'ramipril',
];

async function main(): Promise<void> {
  const confezioni = await prisma.farmaco.count();
  const principi = await prisma.farmacoPrincipioAttivo.count();
  const ultimo = await prisma.farmacoImport.findFirst({ orderBy: { eseguitoIl: 'desc' } });
  console.log(`anagrafica: ${confezioni} confezioni, ${principi} principi attivi`);
  console.log(
    `ultimo caricamento: ${ultimo ? `${ultimo.esito} il ${ultimo.eseguitoIl.toISOString()}` : 'mai'}`,
  );
  console.log('');

  for (const caso of CASI) {
    const esiti = await cercaFarmaci(caso, { limite: 3 });
    const primo = esiti[0];
    if (!primo) {
      console.log(`  "${caso}" -> nessun riscontro`);
      continue;
    }
    console.log(
      `  "${caso}" -> ${primo.denominazione} ` +
        `[${primo.criterio}, confidenza ${primo.confidenza.toFixed(2)}] ` +
        `ATC ${primo.atc ?? '-'} · ${primo.statoAmministrativo}`,
    );
  }

  console.log('');
  const dosi = await dosaggiInCommercio('RAMIPRIL');
  console.log(
    'dosaggi Ramipril in commercio:',
    dosi.map((d) => `${d.quantita} ${d.unita}`).join(', '),
  );
  console.log(
    '  "Ramipril 5 mg" ->',
    JSON.stringify(await dosaggioPlausibile('Ramipril 5 mg', 'RAMIPRIL')),
  );
  console.log(
    '  "Ramipril 7 mg" ->',
    JSON.stringify(await dosaggioPlausibile('Ramipril 7 mg', 'RAMIPRIL')),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('FALLITO:', err instanceof Error ? err.message : err);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });
