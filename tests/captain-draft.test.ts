import test from 'node:test';
import assert from 'node:assert/strict';
import { CAPTAIN_PICK_SECONDS, captainDraftReducer, emptyCaptainDraft, type CaptainDraftState } from '../lib/captain-draft.ts';
const playerIds = ['a','b','c','d','e','f'];
const start = () => captainDraftReducer(emptyCaptainDraft,{type:'start',captainA:'a',captainB:'b',playerIds,now:1000});
const tick = (state:CaptainDraftState, now:number, random=0) => captainDraftReducer(state,{type:'tick',playerIds,now,random,turn:state.turn,deadline:state.deadline!});
test('captain gets 60 seconds and a manual choice restarts the clock for the other captain',()=>{
 const state=start();assert.equal(CAPTAIN_PICK_SECONDS,60);assert.equal(state.deadline,61000);
 const next=captainDraftReducer(state,{type:'pick',playerId:'c',playerIds,now:11000,turn:0,deadline:61000});
 assert.equal(next.teams.c,'A');assert.equal(next.turn,1);assert.equal(next.deadline,71000);assert.equal(next.automaticPlayerId,null);
 const other=captainDraftReducer(next,{type:'pick',playerId:'d',playerIds,now:12000,turn:1,deadline:71000});assert.equal(other.teams.d,'B');
});
test('expiry chooses only an available player and never duplicates a captain or a previous pick',()=>{
 const before=tick(start(),60999);assert.equal(before.turn,0);
 const after=tick(before,61000,.99);assert.equal(after.teams.f,'A');assert.equal(after.automaticPlayerId,'f');assert.equal(after.turn,1);assert.equal(after.deadline,121000);
 const next=tick(after,121000,0);assert.equal(next.teams.c,'B');assert.equal(next.teams.a,'A');assert.equal(next.teams.b,'B');
});
test('late background ticks consume a single turn and give the next captain a full minute',()=>{
 const state=tick(start(),200000);assert.equal(state.turn,1);assert.equal(state.deadline,260000);
});
test('stale ticks and double clicks cannot take a following turn',()=>{
 const state=start();const next=captainDraftReducer(state,{type:'pick',playerId:'c',playerIds,now:11000,turn:0,deadline:61000});
 assert.strictEqual(captainDraftReducer(next,{type:'tick',playerIds,now:61000,random:0,turn:0,deadline:61000}),next);
 assert.strictEqual(captainDraftReducer(next,{type:'pick',playerId:'d',playerIds,now:11000,turn:0,deadline:61000}),next);
 assert.strictEqual(captainDraftReducer(state,{type:'pick',playerId:'c',playerIds,now:61000,turn:0,deadline:61000}),state);
 assert.strictEqual(captainDraftReducer(state,{type:'pick',playerId:'outside',playerIds,now:1001,turn:0,deadline:61000}),state);
});
test('automatic picks finish two equal teams, stop the timer and reset cleanly',()=>{
 let state=start();for(let i=0;i<4;i++)state=tick(state,state.deadline!,.5);
 assert.equal(Object.keys(state.teams).length,6);assert.equal(Object.values(state.teams).filter(s=>s==='A').length,3);assert.equal(Object.values(state.teams).filter(s=>s==='B').length,3);assert.equal(state.deadline,null);
 assert.deepEqual(captainDraftReducer(state,{type:'reset'}),emptyCaptainDraft);
 assert.equal(captainDraftReducer(emptyCaptainDraft,{type:'start',captainA:'a',captainB:'b',playerIds:['a','b'],now:1000}).deadline,null);
});
