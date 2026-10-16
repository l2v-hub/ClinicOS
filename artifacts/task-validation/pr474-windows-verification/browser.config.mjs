import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {defineConfig}=require(process.env.PR474_PLAYWRIGHT||'playwright/test');
export default defineConfig({testDir:'.',testMatch:'browser.spec.mjs',workers:1,retries:0,outputDir:'browser-results',reporter:[['list'],['html',{outputFolder:'browser-report',open:'never'}]],use:{viewport:{width:1200,height:1000},trace:'on',video:'on'}});
