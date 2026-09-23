import { seedPo07Roster } from './po07-roster.mjs';
import { fixtureActors } from './parameter-database.mjs';

/** Synthetic handover scenarios. Never calls a remote API. */
export async function seedPo08Consegne(prisma, db, today) {
  const patients = await seedPo07Roster(prisma, db, today, 64);
  const op = fixtureActors.operator.id, other = fixtureActors.outsider.id;
  const examples = [
    ['open', 'po07-patient-000', op, null, 'aperta', 'normale'],
    ['urgent', 'po07-patient-000', other, op, 'in_corso', 'urgente'],
    ['invisible', 'po07-patient-000', other, other, 'aperta', 'urgente'],
    ['history', 'po07-patient-001', op, null, 'completata', 'normale'],
    ['outside', 'vitals-qa-other', other, op, 'aperta', 'alta'],
  ];
  for (const [key, pazienteId, creatoDaId, operatoreAssegnatoId, stato, priorita] of examples) {
    await prisma.consegna.create({ data: { id: `po08-${key}`, pazienteId,
      pazienteNome: 'Paziente sintetico', creatoDaId, creatoDA: 'Operatore QA',
      operatoreAssegnatoId, operatoreAssegnato: operatoreAssegnatoId ? 'Collega QA' : '',
      stato, priorita, tipo: 'Monitoraggio', note: `Consegna sintetica ${key}`, scadenza: today } });
  }
  await prisma.cartella.update({ where: { patientId: 'po07-patient-002' },
    data: { data: { cameraNumero: '2A', lettoNumero: '2', statoRicovero: 'dimesso' } } });
  return patients;
}
