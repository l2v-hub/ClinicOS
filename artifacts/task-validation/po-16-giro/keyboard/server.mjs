import express from 'express';
import {resolve} from 'node:path';
const app=express(),folder=resolve('artifacts/task-validation/po-16-giro/keyboard');
app.use('/baseline',express.static(resolve(folder,'baseline')));
app.use('/candidate',express.static(resolve(folder,'candidate')));
const server=app.listen(4197,'127.0.0.1',()=>console.log('Keyboard fixture http://127.0.0.1:4197/baseline/'));
app.post('/close',(_req,res)=>{res.json({closed:true});server.closeAllConnections();server.close()});
