import type { PrismaClient } from '@prisma/client';

type OperatorWithUser = {
  id: string;
  createdAt: Date;
  department: string | null;
  phone?: string | null;
  ruolo: string | null;
  qualifica: string | null;
  user: { email?: string; fullName: string; isActive: boolean };
  _count?: { registeredPatients?: number; appointments?: number };
};

// Existing name convention, projection and date/count helpers; not authorization policy.
export function splitFullName(fullName: string): { nome: string; cognome: string } {
  const parts = fullName.trim().split(/\s+/);
  return { nome: parts[0] ?? '', cognome: parts.slice(1).join(' ') };
}

export function toOperatore(op: OperatorWithUser, appuntamentiOggi: number) {
  const { nome, cognome } = splitFullName(op.user.fullName);
  return {
    id: op.id,
    nome,
    cognome,
    ruolo: op.ruolo ?? '',
    email: op.user.email ?? '',
    telefono: op.phone ?? '',
    reparto: op.department ?? '',
    stato: op.user.isActive ? 'attivo' : 'inattivo',
    qualifica: op.qualifica ?? '',
    pazientiAssegnati: op._count?.registeredPatients ?? 0,
    appuntamentiOggi,
  };
}

export function toDirectoryOperatore(op: OperatorWithUser, appuntamentiOggi: number) {
  const { nome, cognome } = splitFullName(op.user.fullName);
  return {
    id: op.id,
    nome,
    cognome,
    ruolo: op.ruolo ?? '',
    email: '',
    telefono: '',
    reparto: op.department ?? '',
    stato: op.user.isActive ? 'attivo' : 'inattivo',
    qualifica: op.qualifica ?? '',
    pazientiAssegnati: 0,
    appuntamentiOggi,
  };
}

export function todayRange(): { gte: Date; lte: Date } {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  return { gte: from, lte: to };
}

export async function appointmentsTodayForOperator(
  prisma: Pick<PrismaClient, 'appointment'>,
  operatorId: string,
): Promise<number> {
  return prisma.appointment.count({ where: { operatorId, scheduledAt: todayRange() } });
}
