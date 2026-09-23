import {resolve} from 'node:path';
import {startPo05Postgres} from './po05-postgres.mjs';
import {seedParameterDatabase,selectLocalParameterDatabase,closeParameterPrisma,fixtureActors} from './parameter-database.mjs';
export {fixtureActors};
export const GDS_VERSION='gds15-it-2026-09-22-v1';
export const gdsAnswers=(answer=null)=>({...Object.fromEntries(Array.from({length:15},(_,index)=>[`q${index+1}`,answer])),notes:''});
export async function startPo14Fixture(){
 const database=await startPo05Postgres({artifactRoot:resolve('artifacts/task-validation/po-14-gds/scratch')});
 selectLocalParameterDatabase(database.url);
 const {prisma}=await import('../../backend/src/lib/prisma.js');
 try{
  await seedParameterDatabase(database.db);
  await prisma.patient.update({where:{id:'vitals-qa-anna'},data:{lastName:'Dall’Acqua',firstName:'Anna Àgata'}});
  return {database,prisma,close:async()=>{await closeParameterPrisma(prisma);await database.close()}};
 }catch(error){await closeParameterPrisma(prisma);await database.close();throw error}
}
