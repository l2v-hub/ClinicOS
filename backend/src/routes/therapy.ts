import { prisma } from '../lib/prisma.js';
import { Router } from 'express';
import { scheduleDoseLabel, type ScheduleInput } from '../lib/therapy-dose.js';

const router = Router();

// Fascia definitions
const FASCE = [
  { fascia: 'mattina',    ora: '08:00', label: 'Terapia Mattina',    flagField: 'fasceMattina'    },
  { fascia: 'pranzo',     ora: '12:00', label: 'Terapia Pranzo',     flagField: 'fascePranzo'     },
  { fascia: 'pomeriggio', ora: '16:00', label: 'Terapia Pomeriggio', flagField: 'fascePomeriggio' },
  { fascia: 'sera',       ora: '20:00', label: 'Terapia Sera',       flagField: 'fasceSera'       },
  { fascia: 'notte',      ora: '22:00', label: 'Terapia Notte',      flagField: 'fasceNotte'      },
] as const;

type FlagField = typeof FASCE[number]['flagField'];

interface CartDataFallback {
  cameraNumero?: string;
  lettoNumero?: string;
  [key: string]: unknown;
}

// GET /therapy-slots?date=YYYY-MM-DD
// Returns slots grouped by patient, sourced exclusively from PatientTherapy.
router.get('/', async (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);

  try {
    // 1. Fetch all active PatientTherapy with patient + active room assignment
    const therapies = await prisma.patientTherapy.findMany({
      where: { stato: 'attiva' },
      include: {
        schedules: true,
        patient: {
          include: {
            cartella: true,
            roomAssignments: {
              include: { bed: { include: { room: true } } },
            },
          },
        },
      },
    });

    // 2. Filter therapies valid for the requested date
    const validTherapies = therapies.filter(pt => {
      if (!pt.patient) {
        console.error('Skipping invalid/orphan therapy: missing patient for therapyId', pt.id);
        return false;
      }
      if (pt.tipo === 'al_bisogno') return false;
      if (pt.tipo === 'una_tantum') return pt.dataSomministrazione === date;
      if (pt.dataInizio > date) return false;
      if (pt.dataFine && pt.dataFine < date) return false;
      // #241: intermittent weekday posology — a drug with a giorniSettimana list must not appear on
      // days outside it. Empty/null = every day (backward-compatible).
      if (pt.giorniSettimana && pt.giorniSettimana.trim()) {
        const jsDay = new Date(`${date}T00:00:00`).getDay(); // 0=Sun … 6=Sat
        const isoDay = jsDay === 0 ? 7 : jsDay;               // 1=Mon … 7=Sun
        const allowed = pt.giorniSettimana.split(',').map((s) => parseInt(s.trim(), 10));
        if (!allowed.includes(isoDay)) return false;
      }
      return true;
    });

    // 3. Fetch MedicationAdministration records for this date
    const administrations = await prisma.medicationAdministration.findMany({ where: { date } });
    const adminMap = new Map<string, typeof administrations[0]>(
      administrations.map(a => [`${a.patientId}|${a.farmacoNome}|${a.fascia}`, a]),
    );

    // 4. Build slots grouped by patient
    const slots = FASCE.map(f => {
      // Filter therapies scheduled for this fascia
      const fasciaTherapies = validTherapies.filter(pt => pt[f.flagField as FlagField] === true);

      // Group by patientId
      const patientMap = new Map<string, {
        patientId: string;
        firstName: string;
        lastName: string;
        room: string;
        bed: string;
        administrations: {
          administrationId: string | null;
          therapyId: string;
          drugName: string;
          dosage: string;
          quantityLabel: string | null;
          route: string;
          scheduledTime: string;
          status: 'pending' | 'administered' | 'not_administered';
          administeredAt: string | null;
          administeredBy: string | null;
          notAdministeredReason: string | null;
        }[];
      }>();

      for (const pt of fasciaTherapies) {
        const patient = pt.patient;

        // Resolve room/bed from active assignment, fallback to cartella JSON
        const activeAssignment = patient.roomAssignments.find(ra => {
          if (ra.startDate > date) return false;
          if (ra.endDate && ra.endDate < date) return false;
          return true;
        });
        const cartData = patient.cartella?.data as CartDataFallback | undefined;
        const room = activeAssignment?.bed?.room?.numero || cartData?.cameraNumero || 'Non assegnato';
        const bed  = activeAssignment?.bed?.label      || cartData?.lettoNumero    || 'Non assegnato';

        // Resolve administration record
        const key      = `${pt.patientId}|${pt.farmacoNome}|${f.fascia}`;
        const existing = adminMap.get(key);

        let status: 'pending' | 'administered' | 'not_administered' = 'pending';
        if (existing?.stato === 'erogata')     status = 'administered';
        if (existing?.stato === 'non_erogata') status = 'not_administered';

        // REQ-093: match the structured schedule for this fascia to surface the exact
        // fractional quantity + mg equivalent and the precise administration time.
        const sched = (pt.schedules as ScheduleInput[] | undefined)?.find(s => s.fascia === f.fascia);
        const quantityLabel = sched
          ? scheduleDoseLabel(sched, pt.commercialStrengthValue, pt.commercialStrengthUnit)
          : null;

        const administrationEntry = {
          administrationId:      existing?.id ?? null,
          therapyId:             pt.id,
          drugName:              pt.farmacoNome,
          dosage:                quantityLabel ?? pt.dosaggio,
          quantityLabel,
          route:                 pt.viaSomministrazione || 'orale',
          scheduledTime:         sched?.time || f.ora,
          status,
          administeredAt:        existing?.confirmedAt ? new Date(existing.confirmedAt).toISOString() : null,
          administeredBy:        existing?.operatoreNome ?? null,
          notAdministeredReason: existing?.motivo ?? null,
        };

        if (!patientMap.has(pt.patientId)) {
          patientMap.set(pt.patientId, {
            patientId: pt.patientId,
            firstName: patient.firstName,
            lastName:  patient.lastName,
            room,
            bed,
            administrations: [],
          });
        }
        patientMap.get(pt.patientId)!.administrations.push(administrationEntry);
      }

      const patients = Array.from(patientMap.values());

      // Summary counters
      const allAdmins = patients.flatMap(p => p.administrations);
      const summary = {
        total:           allAdmins.length,
        administered:    allAdmins.filter(a => a.status === 'administered').length,
        notAdministered: allAdmins.filter(a => a.status === 'not_administered').length,
        pending:         allAdmins.filter(a => a.status === 'pending').length,
      };

      return {
        id:      `ts-${f.fascia}`,
        fascia:  f.fascia,
        label:   f.label,
        ora:     f.ora,
        summary,
        patients,
      };
    });

    // 5. Return only non-empty slots
    const nonEmptySlots = slots.filter(s => s.patients.length > 0);

    res.status(200).json(nonEmptySlots);
  } catch (error) {
    console.error('GET /therapy-slots error:', error);
    res.status(500).json({ error: 'Errore nel recupero degli slot terapia' });
  }
});

// POST /therapy-slots/confirm
// Body: { patientId, farmacoNome, farmacoDose, farmacoVia, date, fascia, ora, operatoreId, operatoreNome, therapyId? }
router.post('/confirm', async (req, res) => {
  const {
    patientId, farmacoNome, farmacoDose, farmacoVia,
    date, fascia, ora, operatoreId, operatoreNome,
    // therapyId accepted for forward-compat; not stored in DB yet
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    therapyId: _therapyId,
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
    therapyId?: string;
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
        farmacoVia:  farmacoVia  || 'orale',
        date,
        fascia,
        ora:          ora          || '',
        stato:        'erogata',
        operatoreId:  operatoreId  || null,
        operatoreNome: operatoreNome || null,
        confirmedAt:  new Date(),
      },
      update: {
        stato:        'erogata',
        operatoreId:  operatoreId  || null,
        operatoreNome: operatoreNome || null,
        confirmedAt:  new Date(),
        motivo:       null,
        note:         null,
      },
    });

    res.status(200).json(record);
  } catch (error) {
    console.error('POST /therapy-slots/confirm error:', error);
    res.status(500).json({ error: 'Errore durante conferma somministrazione' });
  }
});

// POST /therapy-slots/not-administered
// Body: { patientId, farmacoNome, farmacoDose, farmacoVia, date, fascia, ora, operatoreId, operatoreNome, motivo, note, therapyId? }
router.post('/not-administered', async (req, res) => {
  const {
    patientId, farmacoNome, farmacoDose, farmacoVia,
    date, fascia, ora, operatoreId, operatoreNome,
    motivo, note: noteText,
    // therapyId accepted for forward-compat; not stored in DB yet
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    therapyId: _therapyId,
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
    therapyId?: string;
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
        farmacoVia:  farmacoVia  || 'orale',
        date,
        fascia,
        ora:          ora          || '',
        stato:        'non_erogata',
        operatoreId:  operatoreId  || null,
        operatoreNome: operatoreNome || null,
        motivo,
        note:         noteText || null,
      },
      update: {
        stato:        'non_erogata',
        motivo,
        note:         noteText || null,
        operatoreId:  operatoreId  || null,
        operatoreNome: operatoreNome || null,
        confirmedAt:  null,
      },
    });

    res.status(200).json(record);
  } catch (error) {
    console.error('POST /therapy-slots/not-administered error:', error);
    res.status(500).json({ error: 'Errore durante registrazione non somministrazione' });
  }
});

export default router;
