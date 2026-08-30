import { prisma } from '../lib/prisma.js';

export async function createTestOperator(id: string, email: string): Promise<() => Promise<void>> {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: 'TEST_ONLY_NOT_A_REAL_HASH',
      fullName: id,
      role: 'OPERATOR',
    },
  });
  await prisma.operator.upsert({
    where: { id },
    update: {},
    create: { id, userId: user.id, ruolo: 'operatore' },
  });
  return async () => {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  };
}
