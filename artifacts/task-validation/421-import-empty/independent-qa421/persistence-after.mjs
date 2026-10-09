import {writeFileSync} from 'node:fs';
import {browser,setup,openImport,finish,expect,out,newJob,report,memoryKey} from './persistence-fixture.mjs';
const results=[];let ctx;
try{
 ctx=await setup({session:newJob()});await openImport(ctx);
 const w=ctx.page.getByTestId('import-documents-workspace'),chooser=ctx.page.waitForEvent('filechooser');
 await w.getByRole('button',{name:'Carica documento',exact:true}).click();
 await (await chooser).setFiles({name:'synthetic-persisted-identity.png',mimeType:'image/png',buffer:ctx.syntheticPng});
 await expect(w.locator('.import-page')).toHaveCount(1);
 await w.getByLabel('Nome lettera').fill('Lettera persistente QA');
 await w.getByRole('button',{name:'Rinomina',exact:true}).click();
 await expect(w.getByRole('tab',{name:'Lettera persistente QA · 1 pagine',exact:true})).toBeVisible();
 const saved=structuredClone(ctx.state.session.manifest),sessionId=ctx.state.session.id;
 const memory=()=>ctx.page.evaluate(key=>localStorage.getItem(key),memoryKey);
 expect(await memory()).toBe(sessionId);
 await ctx.page.getByRole('button',{name:'Chiudi e riprendi la sessione',exact:true}).last().click();
 expect(await memory(),'MUST survive close BEFORE any reload/init-script').toBe(sessionId);
 const getCount=ctx.state.requests.filter(r=>r.method==='GET'&&r.path.endsWith('/'+sessionId)).length;
 await ctx.page.reload();
 expect(await memory(),'MUST survive reload without reseeding').toBe(sessionId);
 await openImport(ctx);
 await expect(w.getByRole('tab',{name:'Lettera persistente QA · 1 pagine',exact:true})).toBeVisible();
 await expect(w.locator('.import-page')).toHaveCount(1);
 await expect(w.locator('.import-page').first()).toContainText('synthetic-persisted-identity.png · originale p. 1');
 await expect(w.getByRole('heading',{name:'Aggiungi la lettera di dimissione'})).toHaveCount(0);
 expect(ctx.state.session.manifest).toEqual(saved);
 expect(ctx.state.requests.filter(r=>r.method==='GET'&&r.path.endsWith('/'+sessionId)).length).toBeGreaterThan(getCount);
 expect(await memory()).toBe(sessionId);
 await ctx.page.screenshot({path:out+'/screenshots/strong-close-reload-identity.png'});
 writeFileSync(out+'/test-results/identity-receipt.json',JSON.stringify({sessionId,savedManifest:saved,closedMemoryRetainedBeforeReload:true,reloadSeedSuppressed:true,reloadGetsIncreased:true,simulationOnly:true},null,2));
 await finish(ctx,'strong-close-reload-identity');results.push({name:'strong-close-reload-identity',status:'PASS'});
}catch(e){results.push({name:'strong-close-reload-identity',status:'FAIL',error:String(e)});if(ctx){writeFileSync(out+'/test-results/failed-guard.json',JSON.stringify(ctx.state,null,2));await ctx.page.screenshot({path:out+'/screenshots/persistence-failure.png'}).catch(()=>{});await ctx.context.tracing.stop({path:out+'/trace/persistence-failure.zip'}).catch(()=>{});await ctx.context.close().catch(()=>{});}throw e;}
finally{report(results);await browser.close();}

