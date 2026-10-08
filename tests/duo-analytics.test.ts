import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pairedProduction,linkedAssists} from '../lib/duo-analytics.ts';
import type {Match} from '../lib/model.ts';
const game=(id:string,a:number|null,b:number|null):Match=>({id,seasonId:'s',number:1,date:'2026-10-01',duration:60,status:'finished',location:'',scoreA:2,scoreB:1,mvpId:null,level:1,video:'',version:1,trackedKeys:[],events:[],participants:[{playerId:'a',team:'A',stats:{goals:a}},{playerId:'b',team:'A',stats:{goals:b}}]});
test('duo production excludes unpaired observations from both total and denominator',()=>{
 assert.deepEqual(pairedProduction([game('1',2,1),game('2',4,null),game('3',0,0)],'a','b','goals'),{count:2,a:2,b:1,total:3,average:1.5});
 assert.deepEqual(pairedProduction([game('1',null,2)],'a','b','goals'),{count:0,a:null,b:null,total:null,average:null});
 const opponent=game('1',2,1);opponent.participants[1].team='B';assert.equal(pairedProduction([opponent],'a','b','goals').count,0);
});
test('missing assist annotations stay unknown, while observed links allow a real zero',()=>{
 const m=game('1',2,1);assert.equal(linkedAssists([m],'a','b'),null);
 m.events=[{id:'g',type:'GOAL',playerId:'b',relatedPlayerId:'a',team:'A',timestamp:10,metadata:{}}];
 assert.equal(linkedAssists([m],'a','b'),1);assert.equal(linkedAssists([m],'b','a'),0);
 assert.equal(linkedAssists([m],'a','b',true),null);m.trackedKeys=['secondaryAssists'];assert.equal(linkedAssists([m],'a','b',true),0);
});
