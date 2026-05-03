/**
 * ClinicOS — Demo Seed
 *
 * Idempotente: usa upsert su campi univoci (email, userId, medicalRecordNumber, id).
 * Lanciare con:  npm run db:seed  (dalla root)
 *          oppure:  npm --prefix backend run prisma:seed
 */

import { prisma } from './lib/prisma.js'

// ── Helpers ────────────────────────────────────────────────────────────────────

function dob(yyyy: number, mm: number, dd: number) {
  return new Date(`${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`)
}

function futureDate(daysFromNow: number, hour = 10, minute = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(hour, minute, 0, 0)
  return d
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Avvio seed demo ClinicOS…\n')

  // ── 1. Users ────────────────────────────────────────────────────────────────
  // passwordHash = placeholder: questi utenti demo non possono fare login reale
  const usersData = [
    {
      id:       'SEED-USER-001',
      email:    'admin.demo@clinicos.demo',
      fullName: 'Admin Demo',
      role:     'MANAGER' as const,
    },
    {
      id:       'SEED-USER-002',
      email:    'laura.bianchi@clinicos.demo',
      fullName: 'Laura Bianchi',
      role:     'OPERATOR' as const,
    },
    {
      id:       'SEED-USER-003',
      email:    'marco.rinaldi@clinicos.demo',
      fullName: 'Marco Rinaldi',
      role:     'OPERATOR' as const,
    },
    {
      id:       'SEED-USER-004',
      email:    'giulia.ferri@clinicos.demo',
      fullName: 'Giulia Ferri',
      role:     'OPERATOR' as const,
    },
  ]

  for (const u of usersData) {
    await prisma.user.upsert({
      where:  { email: u.email },
      update: { fullName: u.fullName, role: u.role },
      create: {
        id:           u.id,
        email:        u.email,
        passwordHash: 'DEMO_SEED_NOT_A_REAL_HASH',
        fullName:     u.fullName,
        role:         u.role,
      },
    })
  }
  console.log(`✓  ${usersData.length} utenti demo creati/aggiornati`)

  // ── 2. Operators ────────────────────────────────────────────────────────────
  const operatorsData = [
    {
      id:            'SEED-OP-001',
      userId:        'SEED-USER-002',
      licenseNumber: 'INF-DEMO-001',
      department:    'Reparto A — Medicina Interna',
      phone:         '+39 333 100 2001',
    },
    {
      id:            'SEED-OP-002',
      userId:        'SEED-USER-003',
      licenseNumber: 'OPS-DEMO-001',
      department:    'Reparto B — Chirurgia',
      phone:         '+39 333 100 2002',
    },
    {
      id:            'SEED-OP-003',
      userId:        'SEED-USER-004',
      licenseNumber: 'FIS-DEMO-001',
      department:    'Riabilitazione',
      phone:         '+39 333 100 2003',
    },
    {
      id:            'SEED-OP-004',
      userId:        'SEED-USER-001',
      licenseNumber: null as string | null,
      department:    'Amministrazione',
      phone:         null as string | null,
    },
  ]

  for (const op of operatorsData) {
    await prisma.operator.upsert({
      where:  { userId: op.userId },
      update: { department: op.department, phone: op.phone },
      create: {
        id:            op.id,
        userId:        op.userId,
        licenseNumber: op.licenseNumber,
        department:    op.department,
        phone:         op.phone,
      },
    })
  }
  console.log(`✓  ${operatorsData.length} operatori demo creati/aggiornati`)

  // ── 3. Patients ─────────────────────────────────────────────────────────────
  const patientsData = [
    {
      id:                   'SEED-PAZ-001',
      medicalRecordNumber:  'MRN-DEMO-001',
      firstName:            'Mario',
      lastName:             'Ferrioli',
      dateOfBirth:          dob(1948, 3, 15),
      sex:                  'M',
      email:                'mario.ferrioli@demo.it',
      phone:                '+39 333 200 1001',
      address:              'Via Garibaldi 12, 20121 Milano MI',
      emergencyContactName: 'Rosa Ferrioli',
      emergencyContactPhone:'+39 333 200 1002',
      registeredById:       'SEED-OP-001',
    },
    {
      id:                   'SEED-PAZ-002',
      medicalRecordNumber:  'MRN-DEMO-002',
      firstName:            'Anna',
      lastName:             'Martini',
      dateOfBirth:          dob(1955, 7, 22),
      sex:                  'F',
      email:                'anna.martini@demo.it',
      phone:                '+39 333 200 2001',
      address:              'Corso Buenos Aires 44, 20124 Milano MI',
      emergencyContactName: 'Piero Martini',
      emergencyContactPhone:'+39 333 200 2002',
      registeredById:       'SEED-OP-001',
    },
    {
      id:                   'SEED-PAZ-003',
      medicalRecordNumber:  'MRN-DEMO-003',
      firstName:            'Giorgio',
      lastName:             'Bassi',
      dateOfBirth:          dob(1942, 11, 3),
      sex:                  'M',
      email:                'giorgio.bassi@demo.it',
      phone:                '+39 333 200 3001',
      address:              'Via Roma 7, 10121 Torino TO',
      emergencyContactName: 'Carla Bassi',
      emergencyContactPhone:'+39 333 200 3002',
      registeredById:       'SEED-OP-002',
    },
    {
      id:                   'SEED-PAZ-004',
      medicalRecordNumber:  'MRN-DEMO-004',
      firstName:            'Teresa',
      lastName:             'Lombardi',
      dateOfBirth:          dob(1961, 5, 8),
      sex:                  'F',
      email:                'teresa.lombardi@demo.it',
      phone:                '+39 333 200 4001',
      address:              'Via Dante 33, 40121 Bologna BO',
      emergencyContactName: 'Franco Lombardi',
      emergencyContactPhone:'+39 333 200 4002',
      registeredById:       'SEED-OP-002',
    },
    {
      id:                   'SEED-PAZ-005',
      medicalRecordNumber:  'MRN-DEMO-005',
      firstName:            'Carlo',
      lastName:             'Neri',
      dateOfBirth:          dob(1938, 9, 27),
      sex:                  'M',
      email:                'carlo.neri@demo.it',
      phone:                '+39 333 200 5001',
      address:              'Piazza Navona 2, 00186 Roma RM',
      emergencyContactName: 'Luisa Neri',
      emergencyContactPhone:'+39 333 200 5002',
      registeredById:       'SEED-OP-003',
    },
    {
      id:                   'SEED-PAZ-006',
      medicalRecordNumber:  'MRN-DEMO-006',
      firstName:            'Lucia',
      lastName:             'Gatti',
      dateOfBirth:          dob(1970, 2, 14),
      sex:                  'F',
      email:                'lucia.gatti@demo.it',
      phone:                '+39 333 200 6001',
      address:              'Via Verdi 18, 50121 Firenze FI',
      emergencyContactName: 'Marco Gatti',
      emergencyContactPhone:'+39 333 200 6002',
      registeredById:       'SEED-OP-003',
    },
    {
      id:                   'SEED-PAZ-007',
      medicalRecordNumber:  'MRN-DEMO-007',
      firstName:            'Roberto',
      lastName:             'Mancini',
      dateOfBirth:          dob(1958, 12, 1),
      sex:                  'M',
      email:                'roberto.mancini@demo.it',
      phone:                '+39 333 200 7001',
      address:              'Via Manzoni 55, 20121 Milano MI',
      emergencyContactName: 'Paola Mancini',
      emergencyContactPhone:'+39 333 200 7002',
      registeredById:       'SEED-OP-001',
    },
    {
      id:                   'SEED-PAZ-008',
      medicalRecordNumber:  'MRN-DEMO-008',
      firstName:            'Elena',
      lastName:             'Moretti',
      dateOfBirth:          dob(1985, 6, 30),
      sex:                  'F',
      email:                'elena.moretti@demo.it',
      phone:                '+39 333 200 8001',
      address:              'Via Leopardi 9, 20123 Milano MI',
      emergencyContactName: 'Stefano Moretti',
      emergencyContactPhone:'+39 333 200 8002',
      registeredById:       'SEED-OP-002',
    },
  ]

  for (const p of patientsData) {
    await prisma.patient.upsert({
      where:  { medicalRecordNumber: p.medicalRecordNumber },
      update: {
        firstName:            p.firstName,
        lastName:             p.lastName,
        phone:                p.phone,
        email:                p.email,
        address:              p.address,
        emergencyContactName: p.emergencyContactName,
        emergencyContactPhone:p.emergencyContactPhone,
      },
      create: p,
    })
  }
  console.log(`✓  ${patientsData.length} pazienti demo creati/aggiornati`)

  // ── 4. Clinical Records ─────────────────────────────────────────────────────
  const recordsData = [
    {
      id:              'SEED-CR-001',
      patientId:       'SEED-PAZ-001',
      authorOperatorId:'SEED-OP-001',
      chiefComplaint:  'Dolori articolari agli arti inferiori, difficoltà alla deambulazione',
      diagnosis:       'Artrosi severa bilaterlae ginocchio — gonartrosi IV grado',
      treatmentPlan:   'Fisioterapia quotidiana, terapia antinfiammatoria, valutazione ortopedica',
    },
    {
      id:              'SEED-CR-002',
      patientId:       'SEED-PAZ-002',
      authorOperatorId:'SEED-OP-001',
      chiefComplaint:  'Dispnea da sforzo, edemi agli arti inferiori, affaticamento',
      diagnosis:       'Scompenso cardiaco cronico — NYHA classe II',
      treatmentPlan:   'Monitoraggio parametri vitali 3 volte/die, diuretici, dieta iposodica',
    },
    {
      id:              'SEED-CR-003',
      patientId:       'SEED-PAZ-003',
      authorOperatorId:'SEED-OP-002',
      chiefComplaint:  'Caduta accidentale con frattura femore destro, post-operatorio giorno 3',
      diagnosis:       'Frattura pertrocanterica femore destro — osteosintesi con chiodo endomidollare',
      treatmentPlan:   'Mobilizzazione progressiva assistita, fisioterapia, profilassi TVP',
    },
    {
      id:              'SEED-CR-004',
      patientId:       'SEED-PAZ-004',
      authorOperatorId:'SEED-OP-002',
      chiefComplaint:  'Ictus ischemico emisferio sinistro — deficit motorio emilato destro',
      diagnosis:       'Stroke ischemico ACM sinistra — esiti emiplegia destra e afasia parziale',
      treatmentPlan:   'Riabilitazione neuromotoria intensiva, logopedia, terapia anticoagulante',
    },
    {
      id:              'SEED-CR-005',
      patientId:       'SEED-PAZ-005',
      authorOperatorId:'SEED-OP-003',
      chiefComplaint:  'Ipertensione arteriosa non controllata, cefalea ricorrente',
      diagnosis:       'Ipertensione arteriosa essenziale grado II — insufficienza renale lieve',
      treatmentPlan:   'Monitoraggio PA 2 volte/die, dieta iposodica, aggiustamento terapia antipertensiva',
    },
    {
      id:              'SEED-CR-006',
      patientId:       'SEED-PAZ-006',
      authorOperatorId:'SEED-OP-003',
      chiefComplaint:  'Dolore lombare cronico irradiato, riduzione forza arti inferiori',
      diagnosis:       'Ernia discale L4-L5 con radicolopatia — stenosi canale spinale',
      treatmentPlan:   'Fisioterapia specifica, FANS, valutazione neurochirurgica programmata',
    },
    {
      id:              'SEED-CR-007',
      patientId:       'SEED-PAZ-007',
      authorOperatorId:'SEED-OP-001',
      chiefComplaint:  'Diabete mellito tipo 2 scompensato, ulcera piede sinistro',
      diagnosis:       'DM tipo 2 — piede diabetico ulcerato grado Wagner 2 — neuropatia periferica',
      treatmentPlan:   'Medicazione avanzata ulcera, ottimizzazione glicemia, antibioticoterapia',
    },
    {
      id:              'SEED-CR-008',
      patientId:       'SEED-PAZ-008',
      authorOperatorId:'SEED-OP-002',
      chiefComplaint:  'Post-operatorio appendicectomia laparoscopica — decorso regolare',
      diagnosis:       'Appendicite acuta — appendicectomia laparoscopica',
      treatmentPlan:   'Monitoraggio ferita, dieta progressiva, profilassi antibiotica, mobilizzazione precoce',
    },
  ]

  for (const cr of recordsData) {
    await prisma.clinicalRecord.upsert({
      where:  { id: cr.id },
      update: { chiefComplaint: cr.chiefComplaint, diagnosis: cr.diagnosis, treatmentPlan: cr.treatmentPlan },
      create: cr,
    })
  }
  console.log(`✓  ${recordsData.length} cartelle cliniche demo create/aggiornate`)

  // ── 5. Clinical Notes ───────────────────────────────────────────────────────
  const notesData = [
    // Paziente 1 — Mario Ferrioli
    { id: 'SEED-CN-001', clinicalRecordId: 'SEED-CR-001', authorOperatorId: 'SEED-OP-001',
      note: 'Paziente collaborante. PA 130/80. Dolore VAS 5/10 a riposo, 7/10 alla mobilizzazione.' },
    { id: 'SEED-CN-002', clinicalRecordId: 'SEED-CR-001', authorOperatorId: 'SEED-OP-003',
      note: 'Sessione fisioterapia completata. Miglioramento flessione anca destra +10°. Paziente motivato.' },
    // Paziente 2 — Anna Martini
    { id: 'SEED-CN-003', clinicalRecordId: 'SEED-CR-002', authorOperatorId: 'SEED-OP-001',
      note: 'Parametri stabili. SpO2 96%, FC 78, PA 145/90. Edemi periferici invariati. Peso mattutino +0.5 kg.' },
    { id: 'SEED-CN-004', clinicalRecordId: 'SEED-CR-002', authorOperatorId: 'SEED-OP-002',
      note: 'Rivalutazione cardiologica programmata per giovedì. ECG attuale: RS, non modificazioni significative.' },
    // Paziente 3 — Giorgio Bassi
    { id: 'SEED-CN-005', clinicalRecordId: 'SEED-CR-003', authorOperatorId: 'SEED-OP-002',
      note: 'Primo tentativo stazione eretta con assistenza. Tollerato bene. Analgesia adeguata VAS 3/10.' },
    { id: 'SEED-CN-006', clinicalRecordId: 'SEED-CR-003', authorOperatorId: 'SEED-OP-003',
      note: 'Esercizi mobilizzazione passiva arto operato. Ferita chirurgica in buone condizioni, nessun segno infettivo.' },
    // Paziente 4 — Teresa Lombardi
    { id: 'SEED-CN-007', clinicalRecordId: 'SEED-CR-004', authorOperatorId: 'SEED-OP-002',
      note: 'Sessione logopedia: comprensione verbale in miglioramento. Espressione ancora compromessa.' },
    { id: 'SEED-CN-008', clinicalRecordId: 'SEED-CR-004', authorOperatorId: 'SEED-OP-003',
      note: 'Fisioterapia neuromotoria. Migliorata tonicità arto superiore destro. Cammino con deambulatore.' },
    // Paziente 5 — Carlo Neri
    { id: 'SEED-CN-009', clinicalRecordId: 'SEED-CR-005', authorOperatorId: 'SEED-OP-003',
      note: 'PA mattutina 168/98 — PA serale 155/92. Contattato medico per rivalutazione dosaggio ramipril.' },
    // Paziente 6 — Lucia Gatti
    { id: 'SEED-CN-010', clinicalRecordId: 'SEED-CR-006', authorOperatorId: 'SEED-OP-003',
      note: 'Esercizi stabilizzazione lombare tollerati. Riferisce riduzione dolore irradiato all\'arto sinistro.' },
    // Paziente 7 — Roberto Mancini
    { id: 'SEED-CN-011', clinicalRecordId: 'SEED-CR-007', authorOperatorId: 'SEED-OP-001',
      note: 'Medicazione ulcera: tessuto di granulazione presente, margini migliorati. Glicemia capillare 187 mg/dL.' },
    { id: 'SEED-CN-012', clinicalRecordId: 'SEED-CR-007', authorOperatorId: 'SEED-OP-002',
      note: 'Educazione terapeutica paziente su gestione piede diabetico e controllo glicemico domiciliare.' },
    // Paziente 8 — Elena Moretti
    { id: 'SEED-CN-013', clinicalRecordId: 'SEED-CR-008', authorOperatorId: 'SEED-OP-002',
      note: 'Decorso post-operatorio regolare. Dolore VAS 2/10. Prima mobilizzazione autonoma effettuata.' },
  ]

  for (const cn of notesData) {
    await prisma.clinicalNote.upsert({
      where:  { id: cn.id },
      update: { note: cn.note },
      create: cn,
    })
  }
  console.log(`✓  ${notesData.length} note cliniche demo create/aggiornate`)

  // ── 6. Appointments ─────────────────────────────────────────────────────────
  const appointmentsData = [
    {
      id:              'SEED-APP-001',
      patientId:       'SEED-PAZ-001',
      operatorId:      'SEED-OP-003',
      createdByUserId: 'SEED-USER-002',
      scheduledAt:     futureDate(1, 9, 30),
      durationMinutes: 45,
      reason:          'Seduta fisioterapia — mobilizzazione arti inferiori',
      status:          'SCHEDULED' as const,
    },
    {
      id:              'SEED-APP-002',
      patientId:       'SEED-PAZ-002',
      operatorId:      'SEED-OP-001',
      createdByUserId: 'SEED-USER-002',
      scheduledAt:     futureDate(1, 11, 0),
      durationMinutes: 30,
      reason:          'Monitoraggio parametri cardiaci settimanale',
      status:          'SCHEDULED' as const,
    },
    {
      id:              'SEED-APP-003',
      patientId:       'SEED-PAZ-003',
      operatorId:      'SEED-OP-003',
      createdByUserId: 'SEED-USER-003',
      scheduledAt:     futureDate(2, 10, 0),
      durationMinutes: 60,
      reason:          'Fisioterapia post-operatoria — primo appoggio con deambulatore',
      status:          'SCHEDULED' as const,
    },
    {
      id:              'SEED-APP-004',
      patientId:       'SEED-PAZ-004',
      operatorId:      'SEED-OP-003',
      createdByUserId: 'SEED-USER-003',
      scheduledAt:     futureDate(2, 14, 30),
      durationMinutes: 60,
      reason:          'Riabilitazione neuromotoria — sessione intensiva',
      status:          'SCHEDULED' as const,
    },
    {
      id:              'SEED-APP-005',
      patientId:       'SEED-PAZ-007',
      operatorId:      'SEED-OP-001',
      createdByUserId: 'SEED-USER-002',
      scheduledAt:     futureDate(3, 8, 0),
      durationMinutes: 20,
      reason:          'Medicazione piede diabetico — controllo ulcera',
      status:          'SCHEDULED' as const,
    },
  ]

  for (const ap of appointmentsData) {
    await prisma.appointment.upsert({
      where:  { id: ap.id },
      update: { scheduledAt: ap.scheduledAt, reason: ap.reason },
      create: ap,
    })
  }
  console.log(`✓  ${appointmentsData.length} appuntamenti demo creati/aggiornati`)

  // ── Summary ─────────────────────────────────────────────────────────────────
  const totPazienti   = await prisma.patient.count()
  const totCartelle   = await prisma.clinicalRecord.count()
  const totNote       = await prisma.clinicalNote.count()
  const totAppuntamenti = await prisma.appointment.count()

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Seed completato. Totali nel DB:
  • Pazienti:       ${totPazienti}
  • Cartelle:       ${totCartelle}
  • Note cliniche:  ${totNote}
  • Appuntamenti:   ${totAppuntamenti}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
}

main()
  .catch(e => { console.error('❌  Seed fallito:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
