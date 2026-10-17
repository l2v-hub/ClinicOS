import { createDashboardServer } from '../../../../agent-team/src/bug-pipeline/dashboard-server.mjs';
import { dashboardSnapshot } from '../../../../agent-team/src/bug-pipeline/dashboard.mjs';
if (process.env.CLINICOS_LABEL_INTAKE_QA !== '1') throw new Error('QA-only adapter requires explicit opt-in');
const repo='l2v-hub/ClinicOS';
const queue=[
 {number:801,labels:[{name:'codex-run'}],title:'PRIVATE_SYNTHETIC_TITLE',body:'PRIVATE_SYNTHETIC_BODY',comments:[{body:'PRIVATE_SYNTHETIC_COMMENT'}]},
 {number:802,labels:[{name:'codex-run'},{name:'ready-for-qa'}],body:'PRIVATE_SYNTHETIC_EXTERNAL'},
];
const dashboard=createDashboardServer({refreshMs:0,load:async()=>dashboardSnapshot({repo,state:{schemaVersion:1,repository:repo,batches:[],triageQueue:{issues:[801],openedAt:1000,changedAt:2000}},issues:[],queue,setup:{merged:true}})});
await new Promise(resolve=>dashboard.listen(4398,'127.0.0.1',resolve));
