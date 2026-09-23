import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {startPo05Postgres} from './po05-postgres.mjs';
import {seedParameterDatabase,selectLocalParameterDatabase,closeParameterPrisma,fixtureActors} from './parameter-database.mjs';
import {painadEmpty,painadComplete} from './po10-assessments.mjs';
import {TRANSFERS_VERSION,transfersAnswers} from './po11-transfers.mjs';
import {TINETTI_VERSION,tinettiAnswers,legacyTinetti} from './po12-tinetti.mjs';
import {MNA_VERSION,mnaEmpty,mnaFull} from './po13-mna.mjs';
import {GDS_VERSION,gdsAnswers} from './po14-gds.mjs';
export {fixtureActors};
export const catalogInputs=[
 {type:'painad',formVersion:'painad-it-2026-09-22-v1',empty:()=>({...painadEmpty}),complete:()=>({...painadComplete})},
 {type:'postural_transfers',formVersion:TRANSFERS_VERSION,empty:()=>transfersAnswers(),complete:()=>transfersAnswers(true)},
 {type:'tinetti',formVersion:TINETTI_VERSION,empty:()=>tinettiAnswers(),complete:()=>tinettiAnswers(true)},
 {type:'mna',formVersion:MNA_VERSION,empty:mnaEmpty,complete:mnaFull},
 {type:'gds15',formVersion:GDS_VERSION,empty:()=>gdsAnswers(),complete:()=>gdsAnswers(true)},
];
export const legacyNrs=[
 {id:'po15-nrs-zero',data:'2026-09-20',ora:'08:15',punteggio:0,aRiposo:0,inMovimento:2,operatore:'Operatrice storica sintetica',note:'Valore zero esplicito',createdAt:'2026-09-20T06:16:00.000Z'},
 {id:'po15-nrs-invalid',data:'2026-09-19',punteggio:-1,operatore:'',note:'Sentinella precedente, nessuna fascia valida'},
 {id:'po15-nrs-missing',note:'Dato storico senza punteggio, data o autore'},
];
export const legacyIntakePain={aRiposo:0,inMovimento:-1,sede:'Ginocchio sintetico',note:'Dato originario dell’ingresso, non finalizzato come scala'};
export async function startPo15Fixture(){
 const database=await startPo05Postgres({artifactRoot:resolve('artifacts/task-validation/po-15-catalogo/scratch')});
 selectLocalParameterDatabase(database.url);
 const {prisma}=await import('../../backend/src/lib/prisma.js');
 try{
  await seedParameterDatabase(database.db);
  await prisma.patient.update({where:{id:'vitals-qa-anna'},data:{lastName:'Dall’Acqua',firstName:'Anna Àgata'}});
  const previous=await prisma.cartella.findUnique({where:{patientId:'vitals-qa-anna'}});
  const data={...(previous?.data??{}),valutazioniNRS:legacyNrs,valutazioniTinetti:legacyTinetti};
  await prisma.cartella.upsert({where:{patientId:'vitals-qa-anna'},create:{patientId:'vitals-qa-anna',data},update:{data}});
  await prisma.patientIntakeDraft.createMany({data:[
   {id:'po15-intake-pain',status:'confirmed',confirmedPatientId:'vitals-qa-anna',createdById:fixtureActors.operator.id,confirmedAt:new Date('2026-09-20T09:30:00.000Z'),data:{dolore:legacyIntakePain,terapiaImport:[{farmacoNome:'Terapia sintetica da verificare',excludedFromConfirm:true,note:'Istruzione conservata'}]}},
   {id:'po15-intake-null',status:'confirmed',confirmedPatientId:'vitals-qa-anna',data:{dolore:null}},
   {id:'po15-intake-unconfirmed',status:'draft',confirmedPatientId:'vitals-qa-anna',data:{dolore:{note:'Non deve comparire, bozza non confermata'}}},
   {id:'po15-intake-other',status:'confirmed',confirmedPatientId:'vitals-qa-other',data:{dolore:{note:'Non deve comparire, altro paziente'}}},
  ]});
  return {database,prisma,close:async()=>{await closeParameterPrisma(prisma);await database.close()}};
 }catch(error){await closeParameterPrisma(prisma);await database.close();throw error}
}

/** Prepared for PO15; use only after its implementation GO on the synthetic fixture. */
export async function seedPo15Assessments(){
 const {createAssessment,finalizeAssessment}=await import('../../backend/src/assessments/service.js');
 const {retryAssessmentPdf}=await import('../../backend/src/assessments/pdf-service.js');
 const actor=fixtureActors.operator,finals=[];
 for(const input of catalogInputs){
  const created=await createAssessment('vitals-qa-anna',{requestId:randomUUID(),type:input.type,formVersion:input.formVersion,assessedAt:'2026-09-22T06:30:00.000Z',answers:input.complete()},actor);
  const row=created.assessment;
  await finalizeAssessment('vitals-qa-anna',row.id,{requestId:randomUUID(),expectedVersion:row.version},actor);
  finals.push(await retryAssessmentPdf('vitals-qa-anna',row.id,actor));
 }
 const mna=catalogInputs.find(input=>input.type==='mna');
 const ownDraft=await createAssessment('vitals-qa-bruno',{requestId:randomUUID(),type:mna.type,formVersion:mna.formVersion,assessedAt:'2026-09-22T07:30:00.000Z',answers:mna.empty()},actor);
 const gds=catalogInputs.find(input=>input.type==='gds15');
 const privateDraft=await createAssessment('vitals-qa-anna',{requestId:randomUUID(),type:gds.type,formVersion:gds.formVersion,assessedAt:'2026-09-22T07:30:00.000Z',answers:gds.empty()},fixtureActors.manager);
 return {finals,ownDraft:ownDraft.assessment,privateDraft:privateDraft.assessment};
}
