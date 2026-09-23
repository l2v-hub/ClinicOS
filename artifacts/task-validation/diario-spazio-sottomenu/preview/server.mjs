import express from 'express';
import {resolve} from 'node:path';
const app=express();app.use(express.static(resolve('artifacts/task-validation/diario-spazio-sottomenu/preview/build')));
const server=app.listen(4198,'127.0.0.1',()=>console.log('Diary preview http://127.0.0.1:4198'));
app.post('/close',(_req,res)=>{res.json({closed:true});server.closeAllConnections();server.close()});
