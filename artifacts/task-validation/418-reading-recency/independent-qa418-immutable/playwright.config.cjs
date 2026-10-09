const {createRequire}=require('node:module');
const {defineConfig}=createRequire('C:/w-insulin-qa/package.json')('playwright/test');
module.exports=defineConfig({testDir:__dirname,testMatch:'independent.spec.cjs',testIgnore:'**/pre-run/**',timeout:60000,workers:1,retries:0,outputDir:__dirname+'/fresh21b/test-results',reporter:[['list'],['json',{outputFile:__dirname+'/fresh21b/results.json'}],['html',{outputFolder:__dirname+'/fresh21b/playwright-report',open:'never'}]],use:{baseURL:'http://127.0.0.1:7483',trace:'on',video:'on',screenshot:'on'}});
