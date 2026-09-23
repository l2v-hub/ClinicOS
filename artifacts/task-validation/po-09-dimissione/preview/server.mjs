import express from 'express';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=process.cwd(),folder=resolve('artifacts/task-validation/po-09-dimissione/preview');
process.env.VITE_API_URL='http://127.0.0.1:4190/api';
const app=express();
app.use('/api',(req,res)=>{
 if(req.method!=='GET') return res.status(405).json({error:'Read-only synthetic fixture'});
 if(req.path.endsWith('/intake-review')) return res.json({draftId:null,deferredTherapies:[],sourceDocumentIds:[]});
 if(req.path.endsWith('/documents')) return res.json({items:[],total:0,pageInfo:{hasMore:false,nextCursor:null}});
 res.json([]);
});
const vite=await createServer({root,configFile:false,envFile:false,plugins:[react()],cacheDir:resolve(folder,'cache'),server:{middlewareMode:true,hmr:false,fs:{allow:[root]}},appType:'custom'});
app.use(vite.middlewares);
app.get('/',async(_req,res)=>res.type('html').send(await vite.transformIndexHtml('/',await readFile(resolve(folder,'index.html'),'utf8'))));
const server=app.listen(4190,'127.0.0.1',()=>console.log('PO09 synthetic preview http://127.0.0.1:4190'));
app.post('/fixture/close',(_req,res)=>{res.json({closing:true});server.closeAllConnections();server.close();void vite.close().then(()=>process.exit(0));});
