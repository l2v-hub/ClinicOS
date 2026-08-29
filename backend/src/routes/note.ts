import { Router } from 'express';
import type { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireOperator, type AuthedRequest, type Operator } from '../ai/auth.js';
import {
  encodeNotesCursor,
  buildNotesTsQuery,
  isSafeNoteId,
  NotesInputError,
  parseNotesListQuery,
} from '../notes/query.js';
import { parseNoteCreateBody, parseNotePatchBody } from '../notes/write-validation.js';

const noteRouter = Router();
const PRIVILEGED_ROLES = new Set(['admin', 'manager']);
const NOTE_SELECT = {
  id: true,
  autoreId: true,
  autoreNome: true,
  destinatarioId: true,
  destinatarioNome: true,
  pazienteId: true,
  pazienteNome: true,
  priorita: true,
  messaggio: true,
  stato: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.NotaSelect;
type NoteRow = Prisma.NotaGetPayload<{ select: typeof NOTE_SELECT }>;
type NoteRowWithRecipientState = NoteRow & { recipientStates?: Array<{ stato: string }> };

// Le note possono contenere dati clinici: nessuna risposta, inclusi errori di auth, è cacheabile.
noteRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
noteRouter.use(requireOperator);

function privileged(actor: Operator): boolean {
  return PRIVILEGED_ROLES.has(actor.role.toLowerCase());
}

function receivedWhere(actor: Operator): Prisma.NotaWhereInput {
  return {
    AND: [{ destinatarioId: { in: receivedIds(actor) } }, { autoreId: { not: actor.id } }],
  };
}

function unreadWhere(actor: Operator): Prisma.NotaWhereInput {
  return {
    AND: [
      receivedWhere(actor),
      {
        OR: [
          { recipientStates: { some: { operatorId: actor.id, stato: 'non_letta' } } },
          {
            AND: [{ recipientStates: { none: { operatorId: actor.id } } }, { stato: 'non_letta' }],
          },
        ],
      },
    ],
  };
}

function visibleWhere(actor: Operator): Prisma.NotaWhereInput {
  return { OR: [{ autoreId: actor.id }, receivedWhere(actor)] };
}

function managedNoteWhere(id: string, actor: Operator): Prisma.NotaWhereInput {
  return privileged(actor) ? { id } : { AND: [{ id }, visibleWhere(actor)] };
}

function receivedIds(actor: Operator): string[] {
  return [actor.id, 'tutti', ...(privileged(actor) ? ['admin'] : [])];
}

function sqlBoxWhere(box: 'all' | 'received' | 'sent' | 'unread', actor: Operator): Prisma.Sql {
  const incoming = Prisma.sql`n."destinatarioId" IN (${Prisma.join(receivedIds(actor))}) AND n."autoreId" <> ${actor.id}`;
  if (box === 'received') return incoming;
  if (box === 'sent') return Prisma.sql`n."autoreId" = ${actor.id}`;
  if (box === 'unread') {
    return Prisma.sql`${incoming} AND coalesce(rs."stato", n."stato") = 'non_letta'`;
  }
  return Prisma.sql`(n."autoreId" = ${actor.id} OR (${incoming}))`;
}

function sqlCursorWhere(cursor?: { createdAt: Date; id: string }): Prisma.Sql {
  return cursor
    ? Prisma.sql`AND (n."createdAt" < ${cursor.createdAt} OR (n."createdAt" = ${cursor.createdAt} AND n."id" < ${cursor.id}))`
    : Prisma.empty;
}

const NOTE_SQL_COLUMNS = Prisma.raw(`
  n."id", n."autoreId", n."autoreNome", n."destinatarioId", n."destinatarioNome",
  n."pazienteId", n."pazienteNome", n."priorita", n."messaggio", n."stato",
  n."createdAt", n."updatedAt"`);

function sqlMailboxSource(
  box: 'all' | 'received' | 'sent',
  actor: Operator,
  cursor: { createdAt: Date; id: string } | undefined,
  take: number,
): Prisma.Sql {
  const sent = Prisma.sql`
    SELECT ${NOTE_SQL_COLUMNS}
      FROM "Nota" n
     WHERE n."autoreId" = ${actor.id} ${sqlCursorWhere(cursor)}
     ORDER BY n."createdAt" DESC, n."id" DESC
     LIMIT ${take}`;
  const received = Prisma.sql`
    SELECT ${NOTE_SQL_COLUMNS}
      FROM "Nota" n
     WHERE n."destinatarioId" IN (${Prisma.join(receivedIds(actor))})
       AND n."autoreId" <> ${actor.id}
       ${sqlCursorWhere(cursor)}
     ORDER BY n."createdAt" DESC, n."id" DESC
     LIMIT ${take}`;
  if (box === 'sent') return sent;
  if (box === 'received') return received;
  return Prisma.sql`(${sent}) UNION ALL (${received})`;
}

function sqlBoundedMailboxPage(
  box: 'all' | 'received' | 'sent',
  actor: Operator,
  cursor: { createdAt: Date; id: string } | undefined,
  take: number,
): Prisma.Sql {
  return Prisma.sql`
    SELECT
      b."id", b."autoreId", b."autoreNome", b."destinatarioId", b."destinatarioNome",
      b."pazienteId", b."pazienteNome", b."priorita", b."messaggio",
      CASE
        WHEN b."autoreId" <> ${actor.id}
          AND b."destinatarioId" IN (${Prisma.join(receivedIds(actor))})
        THEN coalesce(rs."stato", b."stato")
        ELSE b."stato"
      END AS "stato",
      b."createdAt", b."updatedAt"
    FROM (${sqlMailboxSource(box, actor, cursor, take)}) b
    LEFT JOIN "NotaRecipientState" rs
      ON rs."notaId" = b."id" AND rs."operatorId" = ${actor.id}
    ORDER BY b."createdAt" DESC, b."id" DESC
    LIMIT ${take}`;
}

function isIncomingForActor(note: Pick<NoteRow, 'autoreId' | 'destinatarioId'>, actor: Operator) {
  return note.autoreId !== actor.id && receivedIds(actor).includes(note.destinatarioId);
}

function notFound(res: Response): void {
  res.status(404).json({ error: 'Nota non trovata' });
}

function badRequest(res: Response, error: unknown): boolean {
  if (!(error instanceof NotesInputError)) return false;
  res.status(400).json({ error: error.message });
  return true;
}

async function resolveAuthorName(actor: Operator): Promise<string> {
  if (actor.name?.trim()) return actor.name.trim();
  const operator = await prisma.operator.findUnique({
    where: { id: actor.id },
    select: { user: { select: { fullName: true } } },
  });
  return operator?.user.fullName.trim() || actor.id;
}

async function resolveDestination(id: string): Promise<{ id: string; name: string }> {
  if (id === 'tutti') return { id, name: 'Tutti gli operatori' };
  if (id === 'admin') return { id, name: 'Amministrazione' };
  const operator = await prisma.operator.findFirst({
    where: { id, user: { isActive: true } },
    select: { id: true, user: { select: { fullName: true } } },
  });
  if (!operator) throw new NotesInputError('Destinatario non disponibile');
  return { id: operator.id, name: operator.user.fullName };
}

async function resolvePatient(id: string | null): Promise<{ id: string; name: string } | null> {
  if (!id) return null;
  const patient = await prisma.patient.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!patient) throw new NotesInputError('Paziente non disponibile');
  return { id: patient.id, name: `${patient.lastName}, ${patient.firstName}` };
}

// GET /notes?box=all|received|sent|unread&q=...&limit=50&cursor=...
noteRouter.get('/', async (req: AuthedRequest, res) => {
  const actor = req.operator!;
  try {
    const input = parseNotesListQuery(req.query as Record<string, unknown>);
    const incoming = receivedWhere(actor);
    const boxWhere: Prisma.NotaWhereInput =
      input.box === 'received'
        ? incoming
        : input.box === 'sent'
          ? { autoreId: actor.id }
          : input.box === 'unread'
            ? unreadWhere(actor)
            : visibleWhere(actor);
    const cursorWhere: Prisma.NotaWhereInput | undefined = input.cursor
      ? {
          OR: [
            { createdAt: { lt: input.cursor.createdAt } },
            { createdAt: input.cursor.createdAt, id: { lt: input.cursor.id } },
          ],
        }
      : undefined;
    const where: Prisma.NotaWhereInput = {
      AND: [boxWhere, ...(cursorWhere ? [cursorWhere] : [])],
    };

    const pageQuery = input.q
      ? prisma.$queryRaw<NoteRow[]>(Prisma.sql`
          SELECT
            n."id", n."autoreId", n."autoreNome", n."destinatarioId", n."destinatarioNome",
            n."pazienteId", n."pazienteNome", n."priorita", n."messaggio",
            CASE
              WHEN n."autoreId" <> ${actor.id}
                AND n."destinatarioId" IN (${Prisma.join(receivedIds(actor))})
              THEN coalesce(rs."stato", n."stato")
              ELSE n."stato"
            END AS "stato",
            n."createdAt", n."updatedAt"
          FROM "Nota" n
          LEFT JOIN "NotaRecipientState" rs
            ON rs."notaId" = n."id" AND rs."operatorId" = ${actor.id}
          WHERE ${sqlBoxWhere(input.box, actor)}
            AND to_tsvector(
              'simple'::regconfig,
              coalesce(n."messaggio", '') || ' ' || coalesce(n."autoreNome", '') || ' ' ||
              coalesce(n."destinatarioNome", '') || ' ' || coalesce(n."pazienteNome", '')
            ) @@ to_tsquery('simple'::regconfig, ${buildNotesTsQuery(input.q)})
            ${
              input.cursor
                ? Prisma.sql`AND (n."createdAt" < ${input.cursor.createdAt} OR (n."createdAt" = ${input.cursor.createdAt} AND n."id" < ${input.cursor.id}))`
                : Prisma.empty
            }
          ORDER BY n."createdAt" DESC, n."id" DESC
          LIMIT ${input.limit + 1}
        `)
      : input.box !== 'unread'
        ? prisma.$queryRaw<NoteRow[]>(
            sqlBoundedMailboxPage(input.box, actor, input.cursor, input.limit + 1),
          )
        : prisma.nota.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: input.limit + 1,
            select: {
              ...NOTE_SELECT,
              recipientStates: {
                where: { operatorId: actor.id },
                select: { stato: true },
              },
            },
          });

    const [rows, unread] = await prisma.$transaction([
      pageQuery,
      prisma.nota.count({ where: unreadWhere(actor) }),
    ]);
    const normalizedRows = (rows as NoteRowWithRecipientState[]).map((row) => {
      const { recipientStates, ...note } = row;
      return {
        ...note,
        stato:
          isIncomingForActor(note, actor) && recipientStates?.[0]
            ? recipientStates[0].stato
            : note.stato,
      };
    });
    const hasMore = normalizedRows.length > input.limit;
    const items = hasMore ? normalizedRows.slice(0, input.limit) : normalizedRows;
    const last = items.at(-1);
    res.status(200).json({
      items,
      pageInfo: {
        hasMore,
        nextCursor:
          hasMore && last ? encodeNotesCursor({ createdAt: last.createdAt, id: last.id }) : null,
      },
      summary: { unread },
    });
  } catch (error) {
    if (badRequest(res, error)) return;
    console.error('GET /notes error:', error);
    res.status(500).json({ error: 'Errore nel recupero note' });
  }
});

// POST /notes — autore e nomi sono sempre derivati dall'identità e dal database.
noteRouter.post('/', async (req: AuthedRequest, res) => {
  const actor = req.operator!;
  try {
    const input = parseNoteCreateBody(req.body);
    const [authorName, destination, patient] = await Promise.all([
      resolveAuthorName(actor),
      resolveDestination(input.destinatarioId),
      resolvePatient(input.pazienteId),
    ]);
    const nota = await prisma.nota.create({
      data: {
        autoreId: actor.id,
        autoreNome: authorName,
        destinatarioId: destination.id,
        destinatarioNome: destination.name,
        pazienteId: patient?.id ?? null,
        pazienteNome: patient?.name ?? null,
        priorita: input.priorita,
        messaggio: input.messaggio,
        stato: 'non_letta',
      },
      select: NOTE_SELECT,
    });
    res.status(201).json(nota);
  } catch (error) {
    if (badRequest(res, error)) return;
    console.error('POST /notes error:', error);
    res.status(500).json({ error: 'Errore durante creazione nota' });
  }
});

// PUT /notes/:id — autore/admin possono modificare il contenuto; un destinatario può solo stato.
noteRouter.put('/:id', async (req: AuthedRequest, res) => {
  const actor = req.operator!;
  const id = req.params.id;
  if (typeof id !== 'string' || !isSafeNoteId(id)) {
    notFound(res);
    return;
  }
  try {
    const existing = await prisma.nota.findFirst({
      where: managedNoteWhere(id, actor),
      select: NOTE_SELECT,
    });
    if (!existing) {
      notFound(res);
      return;
    }
    const patch = parseNotePatchBody(req.body);
    const mayEditContent = privileged(actor) || existing.autoreId === actor.id;
    if (!mayEditContent && Object.keys(patch).some((key) => key !== 'stato')) {
      notFound(res);
      return;
    }

    const personalStatusOnly =
      patch.stato !== undefined &&
      Object.keys(patch).length === 1 &&
      isIncomingForActor(existing, actor);
    if (personalStatusOnly) {
      const state = await prisma.notaRecipientState.upsert({
        where: { notaId_operatorId: { notaId: existing.id, operatorId: actor.id } },
        create: { notaId: existing.id, operatorId: actor.id, stato: patch.stato! },
        update: { stato: patch.stato! },
        select: { stato: true },
      });
      res.status(200).json({ ...existing, stato: state.stato });
      return;
    }

    const [destination, patient] = await Promise.all([
      patch.destinatarioId !== undefined ? resolveDestination(patch.destinatarioId) : null,
      patch.pazienteId !== undefined ? resolvePatient(patch.pazienteId) : null,
    ]);
    const data: Prisma.NotaUpdateInput = {
      ...(destination
        ? { destinatarioId: destination.id, destinatarioNome: destination.name }
        : {}),
      ...(patch.pazienteId !== undefined
        ? { pazienteId: patient?.id ?? null, pazienteNome: patient?.name ?? null }
        : {}),
      ...(patch.priorita !== undefined ? { priorita: patch.priorita } : {}),
      ...(patch.messaggio !== undefined ? { messaggio: patch.messaggio } : {}),
      ...(patch.stato !== undefined ? { stato: patch.stato } : {}),
    };
    const update = prisma.nota.update({
      where: { id: existing.id },
      data,
      select: NOTE_SELECT,
    });
    const nota = patch.stato
      ? (
          await prisma.$transaction([
            update,
            prisma.notaRecipientState.deleteMany({ where: { notaId: existing.id } }),
          ])
        )[0]
      : await update;
    res.status(200).json(nota);
  } catch (error) {
    if (badRequest(res, error)) return;
    console.error('PUT /notes/:id error:', error);
    res.status(500).json({ error: 'Errore durante aggiornamento nota' });
  }
});

noteRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const actor = req.operator!;
  const id = req.params.id;
  if (typeof id !== 'string' || !isSafeNoteId(id)) {
    notFound(res);
    return;
  }
  try {
    const existing = await prisma.nota.findFirst({
      where: managedNoteWhere(id, actor),
      select: { id: true, autoreId: true },
    });
    if (!existing || (!privileged(actor) && existing.autoreId !== actor.id)) {
      notFound(res);
      return;
    }
    await prisma.nota.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (error) {
    console.error('DELETE /notes/:id error:', error);
    res.status(500).json({ error: 'Errore durante eliminazione nota' });
  }
});

export default noteRouter;
