import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.DATABASE_URL='postgresql://unit:unit@127.0.0.1:1/unit_no_db';
test('actual patchDraft rejects forged original text before mocked persistence; original evidence and legacy append remain compatible',async()=>{
 const {prisma}=await import('../../../backend/src/lib/prisma.ts');
 const {patchDraft}=await import('../../../backend/src/intake/draft-service.ts');
 const {therapySourceInventory}=await import('../../../backend/src/intake/therapy-source-inventory.ts');
 const rows=therapySourceInventory('',[{nome:'Synthetic Omega',dose:'5 mg'}]);
 const current={id:'synthetic-draft',importJobId:null,status:'draft',version:1,data:{terapiaImport:rows}};
 const originalTransaction=prisma.$transaction,originalFind=prisma.patientIntakeDraft.findUniqueOrThrow;
 let writes=0;
 const tx={ $queryRaw:async()=>[],patientIntakeDraft:{findUniqueOrThrow:async()=>current,update:async(args:any)=>{writes++;return {...current,...args.data};}}};
 try{
  (prisma as any).$transaction=async(callback:any)=>callback(tx);
  (prisma.patientIntakeDraft as any).findUniqueOrThrow=async()=>({importJobId:null});
  await assert.rejects(patchDraft(current.id,{terapiaImport:[{...rows[0],originalText:'Forged synthetic instruction'}]}),/testo originale|provenienza|Conserva le righe originali/);
  assert.equal(writes,0);
  const saved:any=await patchDraft(current.id,{terapiaImport:[{...rows[0],note:'Synthetic manual review'},{originalText:'Synthetic legacy addition'}]});
  assert.equal(writes,1);assert.equal(saved.data.terapiaImport[0].originalText,'');
  assert.deepEqual(saved.data.terapiaImport[0].structuredSource,{nome:'Synthetic Omega',dose:'5 mg'});
  assert.equal(saved.data.terapiaImport.length,2);
 }finally{
  (prisma as any).$transaction=originalTransaction;(prisma.patientIntakeDraft as any).findUniqueOrThrow=originalFind;
 }
});
