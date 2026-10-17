import http from 'node:http';
import { createDashboardServer } from '../../../../agent-team/src/bug-pipeline/dashboard-server.mjs';
import { dashboardSnapshot } from '../../../../agent-team/src/bug-pipeline/dashboard.mjs';
import { repo, blank, batchFor } from './qa-fixtures.mjs';
if(process.env.CLINICOS_BATCHING_QA !== '1') throw new Error('QA-only adapter requires explicit flag');
let stage = 'collection';
const issues = [701,702,703].map(number => ({number,title:'SYNTHETIC_PRIVATE_TITLE',body:'SYNTHETIC_PRIVATE_BODY',comments:[{body:'SYNTHETIC_PRIVATE_COMMENT'}],labels:number===703?['ready-for-qa']:['bug','codex-run']}));
const dashboard = createDashboardServer({refreshMs:0,load:async()=>dashboardSnapshot({repo,state:stage==='collection'?{...blank(),triageQueue:{issues:[701,702],openedAt:1000,changedAt:2000}}:{...blank(),batches:[batchFor([701,702])]},issues,queue:[701,702],setup:{merged:true}})});
const controls = http.createServer((req,res)=>{
  if(req.method!=='POST'||req.url!=='/group'){res.writeHead(404).end();return;}
  stage='grouped';res.writeHead(204).end();
});
await new Promise(resolve=>dashboard.listen(4398,'127.0.0.1',resolve));
await new Promise(resolve=>controls.listen(4397,'127.0.0.1',resolve));
