const {createRequire}=require('node:module');
const {defineConfig}=createRequire('C:/w-insulin-qa/package.json')('playwright/test');
const path=require('node:path');const run=process.env.QA_RUN||'run01';
module.exports=defineConfig({testDir:__dirname,testMatch:'independent.spec.cjs',timeout:90000,expect:{timeout:10000},fullyParallel:false,workers:1,retries:0,outputDir:path.join(__dirname,run,'test-results'),reporter:[['list'],['html',{outputFolder:path.join(__dirname,run,'playwright-report'),open:'never'}],['json',{outputFile:path.join(__dirname,run,'raw-results.json')}]],use:{baseURL:'http://127.0.0.1:7480',headless:true,viewport:{width:1150,height:1004},trace:'on',video:'on',screenshot:'on'}});
