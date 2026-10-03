import { chromium } from 'playwright';
import pg from 'pg';
const FRONT='http://127.0.0.1:5205';
const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();
const id=(await db.query(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P10-Miriam-Nanni'`)).rows[0].id;
const b=await chromium.launch();
for (const vp of [{width:1180,height:820},{width:820,height:1180}]) {
const p=await (await b.newContext({viewport:vp})).newPage();
await p.goto(FRONT);await p.getByRole('button',{name:/Infermiere 1/}).first().click();await p.waitForSelector('.teams-sidebar');
await p.goto(`${FRONT}/#/dettaglio-paziente/${id}/terapia-farmacologica`);await p.waitForTimeout(2500);
const tabs=p.locator('[id^="therapy-section"]');
console.log(vp.width,'subtabs',await tabs.count(), (await tabs.allInnerTexts()).join('|'));
await tabs.filter({hasText:/^Calendario/}).first().click();await p.waitForTimeout(2000);
console.log('after click hash',await p.evaluate(()=>location.hash),'cal',await p.getByTestId('ptc-event').count());
await p.reload();await p.getByRole('button',{name:/Infermiere 1/}).first().click().catch(()=>{});await p.waitForTimeout(4000);
console.log('after reload hash',await p.evaluate(()=>location.hash),'cal',await p.getByTestId('ptc-event').count());
await p.screenshot({path:`artifacts/task-validation/ux-direct-access-cycle/qa/e2e/probe-subview-${vp.width}.png`});
}
await b.close();await db.end();
