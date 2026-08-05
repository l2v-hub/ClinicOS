import { prisma } from '../lib/prisma.js';
import { Router } from 'express';
import {
  createConsegna,
  CONSEGNA_PRIORITA as PRIORITA,
  CONSEGNA_STATO as STATO,
} from '../services/consegna-service.js';
import { requireOperator } from '../ai/auth.js';

const consegneRouter = Router();

// Gate minimo (header-based, non IdP): le consegne contengono nominativi/dati clinici
// paziente, richiedono un operatore identificato. Vedi backend/src/ai/auth.ts.
consegneRouter.use(requireOperator);

// ═══════════════════════════════════════════════════════════════════════════
// CONSEGNE (handover cards) CRUD — mounted at /consegne
// Creazione delegata al servizio condiviso consegna-service (issue #130, FR-007):
// stesso percorso applicativo per UI tradizionale e Agnos AI.
// ═══════════════════════════════════════════════════════════════════════════

// GET /consegne
consegneRouter.get('/', async (req, res) => {
  // Paginazione opt-in (limit/offset): senza parametri il comportamento resta
  // identico a oggi (nessun take/skip, tutti i record).
  const { limit, offset } = req.query as { limit?: string; offset?: string };
  const parsedLimit = Number.parseInt(String(limit ?? ''), 10);
  const parsedOffset = Number.parseInt(String(offset ?? ''), 10);
  const take =
    Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 500) : undefined;
  const skip = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : undefined;

  try {
    const consegne = await prisma.consegna.findMany({
      orderBy: { createdAt: 'desc' },
      ...(take !== undefined && { take }),
      ...(skip !== undefined && { skip }),
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
    const consegna = await createConsegna({
      pazienteId: body.pazienteId !== undefined ? String(body.pazienteId) : undefined,
      pazienteNome: String(body.pazienteNome),
      priorita: body.priorita !== undefined ? String(body.priorita) : undefined,
      stato: body.stato !== undefined ? String(body.stato) : undefined,
      tipo: body.tipo !== undefined ? String(body.tipo) : undefined,
      note: String(body.note),
      scadenza: body.scadenza !== undefined ? String(body.scadenza) : undefined,
      oraScadenza: body.oraScadenza ? String(body.oraScadenza) : null,
      operatoreAssegnato:
        body.operatoreAssegnato !== undefined ? String(body.operatoreAssegnato) : undefined,
      creatoDA: body.creatoDA !== undefined ? String(body.creatoDA) : undefined,
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
      'pazienteId',
      'pazienteNome',
      'priorita',
      'stato',
      'tipo',
      'note',
      'scadenza',
      'oraScadenza',
      'operatoreAssegnato',
      'creatoDA',
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
