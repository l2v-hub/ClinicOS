const source=require('./playwright.config.cjs');
module.exports={...source,grep:/after reload/,outputDir:__dirname+'/reload-correct/test-results',reporter:[['list'],['html',{outputFolder:__dirname+'/reload-correct/playwright-report',open:'never'}]]};
