import {resolve} from 'node:path';
import {startPo05Postgres} from './po05-postgres.mjs';
import {seedParameterDatabase,selectLocalParameterDatabase,closeParameterPrisma,fixtureActors} from './parameter-database.mjs';
export {fixtureActors};
export const MNA_VERSION='mna-it-2026-09-22-q-corrected-v1';
export const mnaEmpty=()=>({extent:'screening',A:null,B:null,C:null,D:null,E:null,F:{method:'category',category:null},G:null,H:null,I:null,J:null,K:{dairyDaily:null,eggsOrLegumesWeekly:null,meatFishOrPoultryDaily:null},L:null,M:null,N:null,O:null,P:null,Q:{method:'category',category:null},R:{method:'category',category:null},measurements:{weightKg:null,heightCm:null,armCircumferenceCm:null,calfCircumferenceCm:null},measurementDates:{weightKg:null,heightCm:null,armCircumferenceCm:null,calfCircumferenceCm:null},notes:''});
export const mnaScreening=()=>({...mnaEmpty(),A:'no_reduction',B:'no_loss',C:'goes_out',D:false,E:'no_psychological_problems',F:{method:'category',category:'gte23'}});
export const mnaFull=()=>({...mnaScreening(),extent:'full',G:true,H:false,I:false,J:'three_meals',K:{dairyDaily:true,eggsOrLegumesWeekly:true,meatFishOrPoultryDaily:true},L:true,M:'gt5_glasses',N:'independent_without_difficulty',O:'no_nutritional_problems',P:'better',Q:{method:'category',category:'gt22'},R:{method:'category',category:'gte31'}});
export async function startPo13Fixture(){
 const database=await startPo05Postgres({artifactRoot:resolve('artifacts/task-validation/po-13-mna/scratch')});
 selectLocalParameterDatabase(database.url);
 const {prisma}=await import('../../backend/src/lib/prisma.js');
 try{
  await seedParameterDatabase(database.db);
  await prisma.patient.update({where:{id:'vitals-qa-anna'},data:{lastName:'Dall’Acqua',firstName:'Anna Àgata'}});
  return {database,prisma,close:async()=>{await closeParameterPrisma(prisma);await database.close()}};
 }catch(error){await closeParameterPrisma(prisma);await database.close();throw error}
}
