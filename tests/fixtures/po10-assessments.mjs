import {resolve} from 'node:path';
import {startPo05Postgres} from './po05-postgres.mjs';
import {seedParameterDatabase,selectLocalParameterDatabase,closeParameterPrisma,fixtureActors} from './parameter-database.mjs';
export {fixtureActors};
export const painadEmpty={respiration:null,negativeVocalization:null,facialExpression:null,bodyLanguage:null,consolability:null};
export const painadComplete={respiration:2,negativeVocalization:2,facialExpression:2,bodyLanguage:2,consolability:2};
export async function startPo10Fixture(){
 const database=await startPo05Postgres({artifactRoot:resolve('artifacts/task-validation/po-10-painad/scratch')});
 selectLocalParameterDatabase(database.url);
 const {prisma}=await import('../../backend/src/lib/prisma.js');
 try{
  await seedParameterDatabase(database.db);
  await prisma.patient.update({where:{id:'vitals-qa-anna'},data:{lastName:'Dall’Acqua',firstName:'Anna Àgata'}});
  return {database,prisma,close:async()=>{await closeParameterPrisma(prisma);await database.close()}};
 }catch(error){await closeParameterPrisma(prisma);await database.close();throw error}
}
