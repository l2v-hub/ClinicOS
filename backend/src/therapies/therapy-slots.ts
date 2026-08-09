// Costruzione degli slot terapia di una giornata a partire da PatientTherapy + le somministrazioni
// gia' registrate. Estratto da GET /therapy-slots perche' ora ha due consumatori (la rotta REST e i
// tool di lettura di Agnos): una seconda implementazione farebbe divergere i conteggi mostrati
// dall'UI da quelli su cui l'assistente risponde. Sola lettura.

import { prisma } from '../lib/prisma.js';
import { scheduleDoseLabel, type ScheduleInput } from '../lib/therapy-dose.js';
import { earliestOra } from './slot-scheduling.js';

export const FASCE = [
  { fascia: 'mattina', ora: '08:00', label: 'Terapia Mattina', flagField: 'fasceMattina' },
  { fascia: 'pranzo', ora: '12:00', label: 'Terapia Pranzo', flagField: 'fascePranzo' },
  { fascia: 'pomeriggio', ora: '16:00', label: 'Terapia Pomeriggio', flagField: 'fascePomeriggio' },
  { fascia: 'sera', ora: '20:00', label: 'Terapia Sera', flagField: 'fasceSera' },
  { fascia: 'notte', ora: '22:00', label: 'Terapia Notte', flagField: 'fasceNotte' },
] as const;

type FlagField = (typeof FASCE)[number]['flagField'];

interface CartDataFallback {
  cameraNumero?: string;
  lettoNumero?: string;
  [key: string]: unknown;
}

export interface SlotAdministration {
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
}

export interface SlotPatient {
  patientId: string;
  firstName: string;
  lastName: string;
  room: string;
  bed: string;
  administrations: SlotAdministration[];
}

export interface TherapySlot {
  id: string;
  fascia: string;
  label: string;
  ora: string;
  summary: { total: number; administered: number; notAdministered: number; pending: number };
  patients: SlotPatient[];
}

/** Slot della giornata `date` (YYYY-MM-DD), raggruppati per fascia e paziente. Solo fasce non vuote. */
export async function buildTherapySlots(date: string): Promise<TherapySlot[]> {
  const therapies = await prisma.patientTherapy.findMany({
    where: { stato: 'attiva' },
    include: {
      schedules: true,
      patient: {
        include: {
          cartella: true,
          roomAssignments: { include: { bed: { include: { room: true } } } },
        },
      },
    },
  });

  const validTherapies = therapies.filter((pt) => {
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
      const isoDay = jsDay === 0 ? 7 : jsDay; // 1=Mon … 7=Sun
      const allowed = pt.giorniSettimana.split(',').map((s) => parseInt(s.trim(), 10));
      if (!allowed.includes(isoDay)) return false;
    }
    return true;
  });

  const administrations = await prisma.medicationAdministration.findMany({ where: { date } });
  const adminMap = new Map<string, (typeof administrations)[0]>(
    administrations.map((a) => [`${a.patientId}|${a.farmacoNome}|${a.fascia}`, a]),
  );

  const slots: TherapySlot[] = FASCE.map((f) => {
    const fasciaTherapies = validTherapies.filter((pt) => pt[f.flagField as FlagField] === true);
    const patientMap = new Map<string, SlotPatient>();

    for (const pt of fasciaTherapies) {
      const patient = pt.patient;

      // Resolve room/bed from active assignment, fallback to cartella JSON
      const activeAssignment = patient.roomAssignments.find((ra) => {
        if (ra.startDate > date) return false;
        if (ra.endDate && ra.endDate < date) return false;
        return true;
      });
      const cartData = patient.cartella?.data as CartDataFallback | undefined;
      const room = activeAssignment?.bed?.room?.numero || cartData?.cameraNumero || 'Non assegnato';
      const bed = activeAssignment?.bed?.label || cartData?.lettoNumero || 'Non assegnato';

      const existing = adminMap.get(`${pt.patientId}|${pt.farmacoNome}|${f.fascia}`);
      let status: SlotAdministration['status'] = 'pending';
      if (existing?.stato === 'erogata') status = 'administered';
      if (existing?.stato === 'non_erogata') status = 'not_administered';

      // REQ-093: match the structured schedule for this fascia to surface the exact
      // fractional quantity + mg equivalent and the precise administration time.
      const sched = (pt.schedules as ScheduleInput[] | undefined)?.find(
        (s) => s.fascia === f.fascia,
      );
      const quantityLabel = sched
        ? scheduleDoseLabel(sched, pt.commercialStrengthValue, pt.commercialStrengthUnit)
        : null;

      const administrationEntry: SlotAdministration = {
        administrationId: existing?.id ?? null,
        therapyId: pt.id,
        drugName: pt.farmacoNome,
        dosage: quantityLabel ?? pt.dosaggio,
        quantityLabel,
        route: pt.viaSomministrazione || 'orale',
        scheduledTime: sched?.time || f.ora,
        status,
        administeredAt: existing?.confirmedAt ? new Date(existing.confirmedAt).toISOString() : null,
        administeredBy: existing?.operatoreNome ?? null,
        notAdministeredReason: existing?.motivo ?? null,
      };

      if (!patientMap.has(pt.patientId)) {
        patientMap.set(pt.patientId, {
          patientId: pt.patientId,
          firstName: patient.firstName,
          lastName: patient.lastName,
          room,
          bed,
          administrations: [],
        });
      }
      patientMap.get(pt.patientId)!.administrations.push(administrationEntry);
    }

    const patients = Array.from(patientMap.values());
    const allAdmins = patients.flatMap((p) => p.administrations);

    return {
      id: `ts-${f.fascia}`,
      fascia: f.fascia,
      label: f.label,
      ora: earliestOra(
        allAdmins.map((a) => a.scheduledTime),
        f.ora,
      ),
      summary: {
        total: allAdmins.length,
        administered: allAdmins.filter((a) => a.status === 'administered').length,
        notAdministered: allAdmins.filter((a) => a.status === 'not_administered').length,
        pending: allAdmins.filter((a) => a.status === 'pending').length,
      },
      patients,
    };
  });

  return slots.filter((s) => s.patients.length > 0);
}
