import {resolve} from 'node:path';
import {startPo05Postgres} from './po05-postgres.mjs';
import {seedParameterDatabase,selectLocalParameterDatabase,closeParameterPrisma,fixtureActors} from './parameter-database.mjs';
export {fixtureActors};
export const TRANSFERS_VERSION='transfers-it-2026-09-22-v1';
export const ownedAids=['wheelchair','pressureReliefCushion','oneForearmCrutch','walkingStick','quadCane','twoForearmCrutches','rollator','axillaryWalker','tableWalker'];
export const plainAids=['wheelchairRestraint','spinalBrace','kneeBrace'];
export function transfersAnswers(complete=false){
 return {
  context:{admissionDate:{status:complete?'known':null,value:complete?'2026-09-20':null},diagnosis:{status:complete?'provided':null,text:complete?'Osservazione sintetica per il collaudo dei trasferimenti.':'',unavailableReason:''}},
  operatedLegLoad:{applicable:complete?false:null,side:null,level:null},
  walking:complete?'independent':null,
  transfers:{bedToWheelchair:complete?'independent':null,wheelchairToBed:complete?'independent':null,toilet:complete?'independent':null},
  hygiene:complete?'shower':null,painOnMovement:complete?false:null,cognitiveDeterioration:complete?'none':null,
  aids:Object.fromEntries([...ownedAids.map(key=>[key,{selected:complete?false:null,ownership:null}]),...plainAids.map(key=>[key,{selected:complete?false:null}])]),notes:'',
 };
}
export async function startPo11Fixture(){
 const database=await startPo05Postgres({artifactRoot:resolve('artifacts/task-validation/po-11-postural-transfers/scratch')});
 selectLocalParameterDatabase(database.url);
 const {prisma}=await import('../../backend/src/lib/prisma.js');
 try{
  await seedParameterDatabase(database.db);
  await prisma.patient.update({where:{id:'vitals-qa-anna'},data:{lastName:'Dall’Acqua',firstName:'Anna Àgata'}});
  await prisma.operator.update({where:{id:fixtureActors.operator.id},data:{qualifica:' Fisioterapista '}});
  return {database,prisma,close:async()=>{await closeParameterPrisma(prisma);await database.close()}};
 }catch(error){await closeParameterPrisma(prisma);await database.close();throw error}
}
