const source=require('./playwright.config.cjs');
module.exports={...source,outputDir:__dirname+'/complete/test-results',reporter:[['list'],['html',{outputFolder:__dirname+'/complete/playwright-report',open:'never'}]]};
