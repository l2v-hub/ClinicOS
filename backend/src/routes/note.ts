import { prisma } from '../lib/prisma.js';
import { Router } from 'express';

const noteRouter = Router();

// ═══════════════════════════════════════════════════════════════════════════
// NOTE / MESSAGGI CRUD — mounted at /notes
// ═══════════════════════════════════════════════════════════════════════════

const PRIORITA = ['normale', 'alta', 'urgente'];
const STATO = ['non_letta', 'letta', 'risolta'];

// GET /notes
noteRouter.get('/', async (_req, res) => {
  try {
    const note = await prisma.nota.findMany({ orderBy: { createdAt: 'desc' } });
    res.status(200).json(note);
  } catch (error) {
    console.error('GET /notes error:', error);
    res.status(500).json({ error: 'Errore nel recupero note' });
  }
});

// POST /notes
noteRouter.post('/', async (req, res) => {
  const body = req.body as Record<string, unknown>;

  if (!body.messaggio || !body.autoreId) {
    res.status(400).json({ error: 'Campi obbligatori: autoreId, messaggio' });
    return;
  }

  try {
    const nota = await prisma.nota.create({
      data: {
        autoreId: String(body.autoreId),
        autoreNome: String(body.autoreNome ?? ''),
        destinatarioId: String(body.destinatarioId ?? 'tutti'),
        destinatarioNome: String(body.destinatarioNome ?? 'Tutti gli operatori'),
        pazienteId: body.pazienteId ? String(body.pazienteId) : null,
        pazienteNome: body.pazienteNome ? String(body.pazienteNome) : null,
        priorita: PRIORITA.includes(String(body.priorita)) ? String(body.priorita) : 'normale',
        messaggio: String(body.messaggio),
        stato: STATO.includes(String(body.stato)) ? String(body.stato) : 'non_letta',
      },
    });
    console.log(`POST /notes → created id=${nota.id}`);
    res.status(201).json(nota);
  } catch (error) {
    console.error('POST /notes error:', error);
    res.status(500).json({ error: 'Errore durante creazione nota' });
  }
});

// PUT /notes/:id
noteRouter.put('/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;

  try {
    const existing = await prisma.nota.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Nota non trovata' });
      return;
    }

    const allowed = [
      'destinatarioId',
      'destinatarioNome',
      'pazienteId',
      'pazienteNome',
      'priorita',
      'messaggio',
      'stato',
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] === undefined) continue;
      if (key === 'priorita' && !PRIORITA.includes(String(body[key]))) continue;
      if (key === 'stato' && !STATO.includes(String(body[key]))) continue;
      if (key === 'pazienteId' || key === 'pazienteNome') {
        updates[key] = body[key] ? String(body[key]) : null;
      } else {
        updates[key] = body[key];
      }
    }

    const nota = await prisma.nota.update({ where: { id }, data: updates });
    console.log(`PUT /notes/${id} → updated`);
    res.status(200).json(nota);
  } catch (error) {
    console.error('PUT /notes/:id error:', error);
    res.status(500).json({ error: 'Errore durante aggiornamento nota' });
  }
});

// DELETE /notes/:id
noteRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.nota.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Nota non trovata' });
      return;
    }
    await prisma.nota.delete({ where: { id } });
    console.log(`DELETE /notes/${id} → deleted`);
    res.status(204).send();
  } catch (error) {
    console.error('DELETE /notes/:id error:', error);
    res.status(500).json({ error: 'Errore durante eliminazione nota' });
  }
});

export default noteRouter;
