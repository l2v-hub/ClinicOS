import {writeFileSync} from 'node:fs';
import {browser,makeContext,openChart,check,finish,out,outcomes,states,expect} from './qa-fixture.mjs';
const catalog=page=>page.locator('.assessment-catalog');
const back=async page=>{await page.getByRole('button',{name:'← Tutti i moduli',exact:true}).click();await expect(catalog(page)).toBeVisible();};
try {
  const ctx=await makeContext();await openChart(ctx);await ctx.page.getByRole('tab',{name:/^Moduli/}).click();
  await check('ten purposes and textual actions, empty not finalized',async()=>{
    await expect(catalog(ctx.page).locator('.assessment-catalog-purpose')).toHaveCount(10);
    await expect(catalog(ctx.page).getByRole('button',{name:/^Compila /})).toHaveCount(10);
    await expect(catalog(ctx.page).locator('.assessment-catalog-actions').getByRole('button',{name:/^Storico /})).toHaveCount(10);
    await expect(catalog(ctx.page).getByText('Nessuna compilazione',{exact:true})).toHaveCount(10);
    await ctx.page.screenshot({path:`${out}/screenshots/catalog-desktop.png`});
  });
  await check('native keyboard history lands on history, not implicit current or draft',async()=>{
    const button=catalog(ctx.page).getByRole('button',{name:'Storico PAINAD',exact:true});await button.focus();
    await ctx.page.keyboard.press('Tab');await ctx.page.keyboard.press('Shift+Tab');await expect(button).toBeFocused();
    expect(await button.evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');await ctx.page.keyboard.press('Enter');
    await expect(ctx.page.getByRole('heading',{name:'Storico valutazioni'})).toBeVisible();
    await expect(ctx.page.locator('.paper-form--focused')).toHaveCount(0);
    expect(ctx.state.requests.filter(r=>r.path.endsWith('/assessments/current'))).toEqual([]);await back(ctx.page);
  });
  for(const name of ['Tinetti','MNA®-SF','GDS-15','Indice di Barthel','UCLA · Sonno-veglia (NPI)','Trasferimenti posturali']) {
    await check(`explicit history ${name} skips current and does not create`,async()=>{
      const before=ctx.state.requests.filter(r=>r.path.endsWith('/assessments/current')).length;
      await catalog(ctx.page).getByRole('button',{name:`Storico ${name}`,exact:true}).click();
      await expect(ctx.page.getByRole('heading',{name:'Storico valutazioni'})).toBeVisible();
      expect(ctx.state.requests.filter(r=>r.path.endsWith('/assessments/current')).length).toBe(before);
      await expect(ctx.page.locator('.assessment-draft')).toHaveCount(0);await back(ctx.page);
    });
  }
  await check('Compila via Space then history preserves local PAINAD and resume focus',async()=>{
    const button=catalog(ctx.page).getByRole('button',{name:'Compila PAINAD',exact:true});await button.focus();await ctx.page.keyboard.press('Space');
    await expect(ctx.page.locator('.paper-form--focused')).toBeVisible();
    await ctx.page.locator('.paper-form--focused input[type=radio]').first().check();
    await back(ctx.page);
    await expect(catalog(ctx.page).getByRole('button',{name:'Riprendi bozza PAINAD',exact:true})).toBeVisible();
    await catalog(ctx.page).getByRole('button',{name:'Storico PAINAD',exact:true}).click();
    await expect(ctx.page.locator('.paper-form--focused')).toHaveCount(0);await back(ctx.page);
    await catalog(ctx.page).getByRole('button',{name:'Riprendi bozza PAINAD',exact:true}).click();
    await expect(ctx.page.locator('.paper-form--focused input[type=radio]').first()).toBeChecked();
    await ctx.page.screenshot({path:`${out}/screenshots/painad-resumed.png`});await back(ctx.page);
  });
  for(const name of ['Medicazioni','Contenzioni','Braden']) {
    await check(`legacy ${name} history hides form and resume retains values through refresh`,async()=>{
      await catalog(ctx.page).getByRole('button',{name:`Compila ${name}`,exact:true}).click();
      const form=ctx.page.locator('.cr-inline-form').filter({visible:true});await expect(form).toBeVisible();
      const date=form.locator('input[type=date]').first();await date.fill('2026-10-07');await back(ctx.page);
      await catalog(ctx.page).getByRole('button',{name:`Storico ${name}`,exact:true}).click();
      await expect(ctx.page.locator('.cr-inline-form').filter({visible:true})).toHaveCount(0);await back(ctx.page);
      await catalog(ctx.page).getByRole('button',{name:`Riprendi bozza ${name}`,exact:true}).click();
      await expect(ctx.page.locator('.cr-inline-form').filter({visible:true}).locator('input[type=date]').first()).toHaveValue('2026-10-07');
      await back(ctx.page);await ctx.page.reload();await openChart(ctx);await ctx.page.getByRole('tab',{name:/^Moduli/}).click();await expect(catalog(ctx.page)).toBeVisible();
      await catalog(ctx.page).getByRole('button',{name:`Storico ${name}`,exact:true}).click();
      await expect(ctx.page.locator('.cr-inline-form').filter({visible:true})).toHaveCount(0);await back(ctx.page);
      await catalog(ctx.page).getByRole('button',{name:`Riprendi bozza ${name}`,exact:true}).click();
      await expect(ctx.page.locator('.cr-inline-form').filter({visible:true}).locator('input[type=date]').first()).toHaveValue('2026-10-07');
      await back(ctx.page);
    });
  }
  await finish(ctx,'desktop');
  const mobile=await makeContext({mobile:true});await openChart(mobile);await mobile.page.getByRole('tab',{name:/^Moduli/}).click();
  await check('mobile visible purpose/text targets wrap without clipping',async()=>{
    await expect(catalog(mobile.page).locator('.assessment-catalog-purpose')).toHaveCount(10);
    const sizes=await catalog(mobile.page).locator('button').evaluateAll(elements=>elements.map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height,left:r.left,right:r.right};}));
    writeFileSync(`${out}/test-results/mobile-sizes.json`,JSON.stringify(sizes,null,2));
    await mobile.page.screenshot({path:`${out}/screenshots/catalog-mobile.png`,fullPage:true});
    expect(sizes.every(s=>s.w>=44&&s.h>=44&&s.left>=0&&s.right<=390)).toBe(true);
  });await finish(mobile,'mobile');
  writeFileSync(`${out}/test-results/results.json`,JSON.stringify({outcomes,requests:states.map(s=>s.requests),synthetic:true,productionWrites:0},null,2));
  writeFileSync(`${out}/playwright-report/index.html`,'<!doctype html><meta charset="utf-8"><h1>415 synthetic SPA catalog</h1><p>Guarded synthetic APIs; no real server persistence or physical device claim.</p><ul>'+outcomes.map(o=>`<li>${o.status}: ${o.name}</li>`).join('')+'</ul>');
} finally {await browser.close();}
