// Bootstrap before importing the old suites: their top-level Prisma imports must
// never resolve an inherited or project production DATABASE_URL.
import { after } from 'node:test';
import {
  startParameterDatabase,
  selectLocalParameterDatabase,
  closeParameterPrisma,
} from '../fixtures/parameter-database.mjs';
const db = await startParameterDatabase();
selectLocalParameterDatabase(db.url);
await import('../../backend/src/ai/__tests__/intake-confirm.test.ts');
await import('../../backend/src/intake/__tests__/confirm-draft-guards.test.ts');
await import('../../backend/src/intake/__tests__/confirm-draft-therapy.test.ts');
const { prisma } = await import('../../backend/src/lib/prisma.js');
after(async () => {
  await closeParameterPrisma(prisma);
  await db.close();
});
