import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { therapySourceInventory, sameTherapySource } from '../../../backend/src/intake/therapy-source-inventory.ts';
import { pageTherapyRows, refreshedPageData } from '../../../backend/src/ai/upload/pages/draft-source.ts';
import { validateDraftTherapySelection } from '../../../backend/src/intake/therapy-selection.ts';
import { dischargeRowToTherapyForm } from '../../../frontend/src/components/shared/intake/dischargeTherapy.ts';
import type { DischargeTherapyRow } from '../../../frontend/src/components/shared/intake/dischargeTherapy.ts';
process.env.DATABASE_URL='postgresql://unit:unit@127.0.0.1:1/unit_no_db';
let guard: typeof import('../../../backend/src/ai/upload/pages/draft-mutations.ts').guardPageRows;
before(async()=>{guard=(await import('../../../backend/src/ai/upload/pages/draft-mutations.ts')).guardPageRows;});
const item={nome:'Synthetic Omega',dose:'5 mg',frequenza:'08:00'};
const group=(items:unknown[],id='g1',inputHash='h1')=>({groupId:id,inputHash,_full:{cartella:{farmaci:items}},_narrative:{therapyText:''}});
const result=(items:unknown[])=>({_groups:[group(items)],_conflicts:[],_review:{decisions:[]},_source:{manifestRevision:1,resultHash:'result'}});
test('unknown nested metadata and non-object meaningful values remain distinct immutable evidence',()=>{
 const input=[{...item,extra:{dose:'5 mg'}},{...item,extra:{dose:'10 mg'}},false,0,['unknown'],{note:'<img src=x onerror=syntheticOnly=1>'}];
 const rows=therapySourceInventory('',input);
 assert.equal(rows.length,input.length); assert.equal(new Set(rows.map(r=>r.importRowKey)).size,input.length);
 assert.deepEqual(rows.map(r=>r.structuredSource),input);
 (input[0] as any).extra.dose='edited'; assert.equal((rows[0].structuredSource as any).extra.dose,'5 mg');
});
test('every candidate stays clinically blank even when extraction contains complete apparent regimen',()=>{
 const row=therapySourceInventory('',[{...item,stato:'attivo',dataInizio:'2026-01-01',via:'orale',quantita:'1 compressa',tipo:'periodica'}])[0];
 const form=dischargeRowToTherapyForm(row as unknown as DischargeTherapyRow);
 for(const key of ['stato','dataInizio','viaSomministrazione','pharmaceuticalForm','commercialStrengthValue']) assert.equal(form[key as keyof typeof form],'');
 assert.deepEqual(form.schedules,[]); assert.equal(row.stato,'da_verificare');
});
test('reordered duplicate occurrences cannot collapse on refresh or editable names',()=>{
 const first=result([item,item,{...item,dose:'10 mg'}]); const rows=pageTherapyRows(first);
 const next=result([{...item,dose:'10 mg'},item,item]);
 assert.deepEqual(pageTherapyRows(next).map(r=>r.importRowKey).sort(),rows.map(r=>r.importRowKey).sort());
 const saved={terapiaImport:rows.map(r=>({...r,farmacoNome:'Edited manually'})),_importSource:{groupHashes:{g1:'h1'}}};
 assert.deepEqual(refreshedPageData(saved,next)._importProposals,[]);
 assert.equal(new Set(rows.map(r=>r.importRowKey)).size,3);
});
test('selection from different source group cannot authorize identical structured candidate',()=>{
 const source:any=result([item]); source._groups.push(group([{...item,dose:'10 mg'}],'g2','h2'));
 source._conflicts=[{id:'c',field:'cartella.farmaci',candidates:[{id:'one',value:item,sources:[{groupId:'g1'}]},{id:'two',value:{...item,dose:'10 mg'},sources:[{groupId:'g2'}]}]}];
 source._review={decisions:[{conflictId:'c',action:'select',candidateId:'two'}]};
 const rows=pageTherapyRows(source); assert.equal(rows[0].conflictDeferred,true); assert.equal(rows[0].excludedFromConfirm,true); assert.equal(rows[1].conflictDeferred,undefined);
});
test('legacy appended rows cannot forge extraction keys and page rows cannot be swapped',()=>{
 const rows=therapySourceInventory('',[item,{...item,dose:'10 mg'}]);
 assert.throws(()=>guard({terapiaImport:rows,_importSource:{}},{terapiaImport:[rows[1],rows[0]]},undefined),{code:'immutable_source'});
 assert.throws(()=>guard({terapiaImport:[]},{terapiaImport:[rows[0]]},undefined),{code:'immutable_source'});
 assert.throws(()=>guard({terapiaImport:rows},{terapiaImport:rows.map(r=>({...r,structuredSource:undefined}))},undefined),{code:'immutable_source'});
});
test('structured candidate cannot forge verbatim narrative evidence via autosave',()=>{
 const rows=therapySourceInventory('',[item]);
 for(const source of [{terapiaImport:rows,_importSource:{}},{terapiaImport:rows}])
  assert.throws(()=>guard(source,{terapiaImport:[{...rows[0],originalText:'Forged synthetic document instruction'}]},undefined),{code:'immutable_source'});
});
test('unreviewed, missing, deferred and outdated candidates cannot be confirmed',()=>{
 const row=therapySourceInventory('',[item])[0];
 assert.throws(()=>validateDraftTherapySelection({terapiaImport:[row]},[]),/manca dalla conferma/);
 for(const patch of [{},{excludedFromConfirm:true},{sourceOutdated:true,stato:'ok'},{conflictDeferred:true,stato:'ok'}])
   assert.throws(()=>validateDraftTherapySelection({terapiaImport:[{...row,...patch}]},[{intakeSource:{type:'import',index:0}} as any]));
});
test('multiple narrative duplicates and extraction occurrences are all retained without clinical synthesis',()=>{
 const text='Omega 5 mg 1 cpr ore 08:00\nOmega 5 mg 1 cpr ore 08:00';
 const rows=therapySourceInventory(text,[{nome:'Omega',dose:'5 mg'},{nome:'Omega',dose:'5 mg'}]);
 assert.equal(rows.length,4); assert.equal(new Set(rows.map(r=>r.importRowKey)).size,4);
 assert.equal(rows.filter(r=>r.sourceKind==='structured').length,2);
 assert.equal(sameTherapySource(rows[2],rows[3]),false);
});
test('missing source revalidation resets state but never destroys reviewed or excluded values',()=>{
 const rows=pageTherapyRows(result([item])); const reviewed={note:'Manual synthetic correction'};
 const next=refreshedPageData({terapiaImport:[{...rows[0],stato:'ok',excludedFromConfirm:true,reviewedTherapy:reviewed}],_importSource:{groupHashes:{g1:'h1'}}},result([]));
 const old=(next.terapiaImport as any[])[0]; assert.equal(old.sourceOutdated,true); assert.equal(old.stato,'da_verificare'); assert.deepEqual(old.reviewedTherapy,reviewed); assert.equal(old.excludedFromConfirm,true);
});
test('pending proposal refresh updates immutable provenance without resurrecting a deferred decision',()=>{
 const initial=pageTherapyRows(result([item]));
 const existing={terapiaImport:initial,_importSource:{groupHashes:{g1:'h1'}}};
 const added={...item,dose:'10 mg'};
 const fresh:any=result([item,added]);fresh._groups[0].inputHash='h2';
 const first=refreshedPageData(existing,fresh);const prior=(first._importProposals as any[])[0];
 prior.status='deferred';
 const newer:any=result([item,added]);newer._groups[0].inputHash='h3';
 const next=refreshedPageData(first,newer);const proposal=(next._importProposals as any[])[0];
 assert.equal(proposal.id,prior.id);assert.equal(proposal.status,'deferred');assert.equal(proposal.inputHash,'h3');
 assert.deepEqual(proposal.row.importSource,{groupId:'g1',inputHash:'h3'});assert.deepEqual(proposal.row.structuredSource,added);
});
