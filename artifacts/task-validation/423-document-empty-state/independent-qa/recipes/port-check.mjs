import net from 'node:net';
import {writeFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const out=process.argv[2],port=Number(process.env.QA_PORT||7531);assert.ok(out);assert.equal(existsSync(out),false);
const server=net.createServer();await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',ok);});await new Promise(ok=>server.close(ok));writeFileSync(out,JSON.stringify({port,at:new Date().toISOString(),free:true,closedProbe:true,applicationCommit:process.env.SOURCE_COMMIT},null,2));console.log('7531 exclusive serialized lane verified free');
