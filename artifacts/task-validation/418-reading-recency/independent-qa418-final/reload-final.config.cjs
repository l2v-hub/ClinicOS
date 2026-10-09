const source=require('./playwright.config.cjs');
module.exports={...source,grep:/after reload/,outputDir:__dirname+'/reload-final/test-results',reporter:[['list'],['html',{outputFolder:__dirname+'/reload-final/playwright-report',open:'never'}]]};
