// Server-authoritative diary authorship (moved verbatim from routes/patient-diary.ts so the route
// and the Tool Layer share the same rule). Client author fields are never trusted.

import type { Operator } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';

const DIARY_AUTHOR_TYPES = new Set([
  'medico',
  'infermiere',
  'oss',
  'fisioterapista',
  'operatore',
  'altro',
]);

export async function authoritativeDiaryAuthor(operator: Operator): Promise<{
  authorType: string;
  authorName: string;
  /** UX2 W8: the author's operator id (the author never takes charge of their own urgency). */
  authorId: string;
}> {
  const row = await prisma.operator.findUnique({
    where: { id: operator.id },
    select: { ruolo: true, user: { select: { fullName: true } } },
  });
  if (!row) throw new Error('operator_not_mapped');
  const normalizedRole = row.ruolo?.trim().toLowerCase() ?? '';
  return {
    authorType: DIARY_AUTHOR_TYPES.has(normalizedRole) ? normalizedRole : 'operatore',
    authorName: row.user.fullName.trim() || operator.name?.trim() || operator.id,
    authorId: operator.id,
  };
}
