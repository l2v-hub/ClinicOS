// API dei dati sintetici — montata su /admin/synthetic-data.
//
//   GET  /admin/synthetic-data        stato: abilitata?, tier, conteggi correnti
//   POST /admin/synthetic-data/seed   crea/aggiorna il dataset di prova (idempotente)
//   POST /admin/synthetic-data/wipe   svuota i dati operativi — body {"confirm":"CANCELLA TUTTO"}
//
// Difese (tutte lato server, in quest'ordine): identità operatore → ruolo admin/manager →
// capability catalogata (route gate, dominio `dev`) → ambiente ammesso (mai produzione reale) →
// frase di conferma per il wipe. L'audit lo scrive il route gate per ogni seed/wipe (identità,
// ruolo ed esito, anche dei rifiuti): qui non se ne aggiunge un secondo.

import { Router, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireOperator, requireRole } from '../ai/auth.js';
import {
  WIPE_CONFIRMATION,
  seedSyntheticData,
  syntheticDataAvailability,
  syntheticDataCounts,
  wipeSyntheticData,
} from '../synthetic/index.js';

const router = Router();

router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
router.use(requireOperator, requireRole('admin', 'manager'));

/** 403 quando l'ambiente non ammette dati sintetici (produzione reale in testa). */
function refuseUnlessEnabled(res: Response): boolean {
  const availability = syntheticDataAvailability();
  if (availability.enabled) return false;
  res.status(403).json({
    error: `API dati sintetici non disponibile: ${availability.reason}`,
    code: 'synthetic_data_disabled',
    tier: availability.tier,
  });
  return true;
}

router.get('/', async (_req, res) => {
  try {
    const availability = syntheticDataAvailability();
    res.status(200).json({
      ...availability,
      confirmation: WIPE_CONFIRMATION,
      counts: await syntheticDataCounts(prisma),
    });
  } catch (error) {
    console.error('GET /admin/synthetic-data error:', error instanceof Error ? error.name : error);
    res.status(500).json({ error: 'Errore nella lettura dello stato dei dati sintetici' });
  }
});

router.post('/seed', async (_req, res) => {
  if (refuseUnlessEnabled(res)) return;
  try {
    const result = await seedSyntheticData(prisma);
    res.status(200).json({ status: 'seeded', ...result });
  } catch (error) {
    console.error(
      'POST /admin/synthetic-data/seed error:',
      error instanceof Error ? `${error.name}: ${error.message.slice(0, 200)}` : error,
    );
    res.status(500).json({ error: 'Errore durante la creazione dei dati sintetici' });
  }
});

router.post('/wipe', async (req, res) => {
  if (refuseUnlessEnabled(res)) return;
  if ((req.body as { confirm?: unknown } | undefined)?.confirm !== WIPE_CONFIRMATION) {
    res.status(400).json({
      error: `Conferma richiesta: invia {"confirm":"${WIPE_CONFIRMATION}"} per svuotare il sistema`,
      code: 'confirmation_required',
    });
    return;
  }
  try {
    const result = await wipeSyntheticData(prisma);
    res.status(200).json({ status: 'wiped', ...result });
  } catch (error) {
    console.error(
      'POST /admin/synthetic-data/wipe error:',
      error instanceof Error ? `${error.name}: ${error.message.slice(0, 200)}` : error,
    );
    res.status(500).json({ error: 'Errore durante lo svuotamento: nessun dato è stato eliminato' });
  }
});

export default router;
