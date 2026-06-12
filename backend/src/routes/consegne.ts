import { prisma } from '../lib/prisma.js';
import { Router } from 'express';

const consegneRouter = Router();

// ═══════════════════════════════════════════════════════════════════════════
// CONSEGNE (handover cards) CRUD — mounted at /consegne
// ═══════════════════════════════════════════════════════════════════════════

const PRIORITA = ['normale', 'alta', 'urgente'];
const STATO = ['aperta', 'in_corso', 'completata'];

// GET /consegne
consegneRouter.get('/', async (_req, res) => {
  try {
    const consegne = await prisma.consegna.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(consegne);
  } catch (error) {
    console.error('GET /consegne error:', error);
    res.status(500).json({ error: 'Errore nel recupero consegne' });
  }
});

// POST /consegne
consegneRouter.post('/', async (req, res) => {
  const body = req.body as Record<string, unknown>;

  if (!body.pazienteNome || !body.note) {
    res.status(400).json({ error: 'Campi obbligatori: pazienteNome, note' });
    return;
  }

  try {
    const consegna = await prisma.consegna.create({
      data: {
        pazienteId: String(body.pazienteId ?? ''),
        pazienteNome: String(body.pazienteNome),
        priorita: PRIORITA.includes(String(body.priorita)) ? String(body.priorita) : 'normale',
        stato: STATO.includes(String(body.stato)) ? String(body.stato) : 'aperta',
        tipo: String(body.tipo ?? 'Monitoraggio'),
        note: String(body.note),
        scadenza: String(body.scadenza ?? new Date().toISOString().slice(0, 10)),
        oraScadenza: body.oraScadenza ? String(body.oraScadenza) : null,
        operatoreAssegnato: String(body.operatoreAssegnato ?? ''),
        creatoDA: String(body.creatoDA ?? ''),
      },
    });
    console.log(`POST /consegne → created id=${consegna.id}`);
    res.status(201).json(consegna);
  } catch (error) {
    console.error('POST /consegne error:', error);
    res.status(500).json({ error: 'Errore durante creazione consegna' });
  }
});

// PUT /consegne/:id
consegneRouter.put('/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;

  try {
    const existing = await prisma.consegna.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Consegna non trovata' });
      return;
    }

    const allowed = [
      'pazienteId', 'pazienteNome', 'priorita', 'stato', 'tipo',
      'note', 'scadenza', 'oraScadenza', 'operatoreAssegnato', 'creatoDA',
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] === undefined) continue;
      if (key === 'priorita' && !PRIORITA.includes(String(body[key]))) continue;
      if (key === 'stato' && !STATO.includes(String(body[key]))) continue;
      if (key === 'oraScadenza') {
        updates[key] = body[key] ? String(body[key]) : null;
      } else {
        updates[key] = body[key];
      }
    }

    const consegna = await prisma.consegna.update({ where: { id }, data: updates });
    console.log(`PUT /consegne/${id} → updated`);
    res.status(200).json(consegna);
  } catch (error) {
    console.error('PUT /consegne/:id error:', error);
    res.status(500).json({ error: 'Errore durante aggiornamento consegna' });
  }
});

// DELETE /consegne/:id
consegneRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.consegna.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Consegna non trovata' });
      return;
    }
    await prisma.consegna.delete({ where: { id } });
    console.log(`DELETE /consegne/${id} → deleted`);
    res.status(204).send();
  } catch (error) {
    console.error('DELETE /consegne/:id error:', error);
    res.status(500).json({ error: 'Errore durante eliminazione consegna' });
  }
});

export default consegneRouter;
