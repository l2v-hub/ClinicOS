import { writeFileSync } from 'node:fs';
import { browser,makeContext,openChart,check,out,outcomes,states,expect,patient,identity } from './qa-fixture.mjs';
import { facilityLocalMinute } from '../../../frontend/src/lib/facilityTime.ts';
const labels=['FR','SpO₂','O₂','PA sistolica','PA diastolica','FC','TC','Coscienza','DTX','Evacuazione','Note sulla rilevazione'];
const second={...patient,id:'QA-PATIENT-417-B',firstName:'Seconda',lastName:'Sintetica',medicalRecordNumber:'QA-417-B'};
const historicalValues={fr:'18',spo2:'98',o2:'no',pa:'120/80',fc:'72',temperatura:'36,5',coscienza:'A',dtx:'110'};
async function open(view,viewport={width:1150,height:1004}) {
  const ctx=await makeContext({viewport,mobile:viewport.width<600,extraCapabilities:['parameters.list_page','parameters.create_reading','parameters.save_reading']});
  ctx.state.saved=[];ctx.state.posts=[];ctx.state.failMode=null;
  const prior={id:'QA-PRIOR-417',requestId:'QA-PRIOR-417',patientId:patient.id,measuredAt:'2026-10-08T08:00:00.000Z',values:historicalValues,authorOperatorId:identity.id,authorName:identity.name,createdAt:'2026-10-08T08:00:00.000Z'};
  ctx.state.apiHandler=async(req,json)=>{
    const u=new URL(req.url()),p=u.pathname;
    if(p==='/patients/parameters/page')return (await json({items:[patient,second].map(person=>({patient:person,cartella:{pazienteId:person.id,readingCount:0,noteCount:0,lastReadingAt:null}})),hasMore:false,nextCursor:null}),true);
    if(/\/parameter-readings$/.test(p)) {
      const id=decodeURIComponent(p.split('/')[2]);
      if(req.method()==='GET') {await json(ctx.state.historyFail?{error:'Synthetic history unavailable'}:{readings:[...ctx.state.saved.filter(r=>r.patientId===id),...id===patient.id?[prior]:[]],hasMore:!!ctx.state.more,nextCursor:ctx.state.more?'synthetic-cursor':null},ctx.state.historyFail?503:200);return true;}
      if(req.method()==='POST') {
        const dto=req.postDataJSON();ctx.state.posts.push({patientId:id,...dto});
        if(ctx.state.failMode==='definite'){await json({error:'Rifiuto sintetico di validazione'},400);return true;}
        let r=ctx.state.saved.find(r=>r.requestId===dto.requestId);
        if(!r){r={...dto,id:`QA-SAVED-${ctx.state.saved.length}`,patientId:id,authorOperatorId:identity.id,authorName:identity.name,createdAt:dto.measuredAt};ctx.state.saved.push(r);}
        if(ctx.state.failMode==='lost'){ctx.state.failMode=null;await json({error:'Risposta sintetica persa dopo persistenza'},503);return true;}
        await json({reading:r,summary:{date:facilityLocalMinute(new Date(r.measuredAt)).slice(0,10),count:ctx.state.saved.filter(r=>r.patientId===id).length,noteCount:r.values.note?1:0,lastReadingAt:r.measuredAt}});return true;
      }
    }
    return false;
  };
  await openChart(ctx);
  if(view==='chart')await ctx.page.getByRole('tab',{name:/Parametri/}).click();
  else {if(await ctx.page.getByRole('button',{name:'Apri menu'}).isVisible())await ctx.page.getByRole('button',{name:'Apri menu'}).click();await ctx.page.locator('.teams-sidebar').getByRole('button',{name:'Parametri',exact:true}).click();}
  ctx.form=ctx.page.getByRole('form',{name:'Nuova rilevazione',exact:true});
  await expect(ctx.form).toBeVisible();
  await expect(ctx.form.getByText(/Prima: 18/)).toBeVisible();
  return ctx;
}
const field=(ctx,label)=>ctx.form.getByLabel(`Nuova rilevazione ${label}`,{exact:true});
const save=ctx=>ctx.form.getByRole('button',{name:'Salva rilevazione',exact:true});
async function finish(ctx,name) {
  for(const key of ['domainWrites','unexpected','external','pageErrors'])expect(ctx.state[key],key).toEqual([]);
  expect(ctx.state.httpErrors.every(e=>[400,503].includes(e.status)&&e.path.endsWith('/parameter-readings'))).toBe(true);
  expect(ctx.state.errors.filter(e=>!/Failed to load resource/.test(e))).toEqual([]);
  await ctx.context.tracing.stop({path:`${out}/${name}-trace.zip`});
  const video=ctx.page.video();await ctx.context.close();await video.saveAs(`${out}/video/${name}.webm`);await video.delete();
}
try {
  const doms=[];
  for(const view of ['chart','ward']) {
    const ctx=await open(view);
    await check(`${view}: shared schema, prior readings separate, native Tab and Enter choices`,async()=>{
      const actual=await ctx.form.locator('fieldset input,fieldset select,fieldset textarea').evaluateAll(els=>els.map(e=>({label:e.getAttribute('aria-label'),value:e.value,inputMode:e.inputMode,maxLength:e.maxLength,options:e.tagName==='SELECT'?[...e.options].map(o=>[o.value,o.text]):undefined})));
      expect(actual.map(e=>e.label)).toEqual(labels.map(l=>`Nuova rilevazione ${l}`));expect(actual.every(e=>e.value==='')).toBe(true);doms.push(actual);
      await field(ctx,'FR').focus();
      for(let i=0;i<labels.length;i++) {
        await expect(field(ctx,labels[i])).toBeFocused();
        if(i<labels.length-1)await ctx.page.keyboard.press('Tab');
      }
      await field(ctx,'SpO₂').press('Enter');await expect(field(ctx,'O₂')).toBeFocused();
      await field(ctx,'TC').press('Enter');await expect(field(ctx,'Coscienza')).toBeFocused();
      await field(ctx,'DTX').press('Enter');await expect(field(ctx,'Evacuazione')).toBeFocused();
      expect(ctx.state.posts).toHaveLength(0);
      await ctx.page.screenshot({path:`${out}/screenshots/${view}-blank-history.png`,fullPage:true});
    });
    await check(`${view}: identical invalid raw input, error linkage/focus, no POST`,async()=>{
      const cases=[['FR','0'],['FR','81'],['FR','2.4'],['SpO₂','101'],['FC','1O8'],['TC','37°5'],['DTX','>600'],['FC','1'.repeat(50)],['PA sistolica','120/80/70'],['PA sistolica','120']];
      for(const [label,value]of cases){
        for(const l of labels){const el=field(ctx,l);if(l==='O₂'||l==='Coscienza')await el.selectOption('');else await el.fill('');}
        await field(ctx,label).fill(value);await save(ctx).click();
        await expect(ctx.form.getByRole('alert')).toBeVisible();await expect(field(ctx,label)).toBeFocused();
        await expect(field(ctx,label)).toHaveAttribute('aria-invalid','true');
        const described=await field(ctx,label).getAttribute('aria-describedby');expect(described).toContain('error');
        expect(ctx.state.posts).toHaveLength(0);
        const kept=await field(ctx,label).inputValue();expect(kept).toBe(value.includes('/')?value.split('/')[0]:value);
      }
      for(const l of labels){if(['O₂','Coscienza'].includes(l))await field(ctx,l).selectOption('');else await field(ctx,l).fill('');}
      await save(ctx).click();await expect(ctx.form.getByRole('alert')).toHaveText(/Inserisci almeno/);await expect(field(ctx,'FR')).toBeFocused();
      await field(ctx,'Note sulla rilevazione').fill('Nota sintetica');await save(ctx).click();expect(ctx.state.posts).toHaveLength(0);
    });
    await check(`${view}: keypad appends/deletes at end, disables for choices, Next follows schema`,async()=>{
      await field(ctx,'TC').fill('36');await field(ctx,'TC').focus();await ctx.form.getByRole('button',{name:'Virgola',exact:true}).click();await ctx.form.getByRole('button',{name:'5',exact:true}).click();await expect(field(ctx,'TC')).toHaveValue('36,5');
      await ctx.form.getByRole('button',{name:'Cancella',exact:true}).click();await expect(field(ctx,'TC')).toHaveValue('36,');
      await field(ctx,'O₂').focus();await expect(ctx.form.getByRole('button',{name:'5',exact:true})).toBeDisabled();
      await ctx.form.getByRole('button',{name:'Campo successivo'}).click();await expect(field(ctx,'PA sistolica')).toBeFocused();
      await field(ctx,'PA sistolica').fill('120/80');await expect(field(ctx,'PA diastolica')).toBeFocused();await expect(field(ctx,'PA diastolica')).toHaveValue('80');
      await field(ctx,'FR').focus();await expect(ctx.form.getByRole('button',{name:'Virgola',exact:true})).toBeDisabled();
    });
    await check(`${view}: valid partial save, lost-response same-request retry, fixture persistence after reload`,async()=>{
      for(const l of labels){if(['O₂','Coscienza'].includes(l))await field(ctx,l).selectOption('');else await field(ctx,l).fill('');}
      await field(ctx,'TC').fill('37.5');ctx.state.failMode='lost';await save(ctx).click();
      await expect(ctx.form.getByRole('button',{name:'Riprova salvataggio'})).toBeVisible();await expect(field(ctx,'TC')).toBeDisabled();
      await ctx.form.getByRole('button',{name:'Riprova salvataggio'}).click();await expect(ctx.form.getByText(/Rilevazione salvata/)).toBeVisible();
      expect(ctx.state.posts).toHaveLength(2);expect(ctx.state.posts[0]).toEqual(ctx.state.posts[1]);expect(ctx.state.saved).toHaveLength(1);
      await expect(field(ctx,'TC')).toHaveValue('');await expect(ctx.form.getByText(/Prima: 37.5/)).toBeVisible();
      await ctx.page.reload();
      // Simulator sessions intentionally return to login on reload. Reauthenticate the same
      // synthetic actor; the fixture's durable reading collection is not reset.
      await openChart(ctx);
      if(view==='chart')await ctx.page.getByRole('tab',{name:/Parametri/}).click();
      else {if(await ctx.page.getByRole('button',{name:'Apri menu'}).isVisible())await ctx.page.getByRole('button',{name:'Apri menu'}).click();await ctx.page.locator('.teams-sidebar').getByRole('button',{name:'Parametri',exact:true}).click();}
      await expect(ctx.page.getByRole('form',{name:'Nuova rilevazione'}).getByText(/Prima: 37.5/)).toBeVisible();
    });
    await check(`${view}: definite rejection leaves values editable, next save new request`,async()=>{
      await field(ctx,'FR').fill('18');ctx.state.failMode='definite';await save(ctx).click();await expect(ctx.form.getByRole('alert')).toHaveText(/Rifiuto sintetico/);await expect(field(ctx,'FR')).toBeEnabled();
      const failed=ctx.state.posts.at(-1);ctx.state.failMode=null;await field(ctx,'FR').fill('20');await save(ctx).click();await expect(ctx.form.getByText(/Rilevazione salvata/)).toBeVisible();expect(ctx.state.posts.at(-1).requestId).not.toBe(failed.requestId);
    });
    await check(`${view}: complete NEWS2 uses all seven current values, same exact payload`,async()=>{
      const full=[['FR','18'],['SpO₂','98'],['PA sistolica','120/80'],['FC','72'],['TC','36,5'],['DTX','110']];
      for(const [label,value]of full)await field(ctx,label).fill(value);
      await field(ctx,'O₂').selectOption('no');await field(ctx,'Coscienza').selectOption('A');
      await expect(ctx.form.getByText('NEWS2 in tempo reale · 0',{exact:true})).toBeVisible();
      await ctx.page.screenshot({path:`${out}/screenshots/${view}-complete-news2.png`,fullPage:true});
      await save(ctx).click();await expect(ctx.form.getByText(/Rilevazione salvata/)).toBeVisible();expect(ctx.state.posts.at(-1).values).toEqual(historicalValues);
    });
    if(view==='ward')await check('ward: patient-keyed drafts survive switching without copying history or values',async()=>{
      await field(ctx,'FC').fill('73');
      await ctx.page.locator('.par-pick__main').filter({hasText:'Sintetica, Seconda'}).click();
      await expect(field(ctx,'FC')).toHaveValue('');await field(ctx,'FC').fill('83');
      await ctx.page.locator('.par-pick__main').filter({hasText:'Sintetica, Persona'}).click();
      await expect(field(ctx,'FC')).toHaveValue('73');
      await ctx.page.locator('.par-pick__main').filter({hasText:'Sintetica, Seconda'}).click();
      await expect(field(ctx,'FC')).toHaveValue('83');await save(ctx).click();
      await expect(ctx.form.getByText(/Rilevazione salvata/)).toBeVisible();expect(ctx.state.posts.at(-1).patientId).toBe(second.id);
    });
    await finish(ctx,view);
  }
  await check('both surfaces have byte-equivalent field labels/options/input modes/length policy',async()=>expect(doms[0]).toEqual(doms[1]));
  for(const [name,viewport]of [['tablet',{width:768,height:1024}],['mobile',{width:390,height:844}]])for(const view of ['chart','ward']) {
    const ctx=await open(view,viewport);
    await check(`${view}-${name}: field fit and full keyboard reachability`,async()=>{
      const rects=await ctx.form.locator('input,select,textarea').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,right:r.right,width:r.width,scroll:e.scrollWidth,client:e.clientWidth};}));
      expect(rects.every(r=>r.x>=0&&r.right<=viewport.width&&r.width>0)).toBe(true);
      await field(ctx,'FR').focus();for(const l of labels){await expect(field(ctx,l)).toBeFocused();await ctx.page.keyboard.press('Tab');}
      await ctx.page.screenshot({path:`${out}/screenshots/${view}-${name}.png`,fullPage:true});
    });await finish(ctx,`${view}-${name}`);
  }
}catch(error){writeFileSync(`${out}/failure.txt`,error.stack);throw error;}
finally{writeFileSync(`${out}/browser-results.json`,JSON.stringify({outcomes,states},null,2));await browser.close();}
