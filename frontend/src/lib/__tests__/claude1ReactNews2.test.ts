import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRosterNews2, loadNews2History, NEWS2_CONCURRENCY, NEWS2_MAX_PAGES } from '../news2History';

const full = { fr: '16', spo2: '97', o2: 'no', pa: '130/80', fc: '72', coscienza: 'A', temperatura: '36,8' };
function page(input: string | URL | Request, complete = false) {
  const url = new URL(String(input));
  const patientId = decodeURIComponent(url.pathname.split('/')[2]);
  const index = Number(url.searchParams.get('cursor') ?? 0);
  return {readings:[{id:`${patientId}-${index}`,patientId,measuredAt:new Date(Date.parse('2026-10-21T12:00:00Z') - index * 60000).toISOString(),authorName:'Synthetic', values: complete ? full : {fc:'70'}}],hasMore:true,nextCursor:String(index+1)};
}

test('sixty patients share a global four-request limit and at most three pages each; a prefix is unknown', async () => {
  let active=0, peak=0, requests=0;
  const fetcher: typeof fetch = async (input) => {
    requests++; active++; peak=Math.max(peak,active);
    await new Promise<void>(resolve => setTimeout(resolve, 1));
    active--;
    return Response.json(page(input));
  };
  const ids=Array.from({length:60},(_,i)=>`p${i}`);
  const [roster, simultaneousChip]=await Promise.all([
    loadRosterNews2('https://api.test',ids,{headers:{},fetcher}),
    loadNews2History('https://api.test','visible',{headers:{},fetcher}),
  ]);
  assert.equal(peak,NEWS2_CONCURRENCY);
  assert.equal(requests,61*NEWS2_MAX_PAGES);
  assert.deepEqual([...roster.unknownIds].sort(),ids.sort());
  assert.equal(roster.ids.size,0);
  assert.equal(simultaneousChip.verificationIncomplete,true);
  assert.equal(simultaneousChip.nextCursor,'3');
});

test('an exhausted automatic budget retains provenance for one-page explicit continuation', async () => {
  const fetcher: typeof fetch = async(input)=>Response.json(page(input));
  const initial=await loadNews2History('https://api.test','p1',{headers:{},fetcher});
  const more=await loadNews2History('https://api.test','p1',{headers:{},fetcher},initial);
  assert.equal(initial.readings.length,3);
  assert.equal(more.readings.length,4);
  assert.equal(more.nextCursor,'4');
  assert.equal(more.verificationIncomplete,true);
  assert.deepEqual(more.visitedCursors,['','1','2','3']);
});

test('roster and the LazyNews2 chip loader reuse pending and completed reads only within one session/API epoch',async()=>{
  const {setCurrentOperator}=await import('../operatorSession');
  const {invalidateNews2History}=await import('../news2History');
  let requests=0;
  let release: (()=>void)|undefined;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const fetcher:typeof fetch=async(input)=>{
    requests++;
    await gate;
    return Response.json({...page(input,true),hasMore:false,nextCursor:null});
  };
  try {
    setCurrentOperator({id:'synthetic-op',role:'infermiere'});
    const roster=loadRosterNews2('https://facility-a.test',['p1'],{headers:{},fetcher});
    const chip=loadNews2History('https://facility-a.test','p1',{headers:{},fetcher});
    release!();
    await Promise.all([roster,chip]);
    assert.equal(requests,1,'pending roster request reused by the chip');
    const copy=await loadNews2History('https://facility-a.test','p1',{headers:{},fetcher});
    copy.readings.length=0;
    assert.equal((await loadNews2History('https://facility-a.test','p1',{headers:{},fetcher})).readings.length,1);
    assert.equal(requests,1,'completed result reused');
    await loadNews2History('https://facility-b.test','p1',{headers:{},fetcher});
    assert.equal(requests,2,'facility/API changes cannot reuse data');
    invalidateNews2History('p1');
    await loadNews2History('https://facility-a.test','p1',{headers:{},fetcher});
    assert.equal(requests,3,'parameter save invalidates');
    setCurrentOperator(null);
    setCurrentOperator({id:'synthetic-op',role:'infermiere'});
    await loadNews2History('https://facility-a.test','p1',{headers:{},fetcher});
    assert.equal(requests,4,'same identity after logout/login gets a fresh epoch');
  } finally {setCurrentOperator(null);invalidateNews2History();}
});

test('a pending previous-session response is rejected and cannot seed the next session',async()=>{
  const {setCurrentOperator}=await import('../operatorSession');
  const {invalidateNews2History}=await import('../news2History');
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  let requests=0;
  const fetcher:typeof fetch=async(input)=>{
    requests++;
    if(requests===1) await gate;
    return Response.json({...page(input,true),hasMore:false,nextCursor:null});
  };
  try {
    setCurrentOperator({id:'op1',role:'infermiere'});
    const pending=loadNews2History('https://api.test','p1',{headers:{},fetcher});
    const oldOutcome=assert.rejects(pending,{name:'AbortError'});
    setCurrentOperator(null);
    setCurrentOperator({id:'op2',role:'medico'});
    await loadNews2History('https://api.test','p1',{headers:{},fetcher});
    release();
    await oldOutcome;
    await loadNews2History('https://api.test','p1',{headers:{},fetcher});
    assert.equal(requests,2);
  } finally {release();setCurrentOperator(null);invalidateNews2History();}
});

test('one aborted subscriber does not cancel a shared read needed by another visible row',async()=>{
  const {setCurrentOperator}=await import('../operatorSession');
  const {invalidateNews2History}=await import('../news2History');
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  let requests=0;
  const fetcher:typeof fetch=async(input)=>{requests++;await gate;return Response.json({...page(input,true),hasMore:false,nextCursor:null});};
  try {
    setCurrentOperator({id:'op',role:'infermiere'});
    const controller=new AbortController();
    const first=loadNews2History('https://api.test','p1',{headers:{},fetcher,signal:controller.signal});
    const rejected=assert.rejects(first,{name:'AbortError'});
    const second=loadNews2History('https://api.test','p1',{headers:{},fetcher});
    controller.abort();release();
    await rejected;
    assert.equal((await second).readings.length,1);
    assert.equal(requests,1);
  } finally {release();setCurrentOperator(null);invalidateNews2History();}
});

test('shared history cache expires after fifteen seconds and retains at most 128 entries',async()=>{
  const {setCurrentOperator}=await import('../operatorSession');
  const {invalidateNews2History,NEWS2_CACHE_TTL_MS,NEWS2_CACHE_MAX_ENTRIES}=await import('../news2History');
  const originalNow=Date.now;
  let now=originalNow(),requests=0;
  const fetcher:typeof fetch=async(input)=>{requests++;return Response.json({...page(input,true),hasMore:false,nextCursor:null});};
  try {
    Date.now=()=>now;
    setCurrentOperator({id:'op',role:'infermiere'});
    await loadNews2History('https://api.test','p0',{headers:{},fetcher});
    await loadNews2History('https://api.test','p0',{headers:{},fetcher});
    assert.equal(requests,1);
    now+=NEWS2_CACHE_TTL_MS+1;
    await loadNews2History('https://api.test','p0',{headers:{},fetcher});
    assert.equal(requests,2);
    for(let i=1;i<=NEWS2_CACHE_MAX_ENTRIES;i++) await loadNews2History('https://api.test',`p${i}`,{headers:{},fetcher});
    const before=requests;
    await loadNews2History('https://api.test','p0',{headers:{},fetcher});
    assert.equal(requests,before+1,'oldest entry is evicted');
  } finally {Date.now=originalNow;setCurrentOperator(null);invalidateNews2History();}
});

test('a roster started in an old session stops its worker queue on session switch',async()=>{
  const {setCurrentOperator}=await import('../operatorSession');
  const {invalidateNews2History}=await import('../news2History');
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  let requests=0;
  const fetcher:typeof fetch=async(input)=>{requests++;await gate;return Response.json({...page(input,true),hasMore:false,nextCursor:null});};
  try {
    setCurrentOperator({id:'op1',role:'infermiere'});
    const roster=loadRosterNews2('https://api.test',Array.from({length:60},(_,i)=>`p${i}`),{headers:{},fetcher});
    const rejected=assert.rejects(roster,{name:'AbortError'});
    setCurrentOperator(null);setCurrentOperator({id:'op2',role:'medico'});
    release();await rejected;
    assert.equal(requests,4,'remaining 56 patients cannot start with the previous session headers');
  } finally {release();setCurrentOperator(null);invalidateNews2History();}
});

test('oversized history pages are unknown rather than bypassing the small-page budget',async()=>{
  const fetcher:typeof fetch=async(input)=>{
    const response=page(input);
    return Response.json({...response,readings:Array.from({length:51},(_,i)=>({...response.readings[0],id:`r${i}`}))});
  };
  const roster=await loadRosterNews2('https://api.test',['p1'],{headers:{},fetcher});
  assert.deepEqual([...roster.unknownIds],['p1']);
  assert.equal(roster.ids.size,0);
});

test('a parameter invalidation rejects a pending old read without evicting its replacement',async()=>{
  const {setCurrentOperator}=await import('../operatorSession');
  const {invalidateNews2History}=await import('../news2History');
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  let requests=0;
  const fetcher:typeof fetch=async(input)=>{
    requests++;if(requests===1)await gate;
    return Response.json({...page(input,true),hasMore:false,nextCursor:null});
  };
  try {
    setCurrentOperator({id:'op1',role:'infermiere'});
    const old=loadNews2History('https://api.test','p1',{headers:{},fetcher});
    const rejected=assert.rejects(old,{name:'AbortError'});
    invalidateNews2History('p1');
    await loadNews2History('https://api.test','p1',{headers:{},fetcher});
    release();await rejected;
    await loadNews2History('https://api.test','p1',{headers:{},fetcher});
    assert.equal(requests,2);
  } finally {release();setCurrentOperator(null);invalidateNews2History();}
});
