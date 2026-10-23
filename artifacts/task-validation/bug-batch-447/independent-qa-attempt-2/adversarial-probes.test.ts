import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseTemporaryPsExitCommand, preserveTemporaryPsExits, currentTemporaryPsExit } from '../../../../backend/src/patients/temporary-ps-exits.ts';
import { isConcurrentWriteConflict } from '../../../../backend/src/therapies/administration-record.ts';
import { loadNews2History, loadRosterNews2 } from '../../../../frontend/src/lib/news2History.ts';
import { nextParameterPatientAcrossPages } from '../../../../frontend/src/lib/parameterRound.ts';
import { CartellaWriteQueue } from '../../../../frontend/src/lib/cartellaWriteQueue.ts';
import { prescriptionAllergyScope, prescriptionAllergyWarning, prescriptionAllergyAcknowledged, durationEnd } from '../../../../frontend/src/components/operator/cartella/therapyQuickSchedule.ts';
import { buildEmergencyContext } from '../../../../frontend/src/components/operator/invioPSModel.ts';

const command = { action:'depart', decision:'pause', reason:'Synthetic independent QA', requestId:'independent_qa2_447', confirmed:true };
const entry = {id:'exit_qa',note:'synthetic',psExit:{decision:'pause',departedAt:'2026-10-17T08:00:00Z',actorId:'qa_actor',requestId:command.requestId,requestHash:'synthetic_hash'}};
const chart = {liberatoria:{temporaryPsExit:{exitId:entry.id,decision:'pause',departedAt:entry.psExit.departedAt},usciteLog:[entry]}};

test('independent PS parser rejects implicit decisions, unconfirmed commands and extra authority fields',()=>{
  assert.deepEqual(parseTemporaryPsExitCommand(command),command);
  for(const mutation of [{decision:undefined},{confirmed:false},{actorId:'spoof'},{requestId:'short'},{reason:'x'.repeat(2001)},{action:'return',exitId:undefined}])
    assert.throws(()=>parseTemporaryPsExitCommand({...command,...mutation}));
});
test('independent protected exit survives ordinary omission; null/delete/forgery cannot resume or alter history',()=>{
  const snapshot=JSON.stringify(chart);
  for(const incoming of [{note:'unrelated'},{liberatoria:{usciteLog:[]}},{liberatoria:{note:'unrelated'}}]){
    const saved=preserveTemporaryPsExits(chart,incoming);
    assert.equal(currentTemporaryPsExit(saved)?.decision,'pause');
    assert.deepEqual(saved.liberatoria.usciteLog,[entry]);
  }
  for(const incoming of [{liberatoria:null},{liberatoria:[]},{liberatoria:{temporaryPsExit:null}},{liberatoria:{usciteLog:[{...entry,note:'changed'}]}},{liberatoria:{usciteLog:[{id:'fake',psExit:entry.psExit}]}}])
    assert.throws(()=>preserveTemporaryPsExits(chart,incoming));
  assert.equal(JSON.stringify(chart),snapshot);
});
test('independent adapter conflict predicate retries only explicit PostgreSQL transaction conflicts',()=>{
  assert.equal(isConcurrentWriteConflict({code:'P2034'}),true);
  for(const code of ['40001','40P01']) assert.equal(isConcurrentWriteConflict({code:'P2010',meta:{driverAdapterError:{cause:{kind:'TransactionWriteConflict',originalCode:code}}}}),true);
  for(const error of [null,{}, {code:'40001'},{code:'P2010'}, {code:'P2010',meta:{driverAdapterError:{cause:{kind:'UniqueConstraintViolation',originalCode:'40001'}}}}, {code:'P2010',meta:{driverAdapterError:{cause:{kind:'TransactionWriteConflict',originalCode:'23505'}}}}])
    assert.equal(isConcurrentWriteConflict(error),false);
});
const complete={pa:'120/80',spo2:'98',o2:'no',fc:'70',fr:'16',temperatura:'36.5',coscienza:'A'};
const reading=(id:string,patient='qa_patient',values:any={temperatura:'37'})=>({id,patientId:patient,authorName:'Synthetic QA',measuredAt:'2026-10-17T08:00:00Z',values});
const response=(readings:any[],hasMore=false,nextCursor:string|null=null)=>new Response(JSON.stringify({readings,hasMore,nextCursor}),{status:200,headers:{'Content-Type':'application/json'}});
test('independent actual NEWS2 loader reaches an older complete observation beyond 25 partial pages',async()=>{
 let calls=0;
 const result=await loadNews2History('http://127.0.0.1:1','qa_patient',{headers:{},fetcher:async()=>{const i=calls++;return response([reading(`r${i}`,'qa_patient',i===25?complete:undefined)],i<25,i<25?`cursor${i}`:null);}});
 assert.equal(calls,26);assert.equal(result.readings.length,26);assert.equal(result.nextCursor,null);
});
test('independent actual NEWS2 loader rejects repeated cursor, duplicate observation, wrong patient and malformed completeness',async()=>{
 for(const pages of [
   [response([reading('one')],true,'same'),response([reading('two')],true,'same')],
   [response([reading('one')],true,'next'),response([reading('one')])],
   [response([reading('one','foreign')])],
   [response([],true,'next')],
   [response([reading('one')],false,'unexpected')]
 ]){let i=0;await assert.rejects(loadNews2History('http://127.0.0.1:1','qa_patient',{headers:{},fetcher:async()=>pages[i++]}));}
});
test('independent actual roster loader retains good patient score when another source fails',async()=>{
 const result=await loadRosterNews2('http://127.0.0.1:1',['qa_good','qa_failed'],{headers:{},fetcher:async(url:any)=>String(url).includes('qa_failed')?new Response('{}',{status:503}):response([reading('good','qa_good',complete)])});
 assert.deepEqual([...result.ids],['qa_good']);assert.deepEqual([...result.unknownIds],['qa_failed']);
});
const item=(id:string,count:any=0)=>({patient:{id},summaryPending:false,summaryDate:'2026-10-17',cartella:{readingCount:count}} as any);
test('independent actual next-patient loader skips unknown/completed pages and cancels on changed current selection',async()=>{
 let calls=0;const next=await nextParameterPatientAcrossPages([item('saved',1)],'saved','2026-10-17','p1',async()=>{calls++;return calls===1?{items:[item('unknown',null),item('done',2)],nextCursor:'p2'}:{items:[item('next',0)],nextCursor:null};},()=>true);
 assert.equal(next?.patient.id,'next');assert.equal(calls,2);
 let current=true;
 assert.equal(await nextParameterPatientAcrossPages([item('saved',1)],'saved','2026-10-17','p1',async()=>{current=false;return{items:[item('next')],nextCursor:null};},()=>current),null);
});
test('independent actual chart queue preserves verified PS snapshot across failed following save',async()=>{
 const queue=new CartellaWriteQueue<any>();const initial={note:'original'};const sent:any[]=[];
 const commandWrite=queue.enqueueMutation('actor:patient',initial,async()=>({...initial,...chart}));
 const failed=queue.enqueue('actor:patient',initial,{note:'failed'},async snapshot=>{sent.push(snapshot);return false;});
 const next=queue.enqueue('actor:patient',initial,{note:'success'},async snapshot=>{sent.push(snapshot);return snapshot;});
 await commandWrite;assert.equal(await failed,false);assert.equal(await next,true);
 assert.equal(sent[1].note,'success');assert.equal(currentTemporaryPsExit(sent[1])?.decision,'pause');
});
test('independent actual allergy acknowledgement changes with patient/product/context and permits explicit warning confirmation',()=>{
 const form:any={farmacoNome:'Synthetic medication',drugPackageRef:'qa_aic',pharmaceuticalForm:'compressa',commercialStrengthValue:'5',commercialStrengthUnit:'mg'};
 const context:any={phase:'ready',snapshot:{status:'documentate',items:[{allergene:'Synthetic allergen',gravita:'grave'}]}};
 const scope=prescriptionAllergyScope('qa_patient','qa_operator',form,context);
 assert.equal(prescriptionAllergyWarning(context),true);assert.equal(prescriptionAllergyAcknowledged(context,scope,scope),true);
 for(const different of [prescriptionAllergyScope('foreign','qa_operator',form,context),prescriptionAllergyScope('qa_patient','other',form,context),prescriptionAllergyScope('qa_patient','qa_operator',{...form,drugPackageRef:'other'},context),prescriptionAllergyScope('qa_patient','qa_operator',form,{...context,snapshot:{...context.snapshot,items:[]}})]) assert.equal(prescriptionAllergyAcknowledged(context,different,scope),false);
 assert.equal(prescriptionAllergyAcknowledged({phase:'loading'} as any,scope,scope),false);
});
test('independent emergency model excludes future/cross-patient triggers and refused/unconfirmed doses; duration stays civil across DST',()=>{
 const now=new Date('2026-10-25T02:30:00Z');const sources:any={patientId:'qa_patient',readings:[{...reading('foreign','foreign',complete),measuredAt:now.toISOString()}],diary:[{patientId:'qa_patient',priority:'urgente',entryDateTime:'2026-10-25T03:00:00Z',title:'future',content:'future'}],scheduled:[{id:'refused',patientId:'qa_patient',stato:'non_erogata',date:'2026-10-25'},{id:'foreign',patientId:'foreign',stato:'erogata',confirmedAt:'2026-10-25T01:00:00Z'}],prn:[]};
 const context=buildEmergencyContext('qa_patient',{pazienteId:'qa_patient'} as any,sources,now);
 assert.equal(context.reason,'');assert.equal(context.given.length,0);assert(context.vitals.every(v=>v.value===null));
 assert.equal(durationEnd('2026-10-24',7),'2026-10-30');assert.equal(durationEnd('2026-03-28',7),'2026-04-03');assert.equal(durationEnd('2026-02-30',7),'');
});
