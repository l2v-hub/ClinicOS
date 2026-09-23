import { after } from 'node:test';
import {
  startParameterDatabase,
  selectLocalParameterDatabase,
  closeParameterPrisma,
} from '../fixtures/parameter-database.mjs';
const database = await startParameterDatabase();
selectLocalParameterDatabase(database.url);
await import('../../backend/src/ai/__tests__/intake-draft.test.ts');
await import('../../backend/src/intake/__tests__/seed-draft-from-import.test.ts');
const { prisma } = await import('../../backend/src/lib/prisma.js');
after(async () => {
  await closeParameterPrisma(prisma);
  await database.close();
});
