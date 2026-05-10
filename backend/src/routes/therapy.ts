import { prisma } from '../lib/prisma.js';
import { Router } from 'express';

const router = Router();

// Fascia mapping
const FASCE = [
  { fascia: 'mattina',     ora: '08:00', label: 'Terapia Mattina',     hKeys: ['h08'] },
  { fascia: 'pranzo',      ora: '12:00', label: 'Terapia Pranzo',      hKeys: ['h12'] },
  { fascia: 'pomeriggio',  ora: '16:00', label: 'Terapia Pomeriggio',  hKeys: ['h16'] },
  { fascia: 'sera',        ora: '20:00', label: 'Terapia Sera',        hKeys: ['h18', 'h20'] },
  { fascia: 'notte',       ora: '22:00', label: 'Terapia Notte',       hKeys: [] },
];

interface CartellaFarmaco {
  id: string;
  nome: string;
  dose: string;
  frequenza: string;
  via?: string;
  stato: string;
  h08?: string;
  h12?: string;
  h16?: string;
  h18?: string;
  h20?: string;
  [key: string]: unknown;
}

interface CartellaData {
  cameraNumero?: string;
  lettoNumero?: string;
  farmaci?: CartellaFarmaco[];
  [key: string]: unknown;
}

// GET /therapy-slots?date=YYYY-MM-DD
// Builds therapy slots from patient cartelle + medication administration records
router.get('/', async (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);

  try {
    // Get all patients with cartella
    const patients = await prisma.patient.findMany({
      include: { cartella: true },
    });

    // Get all medication administrations for this date
    const administrations = await prisma.medicationAdministration.findMany({
      where: { date },
    });

    // Build administration lookup: key = `${patientId}|${farmacoNome}|${fascia}`
    const adminMap = new Map<string, typeof administrations[0]>();
    for (const a of administrations) {
      adminMap.set(`${a.patientId}|${a.farmacoNome}|${a.fascia}`, a);
    }

    // Build slots
    const slots = FASCE.map(f => {
      const somministrazioni: {
        id: string;
        pazienteId: string;
        pazienteNome: string;
        camera: string;
        letto: string;
        farmaco: string;
        dose: string;
        via: string;
        orarioPrevisto: string;
        stato: string;
        operatoreConferma?: string;
        oraConferma?: string;
        motivoNonErogazione?: string;
        noteNonErogazione?: string;
      }[] = [];

      for (const patient of patients) {
        if (!patient.cartella) continue;
        const cartData = patient.cartella.data as CartellaData;
        if (!cartData?.farmaci) continue;

        for (const farmaco of cartData.farmaci) {
          if (farmaco.stato !== 'attivo') continue;

          // Check if this farmaco belongs to this fascia
          let belongsToFascia = false;
          if (f.hKeys.length === 0) {
            // notte — check if frequenza mentions notte or 22
            const freq = (farmaco.frequenza || '').toLowerCase();
            belongsToFascia = freq.includes('notte') || freq.includes('22');
          } else {
            belongsToFascia = f.hKeys.some(hk => {
              const val = farmaco[hk];
              return val && val !== '' && val !== '-';
            });
          }

          if (!belongsToFascia) continue;

          // Check if there's an existing administration record
          const key = `${patient.id}|${farmaco.nome}|${f.fascia}`;
          const existing = adminMap.get(key);

          const sommId = existing?.id || `pending-${patient.id}-${farmaco.nome}-${f.fascia}`;

          somministrazioni.push({
            id: sommId,
            pazienteId: patient.id,
            pazienteNome: `${patient.lastName}, ${patient.firstName}`,
            camera: (cartData.cameraNumero || '—'),
            letto: (cartData.lettoNumero || '—'),
            farmaco: farmaco.nome,
            dose: farmaco.dose,
            via: farmaco.via || 'orale',
            orarioPrevisto: f.ora,
            stato: existing?.stato || 'da_erogare',
            ...(existing?.stato === 'erogata' && {
              operatoreConferma: existing.operatoreNome || undefined,
              oraConferma: existing.confirmedAt
                ? new Date(existing.confirmedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                : undefined,
            }),
            ...(existing?.stato === 'non_erogata' && {
              motivoNonErogazione: existing.motivo || undefined,
              noteNonErogazione: existing.note || undefined,
            }),
          });
        }
      }

      return {
        id: `ts-${f.fascia}`,
        fascia: f.fascia,
        label: f.label,
        ora: f.ora,
        somministrazioni,
      };
    });

    // Also get therapies from PatientTherapy model
    const patientTherapies = await prisma.patientTherapy.findMany({
      where: { stato: 'attiva' },
      include: { patient: { include: { cartella: true } } },
    });

    // Map PatientTherapy records to somministrazioni per fascia
    for (const pt of patientTherapies) {
      // Skip if una_tantum and not for this date
      if (pt.tipo === 'una_tantum') {
        if (pt.dataSomministrazione !== date) continue;
      } else {
        // Periodica: check date range
        if (pt.dataInizio > date) continue;
        if (pt.dataFine && pt.dataFine < date) continue;
      }

      const cartData = pt.patient.cartella?.data as CartellaData | undefined;
      const camera = cartData?.cameraNumero || '—';
      const letto = cartData?.lettoNumero || '—';

      const fasciaMap: Record<string, boolean> = {
        mattina: pt.fasceMattina,
        pranzo: pt.fascePranzo,
        pomeriggio: pt.fascePomeriggio,
        sera: pt.fasceSera,
        notte: pt.fasceNotte,
      };

      for (const f of FASCE) {
        if (!fasciaMap[f.fascia]) continue;

        const key = `${pt.patientId}|${pt.farmacoNome}|${f.fascia}`;
        const existing = adminMap.get(key);
        const sommId = existing?.id || `pending-${pt.patientId}-${pt.farmacoNome}-${f.fascia}`;

        // Find the slot and add
        const slot = slots.find(s => s.fascia === f.fascia);
        if (slot) {
          // Check no duplicate
          const alreadyExists = slot.somministrazioni.some(
            s => s.pazienteId === pt.patientId && s.farmaco === pt.farmacoNome
          );
          if (!alreadyExists) {
            slot.somministrazioni.push({
              id: sommId,
              pazienteId: pt.patientId,
              pazienteNome: `${pt.patient.lastName}, ${pt.patient.firstName}`,
              camera,
              letto,
              farmaco: pt.farmacoNome,
              dose: pt.dosaggio,
              via: pt.viaSomministrazione || 'orale',
              orarioPrevisto: f.ora,
              stato: existing?.stato || 'da_erogare',
              ...(existing?.stato === 'erogata' && {
                operatoreConferma: existing.operatoreNome || undefined,
                oraConferma: existing.confirmedAt
                  ? new Date(existing.confirmedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                  : undefined,
              }),
              ...(existing?.stato === 'non_erogata' && {
                motivoNonErogazione: existing.motivo || undefined,
                noteNonErogazione: existing.note || undefined,
              }),
            });
          }
        }
      }
    }

    // Filter out empty slots
    const nonEmptySlots = slots.filter(s => s.somministrazioni.length > 0);

    res.status(200).json(nonEmptySlots);
  } catch (error) {
    console.error('GET /therapy-slots error:', error);
    res.status(500).json({ error: 'Errore nel recupero degli slot terapia' });
  }
});

// POST /therapy-slots/confirm
// Body: { somministrazioneId, patientId, farmacoNome, farmacoDose, farmacoVia, date, fascia, ora, operatoreId, operatoreNome }
router.post('/confirm', async (req, res) => {
  const {
    patientId, farmacoNome, farmacoDose, farmacoVia,
    date, fascia, ora, operatoreId, operatoreNome,
  } = req.body as {
    patientId: string;
    farmacoNome: string;
    farmacoDose: string;
    farmacoVia: string;
    date: string;
    fascia: string;
    ora: string;
    operatoreId: string;
    operatoreNome: string;
  };

  if (!patientId || !farmacoNome || !date || !fascia) {
    res.status(400).json({ error: 'Campi obbligatori: patientId, farmacoNome, date, fascia' });
    return;
  }

  try {
    // Check if already administered
    const existing = await prisma.medicationAdministration.findUnique({
      where: { patientId_farmacoNome_date_fascia: { patientId, farmacoNome, date, fascia } },
    });

    if (existing?.stato === 'erogata') {
      res.status(409).json({
        error: 'Terapia già erogata',
        existingRecord: {
          operatoreConferma: existing.operatoreNome,
          oraConferma: existing.confirmedAt
            ? new Date(existing.confirmedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            : null,
        },
      });
      return;
    }

    const record = await prisma.medicationAdministration.upsert({
      where: { patientId_farmacoNome_date_fascia: { patientId, farmacoNome, date, fascia } },
      create: {
        patientId,
        farmacoNome,
        farmacoDose: farmacoDose || '',
        farmacoVia: farmacoVia || 'orale',
        date,
        fascia,
        ora: ora || '',
        stato: 'erogata',
        operatoreId: operatoreId || null,
        operatoreNome: operatoreNome || null,
        confirmedAt: new Date(),
      },
      update: {
        stato: 'erogata',
        operatoreId: operatoreId || null,
        operatoreNome: operatoreNome || null,
        confirmedAt: new Date(),
        motivo: null,
        note: null,
      },
    });

    res.status(200).json(record);
  } catch (error) {
    console.error('POST /therapy-slots/confirm error:', error);
    res.status(500).json({ error: 'Errore durante conferma somministrazione' });
  }
});

// POST /therapy-slots/not-administered
// Body: { patientId, farmacoNome, farmacoDose, farmacoVia, date, fascia, ora, operatoreId, operatoreNome, motivo, note }
router.post('/not-administered', async (req, res) => {
  const {
    patientId, farmacoNome, farmacoDose, farmacoVia,
    date, fascia, ora, operatoreId, operatoreNome,
    motivo, note: noteText,
  } = req.body as {
    patientId: string;
    farmacoNome: string;
    farmacoDose: string;
    farmacoVia: string;
    date: string;
    fascia: string;
    ora: string;
    operatoreId: string;
    operatoreNome: string;
    motivo: string;
    note: string;
  };

  if (!patientId || !farmacoNome || !date || !fascia || !motivo) {
    res.status(400).json({ error: 'Campi obbligatori: patientId, farmacoNome, date, fascia, motivo' });
    return;
  }

  try {
    const record = await prisma.medicationAdministration.upsert({
      where: { patientId_farmacoNome_date_fascia: { patientId, farmacoNome, date, fascia } },
      create: {
        patientId,
        farmacoNome,
        farmacoDose: farmacoDose || '',
        farmacoVia: farmacoVia || 'orale',
        date,
        fascia,
        ora: ora || '',
        stato: 'non_erogata',
        operatoreId: operatoreId || null,
        operatoreNome: operatoreNome || null,
        motivo,
        note: noteText || null,
      },
      update: {
        stato: 'non_erogata',
        motivo,
        note: noteText || null,
        operatoreId: operatoreId || null,
        operatoreNome: operatoreNome || null,
        confirmedAt: null,
      },
    });

    res.status(200).json(record);
  } catch (error) {
    console.error('POST /therapy-slots/not-administered error:', error);
    res.status(500).json({ error: 'Errore durante registrazione non somministrazione' });
  }
});

export default router;
