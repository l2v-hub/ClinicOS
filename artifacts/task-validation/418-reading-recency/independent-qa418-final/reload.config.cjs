const source=require('./playwright.config.cjs');
module.exports={...source,grep:/after reload/,outputDir:__dirname+'/reload/test-results',reporter:[['list'],['html',{outputFolder:__dirname+'/reload/playwright-report',open:'never'}]]};
