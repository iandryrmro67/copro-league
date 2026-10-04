import test from 'node:test';
import assert from 'node:assert/strict';
import {bootProgress, snapIndex, unlockedIds, createSingleFlight, magneticOffset} from '../lib/animation-state.ts';
test('boot cannot complete before the real league request', () => {
  assert.equal(bootProgress({fonts:false,image:false,data:false}),0);
  assert.equal(bootProgress({fonts:true,image:true,data:false}),40);
  assert.equal(bootProgress({fonts:true,image:true,data:true}),100);
});
test('magnetism stops outside the button vicinity and is bounded at the edge',()=>{
  assert.deepEqual(magneticOffset(111,0,100,40),{x:0,y:0});
  assert.deepEqual(magneticOffset(110,0,100,40),{x:6,y:0});
  assert.deepEqual(magneticOffset(0,0,100,40),{x:0,y:0});
  const diagonal=magneticOffset(70,50,100,40);
  assert.ok(Math.abs(diagonal.x)<=6&&Math.abs(diagonal.y)<=6);
});
test('carousel momentum snaps without escaping the roster', () => {
  assert.equal(snapIndex(0,800,0,300,4),0);
  assert.equal(snapIndex(3,-800,0,300,4),3);
  assert.equal(snapIndex(1,-190,0,300,4),2);
  assert.equal(snapIndex(0,-30,-1300,300,4),1);
  assert.equal(snapIndex(3,0,0,300,1),0);
  assert.equal(snapIndex(0,-200,0,300,0),0);
});
test('unlock only celebrates a known inactive badge becoming active once', () => {
  const active=[{id:'a',active:true}];
  assert.deepEqual(unlockedIds(null,active,new Set()),[]);
  assert.deepEqual(unlockedIds([],active,new Set()),[]);
  assert.deepEqual(unlockedIds(active,active,new Set()),[]);
  assert.deepEqual(unlockedIds([{id:'a',active:false}],active,new Set(['a'])),[]);
  assert.deepEqual(unlockedIds([{id:'a',active:false}],active,new Set()),['a']);
});
test('simultaneous page loads share one real request and a failed request can retry', async () => {
  let count=0; let finish:(n:number)=>void=()=>{};
  const load=createSingleFlight(()=>{count++;return new Promise<number>(resolve=>{finish=resolve});});
  const a=load(),b=load(); assert.equal(count,1);finish(7);
  assert.deepEqual(await Promise.all([a,b]),[7,7]);
  let calls=0;const retry=createSingleFlight(async()=>{if(++calls===1)throw Error('offline');return 8;});
  await assert.rejects(retry(),/offline/);assert.equal(await retry(),8);
});
