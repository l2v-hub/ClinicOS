import {test,expect} from 'playwright/test';
test('new opt-in before bug classification is queued, external ownership preserved, no payload exposed, reload stable',async({page,request})=>{
 const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`)});
 await page.goto('http://127.0.0.1:4398');
 const issue=n=>page.locator('#issues tr').filter({has:page.getByRole('link',{name:`#${n}`,exact:true})});
 await expect(page.locator('#queued')).toHaveText('1');await expect(page.locator('#processing')).toHaveText('0');
 await expect(issue(801)).toBeVisible();await expect(issue(801).locator('td').nth(1)).toHaveText('In coda');await expect(issue(801).locator('td').nth(2)).toHaveText('Raccolta issue per accorpamento');
 await expect(issue(802).locator('td').nth(1)).toHaveText('Gestita da altro flusso');await expect(issue(802).locator('td').nth(2)).toHaveText('Verifica QA esterna');
 const payload=await(await request.get('http://127.0.0.1:4398/api/status')).text();expect(payload).not.toContain('PRIVATE_SYNTHETIC');expect(await page.locator('body').innerText()).not.toContain('PRIVATE_SYNTHETIC');
 await page.reload();await expect(page.locator('#queued')).toHaveText('1');await expect(issue(801).locator('td').nth(1)).toHaveText('In coda');await expect(issue(802).locator('td').nth(1)).toHaveText('Gestita da altro flusso');
 await page.getByRole('button',{name:'Aggiorna',exact:true}).click();await expect(page.locator('#queued')).toHaveText('1');expect(errors).toEqual([]);await expect(page.locator('#error')).toBeHidden();
 await page.screenshot({path:'artifacts/task-validation/label-intake-recovery/independent-qa/result.png',fullPage:true});
});
