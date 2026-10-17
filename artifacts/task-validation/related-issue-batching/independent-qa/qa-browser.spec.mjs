import {test,expect} from 'playwright/test';
test('actual dashboard shows collected issues, grouped plan and persistent values after reload',async({page,request})=>{
 const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`)});
 await page.goto('http://127.0.0.1:4398');
 const issue=n=>page.locator('#issues tr').filter({has:page.getByRole('link',{name:`#${n}`,exact:true})});
 await expect(page.locator('#queued')).toHaveText('2');await expect(page.locator('#processing')).toHaveText('0');
 for(const n of [701,702]){await expect(issue(n)).toBeVisible();await expect(issue(n).locator('td').nth(2)).toHaveText('Raccolta issue per accorpamento');await expect(issue(n).locator('td').nth(1)).toHaveText('In coda');}
 await expect(issue(703).locator('td').nth(1)).toHaveText('Gestita da altro flusso');
 await page.screenshot({path:'artifacts/task-validation/related-issue-batching/independent-qa/collection.png',fullPage:true});
 await page.reload();await expect(page.locator('#queued')).toHaveText('2');await expect(issue(701).locator('td').nth(2)).toHaveText('Raccolta issue per accorpamento');
 const response=await request.post('http://127.0.0.1:4397/group');expect(response.status()).toBe(204);
 await page.getByRole('button',{name:'Aggiorna',exact:true}).click();
 await expect(page.locator('#queued')).toHaveText('0');await expect(page.locator('#processing')).toHaveText('2');
 for(const n of [701,702]){await expect(issue(n).locator('td').nth(2)).toHaveText('Analisi e piano pronti');await expect(issue(n).locator('td').nth(3)).toHaveText('bug-batch-701');await expect(issue(n).locator('td').nth(4)).toHaveText('0/4');await expect(issue(n).locator('td').nth(5)).toHaveText('0/4');}
 await page.reload();await expect(page.locator('#processing')).toHaveText('2');await expect(issue(702).locator('td').nth(3)).toHaveText('bug-batch-701');
 const payload=await(await request.get('http://127.0.0.1:4398/api/status')).text();expect(payload).not.toContain('SYNTHETIC_PRIVATE');expect(await page.locator('body').innerText()).not.toContain('SYNTHETIC_PRIVATE');expect(errors).toEqual([]);await expect(page.locator('#error')).toBeHidden();
 await page.screenshot({path:'artifacts/task-validation/related-issue-batching/independent-qa/result.png',fullPage:true});
});
