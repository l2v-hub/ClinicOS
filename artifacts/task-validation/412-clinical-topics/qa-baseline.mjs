import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
let helper = readFileSync('artifacts/task-validation/412-clinical-topics/qa-browser.mjs','utf8');
helper = helper.slice(0,helper.indexOf('try {\n  const ctx=await makeContext();'));
assert.ok(helper.includes('async function openChart'));
const currentAssertion = "  await expect(topic(ctx.page,'DIAGNOSIS').getByText('Diagnosi corrente sintetica',{exact:true})).toBeVisible();";
assert.ok(helper.includes(currentAssertion));
helper = helper.replace(currentAssertion,"  await expect(ctx.page.getByText('Diagnosi corrente sintetica',{exact:true})).toBeVisible();");
helper += `
try {
  const ctx=await makeContext();await openChart(ctx);
  await check('Accepted8b baseline reproduces duplicate current/source topics and expanded empty narrative cards',async()=>{
    for(const key of ['DIAGNOSIS','ALLERGIES','ANAMNESIS']) await expect(ctx.page.getByTestId('narr-'+key)).toBeVisible();
    await expect(ctx.page.getByText('Storia corrente sintetica',{exact:true})).toBeVisible();
    await expect(ctx.page.getByTestId('narr-HOSPITAL_COURSE').locator('[hidden]')).toHaveCount(0);
    await expect(ctx.page.locator('.narrative-section')).toHaveCount(10);
    await ctx.page.screenshot({path:out+'/screenshots/before-accepted8b-duplicate-topics.png',fullPage:true});
    await ctx.page.getByTestId('narr-ALLERGIES').scrollIntoViewIfNeeded();
    await expect(ctx.page.getByTestId('narr-ALLERGIES')).toBeInViewport();
    await ctx.page.screenshot({path:out+'/screenshots/before-accepted8b-separate-source-topics.png'});
    await ctx.page.getByTestId('narr-HOSPITAL_COURSE').scrollIntoViewIfNeeded();
    await expect(ctx.page.getByTestId('narr-HOSPITAL_COURSE')).toBeInViewport();
    await ctx.page.screenshot({path:out+'/screenshots/before-accepted8b-expanded-empty-sources.png'});
  });await finish(ctx,'before-accepted8b');
  writeFileSync(out+'/test-results/browser-results.json',JSON.stringify({applicationCommit:'8b327ca55ab5d8d4c5e0c19afcb828c017eeb3df',outcomes,states,scope:'Baseline synthetic UI reproduction, not original audit patient evidence'},null,2));
}finally{for(const ctx of contexts)await ctx.close().catch(()=>{});await browser.close();}
`;
await import('data:text/javascript;base64,'+Buffer.from(helper).toString('base64'));
