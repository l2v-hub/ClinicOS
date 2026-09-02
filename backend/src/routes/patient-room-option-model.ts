interface PatientRoomOptionSource {
  id: string;
  numero: string;
  tipo: string;
  piano: string;
  reparto: string;
  stato: string;
  beds: Array<{
    id: string;
    label: string;
    stato: string;
    assignments: Array<{ patientId: string }>;
  }>;
}

export function toPatientRoomOptions(rooms: PatientRoomOptionSource[], patientId: string) {
  return rooms.map((room) => ({
    id: room.id,
    numero: room.numero,
    tipo: room.tipo,
    piano: room.piano,
    reparto: room.reparto,
    stato: room.stato,
    note: '',
    beds: room.beds.map((bed) => ({
      id: bed.id,
      label: bed.label,
      stato: bed.stato,
      availability:
        bed.stato === 'manutenzione'
          ? 'maintenance'
          : bed.assignments[0]?.patientId === patientId
            ? 'current'
            : bed.assignments.length > 0
              ? 'occupied'
              : 'available',
    })),
  }));
}
