import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {defineConfig}=require(process.env.PR474_PLAYWRIGHT||'playwright/test');
const out=process.env.PR474_BROWSER_OUT||path.join(import.meta.dirname,'browser');
export default defineConfig({testDir:'.',testMatch:'browser.spec.mjs',workers:1,retries:0,outputDir:path.join(out,'test-results'),reporter:[['list'],['html',{outputFolder:path.join(out,'playwright-report'),open:'never'}]],use:{viewport:{width:1200,height:900},trace:'on',video:'on'}});
