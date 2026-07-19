# Final Summary

**Agents run:** 1
**Dry-run:** false

## Last agent output

FILE: backend/src/app.ts
import express from 'express';
import prisma from './lib/prisma.js';

const app = express();

app.use(express.json());

void prisma
.$connect()
.then(() => {
console.log('Prisma client connected to the database successfully.');
})
.catch((error: unknown) => {
console.error('Failed to connect to the database with Prisma.', error);
});

app.get('/health', async (_req, res) => {
try {
await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: 'ok',
      service: 'clinicos-backend',
      database: 'connected',
    });

} catch (error) {
console.error('Health check database query failed.', error);

    res.status(500).json({
      status: 'error',
      service: 'clinicos-backend',
      database: 'disconnected',
    });

}
});

export default app;
END FILE
FILE: backend/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
prisma?: PrismaClient;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
globalForPrisma.prisma = prisma;
}

export { prisma };
export default prisma;
END FILE
