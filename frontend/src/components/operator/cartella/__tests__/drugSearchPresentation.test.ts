import assert from 'node:assert/strict';
import test from 'node:test';
import {documentoDi,type FarmacoTrovato} from '../farmacoDocumento';
import {filterPackages,packageForms,packageDocumentName,searchPresentationReducer,initialSearchPresentation} from '../drugSearchPresentation';
const product=(aic:string,extra:Partial<FarmacoTrovato>={}):FarmacoTrovato=>({aic,denominazione:'MEDICINALE QA',descrizione:'500 MG 20 COMPRESSE',forma:'Compressa',linkFi:null,linkRcp:'https://synthetic.invalid/rcp',...extra});

test('filters preserve original loaded order, exact records and original array without filters',()=>{
 const items=[product('000000001'),product('000000002',{descrizione:'1000 MG 10 COMPRESSE'}),product('000000003')];
 assert.strictEqual(filterPackages(items,{forma:'',confezione:''}),items);
 const found=filterPackages(items,{forma:'Compressa',confezione:'500 MG'});
 assert.deepEqual(found,[items[0],items[2]]);assert.strictEqual(found[0],items[0]);assert.strictEqual(found[1],items[2]);assert.equal(items.length,3);
});
test('form options derive from all loaded raw strings, not a filtered record list',()=>{
 const items=[product('1',{forma:'Sciroppo'}),product('2'),product('3'),product('4',{forma:null})];
 assert.deepEqual(packageForms(items),['Compressa','Sciroppo']);assert.deepEqual(items.map(f=>f.aic),['1','2','3','4']);
});
test('text filters only original denomination and description, never infer from ingredient quantities',()=>{
 const f=product('1',{descrizione:null,principiAttivi:[{nome:'Principio QA',quantita:99,unita:'mg'}]});
 assert.deepEqual(filterPackages([f],{forma:'',confezione:'99 mg'}),[]);
 assert.deepEqual(filterPackages([product('2')],{forma:'',confezione:'  500 mg  '}),[product('2')]);
 assert.equal(filterPackages([f],{forma:'',confezione:'medicinale qa'}).length,1);
});
test('each accessible document action includes exact full package data and AIC without changing document',()=>{
 const f=product('000000001',{descrizione:'500 MG 20 COMPRESSE',forma:'Compressa'}),doc=documentoDi(f)!;
 assert.equal(packageDocumentName(f,doc),'Apri RCP di MEDICINALE QA · 500 MG 20 COMPRESSE · Compressa · AIC 000000001');
 assert.equal(doc.href,f.linkRcp);assert.equal(f.descrizione,'500 MG 20 COMPRESSE');
 const other=product('000000002');assert.notEqual(packageDocumentName(other,documentoDi(other)!),packageDocumentName(f,doc));
});
test('FI fallback and missing metadata still name original product and exact AIC',()=>{
 const f=product('000000003',{descrizione:null,forma:null,linkRcp:null,linkFi:'https://synthetic.invalid/fi'});
 assert.equal(packageDocumentName(f,documentoDi(f)!),'Apri foglietto di MEDICINALE QA · AIC 000000003');
 assert.deepEqual(filterPackages([f],{forma:'Compressa',confezione:''}),[]);
});
test('query and criterion change atomically clear filters, clear alone preserves search',()=>{
 let state=initialSearchPresentation('Medicinale');state=searchPresentationReducer(state,{type:'filter',key:'forma',value:'Compressa'});
 const same=searchPresentationReducer(state,{type:'criterion',value:'nome'});assert.strictEqual(same,state);
 const query=searchPresentationReducer(state,{type:'query',value:'Nuova ricerca'});assert.deepEqual(query.filters,{forma:'',confezione:''});assert.equal(query.query,'Nuova ricerca');
 const criterion=searchPresentationReducer(state,{type:'criterion',value:'principio-attivo'});assert.deepEqual(criterion.filters,{forma:'',confezione:''});assert.equal(criterion.query,'Medicinale');
 const cleared=searchPresentationReducer(state,{type:'clear'});assert.equal(cleared.query,'Medicinale');assert.equal(cleared.criterion,'nome');assert.deepEqual(cleared.filters,{forma:'',confezione:''});
});
