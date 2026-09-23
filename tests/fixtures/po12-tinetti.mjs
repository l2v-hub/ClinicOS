import {resolve} from 'node:path';
import {startPo05Postgres} from './po05-postgres.mjs';
import {seedParameterDatabase,selectLocalParameterDatabase,closeParameterPrisma,fixtureActors} from './parameter-database.mjs';
export {fixtureActors};
export const TINETTI_VERSION='tinetti-it-2026-09-22-v1';
export const tinettiMax={equilibrioSeduto:1,alzarsi:2,tentativiAlzarsi:2,equilibrioImmediato:2,equilibrioProlungato:2,rombergSpinta:2,occhiChiusi:1,girarsi360Passi:1,girarsi360Stabilita:1,sedersi:2,iniziazione:1,lunghezzaPassoDx:1,altezzaPassoDx:1,lunghezzaPassoSx:1,altezzaPassoSx:1,simmetria:1,continuita:1,traiettoria:2,tronco:2,cammino:1};
export const tinettiAnswers=(complete=false)=>({...Object.fromEntries(Object.entries(tinettiMax).map(([key,max])=>[key,complete?max:null])),notes:''});
export const legacyTinetti=[
 {id:'synthetic-tinetti-legacy-complete',data:'2026-09-19',createdAt:'2026-09-19T08:10:00.000Z',operatore:'Nome storico non autenticato',...tinettiMax,note:'Valutazione precedente sintetica.'},
 {id:'synthetic-tinetti-legacy-incomplete',data:'2026-09-20',createdAt:'2026-09-20T08:10:00.000Z',operatore:'Nome storico non autenticato',...tinettiMax,alzarsi:-1,note:'Scheda precedente incompleta: non attribuire un rischio.'},
];
export async function startPo12Fixture(){
 const database=await startPo05Postgres({artifactRoot:resolve('artifacts/task-validation/po-12-tinetti/scratch')});
 selectLocalParameterDatabase(database.url);
 const {prisma}=await import('../../backend/src/lib/prisma.js');
 try{
  await seedParameterDatabase(database.db);
  await prisma.patient.update({where:{id:'vitals-qa-anna'},data:{lastName:'Dall’Acqua',firstName:'Anna Àgata'}});
  const chart=await prisma.cartella.findUniqueOrThrow({where:{patientId:'vitals-qa-anna'}});
  await prisma.cartella.update({where:{id:chart.id},data:{data:{...chart.data,valutazioniTinetti:legacyTinetti}}});
  return {database,prisma,close:async()=>{await closeParameterPrisma(prisma);await database.close()}};
 }catch(error){await closeParameterPrisma(prisma);await database.close();throw error}
}
