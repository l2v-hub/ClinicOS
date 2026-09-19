import { Router } from 'express';
import { makeLimiter } from '../ai/rate-limit.js';
import { creaLettoreDocumentoAifa, ErroreDocumentoAifa, riferimentoDocumentoAifa } from '../services/farmaci/documento.js';

// Public reference PDFs only, like the existing AIFA catalog. No patient or operator payload.
export function creaRouterDocumentoFarmaco(leggi = creaLettoreDocumentoAifa()) {
  const router = Router();
  router.use(makeLimiter(60_000, 120, 'documenti AIFA globali', { maxBuckets: 1, key: () => 'global' }));
  router.use(makeLimiter(60_000, 20, 'documenti AIFA', { maxBuckets: 10_000 }));
  router.get('/', async (req, res) => {
    const controller = new AbortController();
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', disconnect);
    res.setHeader('Cache-Control', 'no-store');
    try {
      const ref = riferimentoDocumentoAifa(req.query);
      const pdf = await leggi(ref, controller.signal);
      if (controller.signal.aborted) return;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', `inline; filename="${ref.tipo}_${ref.organizzazione}_${ref.farmaco}.pdf"`);
      res.status(200).send(pdf);
    } catch (error) {
      if (controller.signal.aborted) return;
      const failure = error instanceof ErroreDocumentoAifa
        ? error : new ErroreDocumentoAifa(502, 'Non è stato possibile caricare il documento. Riprova.');
      if (failure.status === 503) res.setHeader('Retry-After', '5');
      res.status(failure.status).json({ error: failure.message });
    } finally {
      res.off('close', disconnect);
    }
  });
  return router;
}
