import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ratingContributions,profileValue,recentRatings,playerDomains} from '../lib/player-analytics.ts';
import {aggregate} from '../lib/engine.ts';
import type {Match,Player} from '../lib/model.ts';
import type {Summary} from '../lib/engine.ts';
test('rating contributions retain the peak bonus and turnover penalty',()=>{
 const result=ratingContributions({goals:4,passesCompleted:20,turnovers:2},[{goals:2,passesCompleted:10},{goals:2,passesCompleted:10},{goals:2,passesCompleted:10}])!;
 assert.equal(result.rating,9.9);assert.equal(result.penalty,-.12);
 assert.deepEqual(result.values.map(v=>v.value),[2,2]);
});
test('negative families keep their actual weighted contributions',()=>{
 const result=ratingContributions({goals:0,passesCompleted:5},[{goals:2,passesCompleted:10},{goals:2,passesCompleted:10},{goals:2,passesCompleted:10}],{finition:3,passes:1})!;
 assert.deepEqual(result.values.map(v=>v.value),[-3,-.5]);assert.equal(result.rating,3);
 assert.equal(result.correction,.5);
});
test('unknown advanced measurements and a missing previous period stay unknown',()=>{
 const s={stats:{},form:[{participant:{stats:{rating:7}}}],appearances:1} as unknown as Summary;
 assert.equal(profileValue(s,'lineBreakingPasses'),null);assert.equal(profileValue(s,'ratingStd'),null);
 assert.deepEqual(recentRatings(s),{current:7,previous:null,delta:null});
 assert.equal(ratingContributions({goals:2},[{goals:1},{goals:1}]),null);
});

test('the profile radar uses observed first-match statistics, including progression from dribbles',()=>{
 const players=['a','b','c'].map(id=>({id,name:id,demo:false} as Player));
 const match:Match={seasonId:'s',number:1,duration:60,location:'',mvpId:null,level:1,video:'',trackedKeys:[],version:1,id:'m',date:'2026-10-04',status:'finished',scoreA:2,scoreB:1,participants:players.map((p,i)=>({playerId:p.id,team:i===2?'B':'A',stats:{goals:i,assists:i,passesAttempted:10,passesCompleted:6+i,dribblesAttempted:5,dribblesCompleted:2+i,interceptions:i,duelsAttempted:4,duelsWon:i}})),events:[]};
 const population=aggregate(players,[match]);
 const domains=playerDomains(population[0],population,1,[match]);
 assert.ok(domains.every(d=>d.value!=null));
 assert.equal(domains.find(d=>d.name==='Progression')!.axis,'Percussion');
 assert.equal(profileValue(population[0],'forwardCarries'),null);
 const empty={...match,participants:match.participants.map(p=>({...p,stats:{}}))};
 const unknown=aggregate(players,[empty]);
 assert.ok(playerDomains(unknown[0],unknown,1,[empty]).slice(0,6).every(d=>d.value==null));
 assert.ok(playerDomains(population[0],population.slice(0,2),1,[match]).slice(0,6).every(d=>d.value==null));
});
