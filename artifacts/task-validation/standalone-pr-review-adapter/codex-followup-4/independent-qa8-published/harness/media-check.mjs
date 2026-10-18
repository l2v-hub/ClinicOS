import {readFile,writeFile} from 'node:fs/promises';
import {validatePng,validateTrace} from '/workspace/clinicos-standalone-pr-review/agent-team/src/bug-pipeline/evidence.mjs';
const root='/workspace/.clinicos-cloud/492-continuation8-independent-qa-20261018';
const png=await readFile(root+'/controller-final.png'),trace=await readFile(root+'/trace.zip');validatePng(png);validateTrace(trace);await writeFile(root+'/media-validation.json',JSON.stringify({pngCRCAndDecode:'PASS',traceActionsAndCRC:'PASS',pngBytes:png.length,traceBytes:trace.length,tracePrivate:true},null,2)+'\n');console.log('PNG and trace decode/CRC PASS');
