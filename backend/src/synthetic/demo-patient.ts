// Paziente demo completo «Fabio Forlano»: una cartella con ogni sezione valorizzata (anamnesi,
// diagnosi, allergie, farmaci, parametri, diari, medicazioni, Braden, contenzioni, piano di cura…).
// Idempotente per MRN. Usato da `POST /patients/demo-setup` e dal dataset sintetico.
// Tutti i dati sono inventati; nessun dato reale.

import { Prisma, type PrismaClient } from '@prisma/client';
import { preserveNrsHistory, preserveTinettiHistory } from '../patients/cartella-update.js';
import { preserveTemporaryPsExits } from '../patients/temporary-ps-exits.js';

export const DEMO_PATIENT_MRN = 'DEMO-FULL-001';
export const DEMO_PATIENT_SECTIONS = [
  'anamnesi',
  'diagnosi',
  'allergie',
  'farmaci',
  'terapie',
  'parametriVitali',
  'parametriMensili',
  'diarioInfermieristico',
  'diarioMedico',
  'medicazioniFerite',
  'documentiConsegnati',
  'valutazioniBraden',
  'contenzioni',
  'indicatoriRischio',
  'pianoCura',
  'noteClinica',
  'visite',
  'presaInCarico',
] as const;

export async function seedFullDemoPatient(
  prisma: PrismaClient,
): Promise<{ patientId: string; medicalRecordNumber: string }> {
  const DEMO_MRN = DEMO_PATIENT_MRN;
  const DEMO_EMAIL = 'fabio.forlano@example.local';
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  // Upsert patient by MRN
  let patient = await prisma.patient.findFirst({
    where: { OR: [{ medicalRecordNumber: DEMO_MRN }, { email: DEMO_EMAIL }] },
  });

  if (patient) {
    patient = await prisma.patient.update({
      where: { id: patient.id },
      data: {
        medicalRecordNumber: DEMO_MRN,
        firstName: 'Fabio',
        lastName: 'Forlano',
        dateOfBirth: new Date('1948-05-12'),
        sex: 'M',
        phone: '+39 333 0000001',
        email: DEMO_EMAIL,
        emergencyContactName: 'Maria Forlano',
        emergencyContactPhone: '+39 333 0000002',
      },
    });
  } else {
    patient = await prisma.patient.create({
      data: {
        medicalRecordNumber: DEMO_MRN,
        firstName: 'Fabio',
        lastName: 'Forlano',
        dateOfBirth: new Date('1948-05-12'),
        sex: 'M',
        phone: '+39 333 0000001',
        email: DEMO_EMAIL,
        emergencyContactName: 'Maria Forlano',
        emergencyContactPhone: '+39 333 0000002',
      },
    });
  }

  // Build complete cartella
  const cartella = {
    pazienteId: patient.id,
    statoRicovero: 'ricoverato',
    cameraNumero: '12',
    lettoNumero: 'A',
    // #294 (QA F6): carattere di controllo corretto ('N', il vecchio 'X' era invalido).
    codiceFiscale: 'FRLFBA48E12H501N',
    contattoEmergenzaNome: 'Maria Forlano',
    contattoEmergenzaTel: '+39 333 0000002',
    contattoEmergenzaRel: 'Figlia',
    patologiaIngresso: 'Riabilitazione e monitoraggio clinico',
    diabetico: true,
    ipertensione: true,
    terapiaTriturata: false,
    dataRicovero: today,
    noteGenerali: 'Paziente collaborante, deambulazione assistita',
    medicoCurante: 'Dr. Bianchi',

    anamnesi: {
      fisiologica: 'Sesso maschile, 77 anni',
      patologicaRemota: 'Pregresso intervento chirurgico addominale',
      patologicaProssima: 'Ridotta autonomia nella deambulazione. Rischio caduta moderato.',
      familiare: 'Padre iperteso, madre diabetica',
      lavorativa: 'Pensionato, ex operaio',
      abitudini: 'Non fumatore, consumo modesto di alcol',
      note: '',
      updatedAt: now,
      operatore: 'Inf. Demo',
    },

    diagnosi: [
      {
        id: 'demo-diag-1',
        codiceICD: 'J44.1',
        descrizione: 'BPCO lieve',
        tipo: 'principale',
        stato: 'attiva',
        dataInsorgenza: '2020-01-15',
        operatore: 'Dr. Demo',
        note: 'In trattamento',
        createdAt: now,
      },
      {
        id: 'demo-diag-2',
        codiceICD: 'I10',
        descrizione: 'Ipertensione arteriosa',
        tipo: 'comorbidita',
        stato: 'attiva',
        dataInsorgenza: '2015-06-01',
        operatore: 'Dr. Demo',
        note: '',
        createdAt: now,
      },
      {
        id: 'demo-diag-3',
        codiceICD: 'E11',
        descrizione: 'Diabete mellito tipo 2',
        tipo: 'comorbidita',
        stato: 'attiva',
        dataInsorgenza: '2018-03-10',
        operatore: 'Dr. Demo',
        note: 'Controllato con Metformina',
        createdAt: now,
      },
    ],

    allergie: [
      {
        id: 'demo-all-1',
        allergene: 'Penicillina',
        reazione: 'Rash cutaneo',
        gravita: 'grave',
        documentato: today,
        documentatoDa: 'Inf. Demo',
        note: 'Documentata in cartella ospedaliera',
      },
    ],

    farmaci: [
      {
        id: 'demo-farm-1',
        nome: 'Claritromicina',
        dose: '500 mg',
        frequenza: 'mattina e sera',
        via: 'orale',
        inizio: today,
        stato: 'attivo',
        prescrittoDA: 'Dr. Demo',
        h08: '✓',
        h20: '✓',
      },
      {
        id: 'demo-farm-2',
        nome: 'Ramipril',
        dose: '5 mg',
        frequenza: '1x/die mattina',
        via: 'orale',
        inizio: today,
        stato: 'attivo',
        prescrittoDA: 'Dr. Demo',
        h08: '✓',
      },
      {
        id: 'demo-farm-3',
        nome: 'Metformina',
        dose: '500 mg',
        frequenza: 'pranzo e cena',
        via: 'orale',
        inizio: today,
        stato: 'attivo',
        prescrittoDA: 'Dr. Demo',
        h12: '✓',
        h20: '✓',
      },
      {
        id: 'demo-farm-4',
        nome: 'Paracetamolo',
        dose: '1000 mg',
        frequenza: 'al bisogno',
        via: 'orale',
        inizio: today,
        stato: 'attivo',
        prescrittoDA: 'Dr. Demo',
        indicazione: 'Dolore o febbre > 38°C',
      },
    ],

    terapie: [
      {
        id: 'demo-ter-1',
        tipo: 'farmacologica',
        descrizione: 'Schema insulinico: 100-150→3U, 151-200→5U, 201-250→7U, >250→avvisare medico',
        dataInizio: today,
        stato: 'attiva',
        operatore: 'Dr. Demo',
        note: 'Insulina rapida SC',
        createdAt: now,
      },
    ],

    parametriVitali: [
      {
        id: 'demo-pv-1',
        etichetta: 'PA',
        valore: '130/85',
        unita: 'mmHg',
        stato: 'normale',
        rilevato: today,
        rilevatoDa: 'Inf. Demo',
      },
      {
        id: 'demo-pv-2',
        etichetta: 'FC',
        valore: '78',
        unita: 'bpm',
        stato: 'normale',
        rilevato: today,
        rilevatoDa: 'Inf. Demo',
      },
      {
        id: 'demo-pv-3',
        etichetta: 'SpO2',
        valore: '96',
        unita: '%',
        stato: 'normale',
        rilevato: today,
        rilevatoDa: 'Inf. Demo',
      },
      {
        id: 'demo-pv-4',
        etichetta: 'TC',
        valore: '36.5',
        unita: '°C',
        stato: 'normale',
        rilevato: today,
        rilevatoDa: 'Inf. Demo',
      },
      {
        id: 'demo-pv-5',
        etichetta: 'DTX',
        valore: '145',
        unita: 'mg/dL',
        stato: 'attenzione',
        rilevato: today,
        rilevatoDa: 'Inf. Demo',
      },
    ],

    parametriMensili: [
      {
        id: 'demo-pm-1',
        mese: new Date().getMonth() + 1,
        anno: new Date().getFullYear(),
        createdAt: now,
        giorni: [
          {
            giorno: 1,
            pa: '130/85',
            fc: '78',
            spo2: '96',
            temperatura: '36.5',
            dtx08: '145',
            evacuazione: 'Sì',
            note: 'Stabile',
          },
          {
            giorno: 2,
            pa: '125/80',
            fc: '82',
            spo2: '97',
            temperatura: '36.4',
            dtx08: '138',
            dtx12: '155',
            evacuazione: 'No',
          },
          {
            giorno: 3,
            pa: '140/90',
            fc: '75',
            spo2: '95',
            temperatura: '36.8',
            dtx08: '160',
            evacuazione: 'Sì',
            note: 'PA leggermente alta',
          },
          {
            giorno: 4,
            pa: '135/85',
            fc: '80',
            spo2: '96',
            temperatura: '36.6',
            dtx08: '142',
            dtx18: '150',
            evacuazione: 'Sì',
          },
          {
            giorno: 5,
            pa: '128/82',
            fc: '76',
            spo2: '97',
            temperatura: '36.3',
            dtx08: '135',
            evacuazione: 'No',
            note: 'Valori ottimali',
          },
        ],
      },
    ],

    diarioInfermieristico: [
      {
        id: 'demo-di-1',
        data: today,
        ora: '08:00',
        turno: 'mattina',
        tipo: 'ordinario',
        testo: 'Paziente collaborante, ha assunto terapia regolarmente. Parametri nella norma.',
        operatore: 'Inf. Demo',
        createdAt: now,
        priorita: 'normale',
        stato: 'completata',
      },
      {
        id: 'demo-di-2',
        data: today,
        ora: '10:30',
        turno: 'mattina',
        tipo: 'urgente',
        testo: 'PA 160/95 dopo sforzo. Monitoraggio ravvicinato. Avvisato medico.',
        operatore: 'Inf. Demo',
        createdAt: now,
        priorita: 'urgente',
        stato: 'completata',
      },
      {
        id: 'demo-di-3',
        data: today,
        ora: '14:00',
        turno: 'pomeriggio',
        tipo: 'ordinario',
        testo: 'Deambulazione assistita con fisioterapista. Buona tolleranza allo sforzo.',
        operatore: 'Inf. Demo',
        createdAt: now,
        priorita: 'normale',
        stato: 'completata',
      },
      {
        id: 'demo-di-4',
        data: today,
        ora: '20:00',
        turno: 'notte',
        tipo: 'segnalazione',
        testo: 'Paziente riferisce leggero dolore toracico. Monitorare durante la notte.',
        operatore: 'Inf. Demo',
        createdAt: now,
        priorita: 'alta',
        stato: 'aperta',
      },
    ],

    diarioMedico: [
      {
        id: 'demo-dm-1',
        data: today,
        ora: '09:00',
        turno: 'mattina',
        tipo: 'ordinario',
        testo:
          'Tosse produttiva persistente. Si prescrive Claritromicina 500 mg x 2/die per 7 giorni.',
        operatore: 'Dr. Demo',
        createdAt: now,
        prescrizione: 'Claritromicina 500 mg 1 cp mattina + 1 cp sera x 7 gg',
        firmaMedico: 'Dr. Demo',
      },
      {
        id: 'demo-dm-2',
        data: today,
        ora: '15:00',
        turno: 'pomeriggio',
        tipo: 'ordinario',
        testo: 'Rivalutazione parametri. PA rientrata nei limiti dopo riposo. DTX da monitorare.',
        operatore: 'Dr. Demo',
        createdAt: now,
        evoluzione: 'Condizioni stabili, proseguire monitoraggio',
        firmaMedico: 'Dr. Demo',
      },
    ],

    medicazioniFerite: [
      {
        id: 'demo-med-1',
        data: today,
        sede: 'Tallone destro',
        tipoLesione: 'LDP',
        grado: '1',
        tipoMedicazione: 'Medicazione protettiva',
        materiale: 'Film in poliuretano',
        aspettoLesione: 'Eritema non sbiancabile',
        dimensioni: '2x2 cm',
        odore: false,
        essudato: 'assente',
        cutePerilisionale: 'Integra',
        prossimaMedicazione: 'Controllo programmato fra 3 giorni',
        operatore: 'Inf. Demo',
        note: 'Primo rilevamento',
        createdAt: now,
        followUps: [
          {
            id: 'demo-fu-1',
            data: today,
            siglaOperatore: 'ID',
            motivoSostituzione: 'termine',
            note: 'Controllo programmato',
            createdAt: now,
          },
        ],
      },
    ],

    documentiConsegnati: [
      {
        id: 'demo-doc-1',
        tipo: 'documento_identita',
        descrizione: "Carta d'identità",
        dataConsegna: today,
        firmatoDA: 'Fabio Forlano',
        operatore: 'Inf. Demo',
        note: '',
        stato: 'ricevuto',
      },
      {
        id: 'demo-doc-2',
        tipo: 'tessera_sanitaria',
        descrizione: 'Tessera sanitaria',
        dataConsegna: today,
        firmatoDA: 'Fabio Forlano',
        operatore: 'Inf. Demo',
        note: '',
        stato: 'ricevuto',
      },
      {
        id: 'demo-doc-3',
        tipo: 'consenso_privacy',
        descrizione: 'Consenso privacy firmato',
        dataConsegna: today,
        firmatoDA: 'Fabio Forlano',
        operatore: 'Inf. Demo',
        note: '',
        stato: 'firmato',
      },
      {
        id: 'demo-doc-4',
        tipo: 'lettera_dimissione',
        descrizione: 'Lettera dimissione ospedaliera',
        dataConsegna: today,
        firmatoDA: 'Ospedale Demo',
        operatore: 'Inf. Demo',
        note: 'Dal ricovero precedente',
        stato: 'ricevuto',
      },
      {
        id: 'demo-doc-5',
        tipo: 'prescrizione',
        descrizione: 'Piano terapeutico',
        dataConsegna: today,
        firmatoDA: 'Dr. Demo',
        operatore: 'Inf. Demo',
        note: '',
        stato: 'ricevuto',
      },
    ],

    valutazioniBraden: [
      {
        id: 'demo-br-1',
        data: today,
        percezioneSensoriale: 3,
        umidita: 3,
        attivita: 3,
        mobilita: 2,
        nutrizione: 3,
        frizione: 2,
        operatore: 'Inf. Demo',
        note: 'Valutazione iniziale — rischio moderato',
        createdAt: now,
      },
    ],

    contenzioni: [
      {
        id: 'demo-cont-1',
        dataInizio: today,
        oraInizio: '22:00',
        tipo: 'spondina',
        motivoClinico: 'Rischio caduta notturno',
        autorizzazioneMedico: true,
        autorizzazioneTutore: true,
        intervalloRivalutazione: 24,
        dataFine: '',
        oraFine: '',
        attiva: false,
        operatore: 'Inf. Demo',
        note: 'Dato demo per test funzionale',
        createdAt: now,
        spondineAttive: true,
        spondineFrequenza: 'notturna',
        motivCadute: true,
        firmaPazienteReferente: 'Maria Forlano',
      },
    ],

    indicatoriRischio: [
      {
        id: 'demo-risk-1',
        tipo: 'caduta',
        livello: 'medio',
        descrizione: 'Rischio caduta moderato per deambulazione assistita',
        dataValutazione: today,
        operatore: 'Inf. Demo',
      },
      {
        id: 'demo-risk-2',
        tipo: 'lesioni_pressione',
        livello: 'medio',
        descrizione: 'Braden 16 — rischio moderato LDP',
        dataValutazione: today,
        operatore: 'Inf. Demo',
      },
    ],

    pianoCura: {
      obiettivi: 'Ripristino autonomia deambulatoria. Stabilizzazione parametri vitali.',
      interventiPrevisti: 'Fisioterapia quotidiana, monitoraggio PA e DTX, terapia farmacologica',
      notePianificazione: 'Rivalutazione settimanale',
      dataAggiornamento: today,
      operatore: 'Dr. Demo',
    },

    noteClinica: [
      {
        id: 'demo-nc-1',
        tipo: 'clinica',
        contenuto:
          'Paziente in buone condizioni generali. Collaborante. Obiettivo: recupero deambulazione autonoma entro 30 giorni.',
        operatore: 'Dr. Demo',
        createdAt: now,
      },
      {
        id: 'demo-nc-2',
        tipo: 'nursing',
        contenuto: 'Cute integra eccetto tallone dx (LDP grado 1). Piano medicazioni attivato.',
        operatore: 'Inf. Demo',
        createdAt: now,
      },
    ],

    visite: [
      {
        id: 'demo-vis-1',
        tipo: 'Visita medica',
        data: today,
        ora: '09:00',
        operatore: 'Dr. Demo',
        descrizione: 'Prima visita dopo ingresso. Valutazione clinica completa.',
        esito: 'Condizioni discrete, terapia impostata',
        followUp: 'Rivalutazione fra 7 giorni',
        createdAt: now,
      },
      {
        id: 'demo-vis-2',
        tipo: 'Fisioterapia',
        data: today,
        ora: '14:00',
        operatore: 'Ft. Demo',
        descrizione: 'Valutazione motoria. Deambulazione assistita 50m con deambulatore.',
        esito: 'Buona tolleranza, proseguire programma riabilitativo',
        createdAt: now,
      },
    ],

    interventi: [],

    presaInCarico: {
      dataIngresso: today,
      oraIngresso: '08:00',
      provenienza: 'dimissione_ospedaliera',
      centroInviante: 'Ospedale Demo',
      modalitaIngresso: 'ambulante',
      accompagnatoDa: 'Maria Forlano (figlia)',
      motivoIngresso: 'Riabilitazione e monitoraggio clinico',
      operatoreResponsabile: 'Inf. Demo',
      condizioniGenerali: 'discrete',
      condizioniIniziali: 'Paziente collaborante, deambulazione assistita',
      noteIniziali: 'Proveniente da Ospedale Demo dopo intervento chirurgico addominale',
      camera: '12',
      letto: 'A',
      statoCoscienza: 'vigile',
      orientamento: 'orientato',
      autonomia: 'parzialmente_autonomo',
      comunicazione: 'Buona',
      udito: 'Nella norma',
      vista: 'Nella norma con correzione',
      dentizione: 'Protesi parziale',
      alimentazione: 'Autonomo, dieta diabetica',
      eliminazioneUrinaria: 'Autonoma',
      eliminazioneIntestinale: 'Regolare',
      mobilita: 'Deambulazione assistita',
      cuteIntegrita: 'Eritema non sbiancabile tallone destro',
      dolore: 'assente',
      doloreLivello: 0,
      materialeConsegnato: true,
      operatore: 'Inf. Demo',
      note: '',
      compilatoAt: now,
    },
  };

  // Upsert cartella
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Patient" WHERE id = ${patient.id} FOR UPDATE`;
    const rows = await tx.$queryRaw<Array<{ data: Prisma.JsonValue }>>`
      SELECT data FROM "Cartella" WHERE "patientId" = ${patient.id} FOR UPDATE`;
    const current = rows[0]?.data;
    // Demo initialization obeys the same managed-state and legacy-history protection.
    const incoming = cartella;
    const protectedData = preserveTemporaryPsExits(
      current,
      preserveNrsHistory(current, preserveTinettiHistory(current, incoming)),
    );
    await tx.cartella.upsert({
      where: { patientId: patient.id },
      create: { patientId: patient.id, data: protectedData as Prisma.InputJsonObject },
      update: { data: protectedData as Prisma.InputJsonObject },
    });
  });

  return { patientId: patient.id, medicalRecordNumber: DEMO_MRN };
}
