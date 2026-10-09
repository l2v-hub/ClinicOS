const source=require('./playwright.config.cjs');
module.exports={...source,outputDir:__dirname+'/final-browser/test-results',reporter:[['list'],['html',{outputFolder:__dirname+'/final-browser/playwright-report',open:'never'}]]};
