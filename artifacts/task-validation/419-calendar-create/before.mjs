import {browser,setup,openAgenda,finish,expect,out,report} from './fixture.mjs';
try{
 const ctx=await setup({time:'2026-10-09T23:09:00+02:00'});try{await openAgenda(ctx);
 await expect(ctx.page.getByRole('button',{name:'Nuovo appuntamento',exact:true})).toBeDisabled();
 await ctx.page.screenshot({path:`${out}/screenshots/before-disabled.png`});
 await ctx.page.getByRole('button',{name:'Crea appuntamento alle 08:00',exact:true}).click();
 await expect(ctx.page.getByRole('dialog',{name:'Nuovo Appuntamento'})).toBeVisible();
 await ctx.page.screenshot({path:`${out}/screenshots/before-slot-opens.png`});
 await finish(ctx,'before');report([{name:'baseline inconsistency reproduced',status:'PASS'}]);
 }catch(e){try{await finish(ctx,'before-failed');}catch{}throw e;}
}finally{await browser.close();}
