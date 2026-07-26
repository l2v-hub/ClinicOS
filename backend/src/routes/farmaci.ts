// Anagrafica farmaci AIFA: consultazione e ricaricamento.
//
//   GET  /farmaci/stato        conteggi + ultimo caricamento (alimenta la pagina di setup)
//   GET  /farmaci/cerca?q=     ricerca per nome commerciale, con recupero dei nomi storpiati
//   GET  /farmaci/dosaggi?pa=  dosaggi in commercio per un principio attivo
//   POST /farmaci/ricarica     riscarica l'anagrafica dai CSV AIFA (admin/manager)
//
// Anagrafica pubblica: nessun dato di paziente passa di qui.

import { Router } from 'express';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import { importaAnagraficaFarmaci } from '../services/farmaci/import.js';
import {
  cercaFarmaci,
  cercaPerPrincipioAttivo,
  dosaggiInCommercio,
  invalidaIndice,
} from '../services/farmaci/ricerca.js';

const farmaciRouter = Router();
farmaciRouter.use(requireOperator);

const RUOLI_PRIVILEGIATI = new Set(['admin', 'manager']);

/** Stato dell'anagrafica: quanti farmaci, di quando, com'e' andato l'ultimo caricamento. */
farmaciRouter.get('/stato', async (_req, res) => {
  try {
    const [confezioni, principiAttivi, ultimo] = await Promise.all([
      prisma.farmaco.count(),
      prisma.farmacoPrincipioAttivo.count(),
      prisma.farmacoImport.findFirst({ orderBy: { eseguitoIl: 'desc' } }),
    ]);
    res.status(200).json({
      confezioni,
      principiAttivi,
      // Distinguere "mai caricata" da "caricata e vuota" evita di far credere a un guasto
      // dell'anagrafica cio' che e' solo un import mai eseguito.
      caricata: confezioni > 0,
      ultimoCaricamento: ultimo
        ? {
            esito: ultimo.esito,
            eseguitoIl: ultimo.eseguitoIl,
            righeScritte: ultimo.righeScritte,
            durataMs: ultimo.durataMs,
            messaggio: ultimo.messaggio,
          }
        : null,
    });
  } catch (error) {
    console.error('GET /farmaci/stato:', error);
    res.status(500).json({ error: "Errore nella lettura dello stato dell'anagrafica" });
  }
});

/** Ricerca per nome commerciale; `pa=1` cerca invece per principio attivo. */
farmaciRouter.get('/cerca', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) return res.status(400).json({ error: 'Parametro q obbligatorio' });
  const limite = Math.min(Number.parseInt(String(req.query.limite ?? ''), 10) || 8, 25);
  try {
    const perPa = req.query.pa === '1' || req.query.pa === 'true';
    const esiti = perPa
      ? await cercaPerPrincipioAttivo(q, { limite })
      : await cercaFarmaci(q, { limite });
    return res.status(200).json({ query: q, esiti });
  } catch (error) {
    console.error('GET /farmaci/cerca:', error);
    return res.status(500).json({ error: 'Errore nella ricerca' });
  }
});

/** Dosaggi realmente in commercio per un principio attivo. */
farmaciRouter.get('/dosaggi', async (req, res) => {
  const pa = typeof req.query.pa === 'string' ? req.query.pa.trim() : '';
  if (!pa) return res.status(400).json({ error: 'Parametro pa obbligatorio' });
  try {
    return res.status(200).json({ principioAttivo: pa, dosaggi: await dosaggiInCommercio(pa) });
  } catch (error) {
    console.error('GET /farmaci/dosaggi:', error);
    return res.status(500).json({ error: 'Errore nella lettura dei dosaggi' });
  }
});

/**
 * Ricarica l'anagrafica dai CSV AIFA. Gira sul server, non sul client: sono ~500.000 righe
 * e il download deve partire dalla rete del backend. Riservata ad admin/manager perche'
 * sostituisce l'intera anagrafica.
 */
farmaciRouter.post('/ricarica', async (req: AuthedRequest, res) => {
  if (!RUOLI_PRIVILEGIATI.has(req.operator!.role)) {
    return res.status(403).json({ error: 'Ricaricamento riservato ai ruoli admin/manager' });
  }
  try {
    const esito = await importaAnagraficaFarmaci();
    // L'indice dei nomi in memoria si riferisce all'anagrafica precedente.
    invalidaIndice();
    return res.status(200).json(esito);
  } catch (error) {
    const messaggio = error instanceof Error ? error.message.slice(0, 300) : 'errore sconosciuto';
    console.error('POST /farmaci/ricarica:', messaggio);
    return res.status(502).json({ error: `Ricaricamento non riuscito: ${messaggio}` });
  }
});

export default farmaciRouter;
