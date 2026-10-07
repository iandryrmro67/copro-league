import test from 'node:test';
import assert from 'node:assert/strict';
import {rateMatches} from '../lib/performance.ts';
import type {Match,Stats} from '../lib/model.ts';
import {automaticRatingV2,ratingStats} from '../lib/rating-v2.ts';
import {settingsSchema} from '../lib/validation.ts';
import {defaultSettings} from '../lib/model.ts';

const game=(stats:Stats[]):Match=>({id:'rating-test',seasonId:'s',number:1,date:'',duration:60,location:'',status:'finished',scoreA:5,scoreB:2,mvpId:null,level:1,video:'',version:0,trackedKeys:[],events:[],participants:stats.map((stats,i)=>({playerId:'p'+i,team:i%2?'B':'A',stats}))});
const notes=(stats:Stats[])=>rateMatches([game(stats)])[0].participants;

// These regressions catch history-wide references, role filtering, raw-volume
// scoring, duplicate creation credit, and overwriting observed/missing data.
test('adding or correcting another match cannot change an existing V2 rating',()=>{
 const m=game([{goals:3,assists:1},{goals:1,assists:2},{goals:0,assists:0}]);
 const other={...game([{goals:100,assists:100},{goals:100,assists:100},{goals:100,assists:100}]),id:'other',seasonId:'other-season'};
 assert.deepEqual(rateMatches([m])[0].participants,rateMatches([m,other])[0].participants);
});
test('same actions receive the same rating regardless of role and winning side',()=>{
 const m=game([{goals:2,assists:1},{goals:2,assists:1},{goals:2,assists:1}]);
 m.participants[1].role='goalkeeper';m.participants[2].role='mixed';
 const p=rateMatches([m])[0].participants;
 assert.equal(p[0].auto_rating,p[1].auto_rating);assert.equal(p[1].auto_rating,p[2].auto_rating);
});
test('equal goals reward efficient finishing over wasteful shooting',()=>{
 const p=notes([{goals:3,shots:5,shotsOnTarget:4},{goals:3,shots:17,shotsOnTarget:6},{goals:1,shots:8,shotsOnTarget:3}]);
 assert.ok(p[0].auto_rating!>p[1].auto_rating!);
});
test('efficient dribbling and duels can beat a larger unsuccessful volume',()=>{
 for(const [won,attempt] of [['dribblesCompleted','dribblesAttempted'],['duelsWon','duelsAttempted']]){
  const p=notes([{[won]:7,[attempt]:9},{[won]:8,[attempt]:20},{[won]:4,[attempt]:10}]);
  assert.ok(p[0].auto_rating!>p[1].auto_rating!,won);
 }
});
test('one successful attempt does not produce an exceptional rating',()=>{
 const p=notes([{dribblesCompleted:1,dribblesAttempted:1},{dribblesCompleted:7,dribblesAttempted:8},{dribblesCompleted:5,dribblesAttempted:10}]);
 assert.ok(p[0].auto_rating!<8);assert.ok(p[0].auto_rating!<p[1].auto_rating!);
});
test('key passes and chances created are not two rewards for the same opportunities',()=>{
 const a=[{assists:1,keyPasses:5},{assists:1,keyPasses:2},{assists:0,keyPasses:1}];
 const b=a.map(s=>({...s,chancesCreated:s.keyPasses}));
 assert.deepEqual(notes(a).map(p=>p.auto_rating),notes(b).map(p=>p.auto_rating));
});
test('secondary assists count but less than direct assists',()=>{
 const p=notes([{assists:2,secondaryAssists:0},{assists:0,secondaryAssists:2},{assists:0,secondaryAssists:0}]);
 assert.ok(p[0].auto_rating!>p[1].auto_rating!);assert.ok(p[1].auto_rating!>p[2].auto_rating!);
});
test('unknown categories stay unknown and do not penalize a historical rating',()=>{
 const a=[{goals:2,assists:1},{goals:1,assists:1},{goals:0,assists:0}];
 assert.deepEqual(notes(a).map(p=>p.auto_rating),notes(a.map(s=>({...s,dribblesCompleted:null,tackles:null}))).map(p=>p.auto_rating));
 const p=notes(a)[0];assert.match(p.ratingExplanation!.join(' '),/partielle/i);
 assert.equal(p.stats.dribblesCompleted,undefined);
});
test('many saves remain a small contribution with rotating goalkeepers',()=>{
 const base={goals:1,assists:1,passesCompleted:20,passesAttempted:25};
 const p=notes([{...base,saves:50},{...base,saves:0},{...base,saves:0}]);
 assert.ok(p[0].auto_rating!-p[1].auto_rating!<=0.7);
});
test('empty and zero-minute performances have no automatic note',()=>{
 const m=game([{}, {}, {}]);assert.ok(rateMatches([m])[0].participants.every(p=>p.auto_rating===null));
 m.participants=m.participants.map(p=>({...p,minutesPlayed:0,stats:{goals:1}}));
 assert.ok(rateMatches([m])[0].participants.every(p=>p.auto_rating===null));
});
test('recalculation is idempotent, preserves raw stats and manual overrides',()=>{
 const m=game([{goals:3,assists:1},{goals:1,assists:1},{goals:0,assists:0}]);m.participants[0].admin_rating=8.4;
 const before=structuredClone(m);const result=rateMatches([m]);
 assert.deepEqual(m,before);assert.deepEqual(rateMatches(result),result);
 assert.equal(result[0].participants[0].final_rating,8.4);
});
test('a single excellent family cannot hide a weak all-round performance',()=>{
 const p=notes([
  {goals:0,assists:0,passesCompleted:5,passesAttempted:20,dribblesCompleted:1,dribblesAttempted:10,duelsWon:1,duelsAttempted:10,tackles:30,saves:0},
  {goals:2,assists:2,passesCompleted:20,passesAttempted:25,dribblesCompleted:5,dribblesAttempted:8,duelsWon:7,duelsAttempted:10,tackles:5,saves:0},
  {goals:1,assists:1,passesCompleted:15,passesAttempted:20,dribblesCompleted:3,dribblesAttempted:8,duelsWon:5,duelsAttempted:10,tackles:5,saves:0},
 ]);
 assert.ok(p[0].auto_rating!<p[1].auto_rating!);assert.ok(p[0].auto_rating!<8);
});
test('the seven domains use canonical weights before missing-data renormalization',()=>{
 const s={goals:1,shots:5,assists:1,passesCompleted:20,passesAttempted:25,dribblesCompleted:3,dribblesAttempted:5,tackles:3,duelsWon:3,duelsAttempted:5,saves:2};
 const p=notes([s,s,s])[0];
 assert.equal(p.auto_rating,6);assert.equal(p.ratingCoverage,100);
 assert.deepEqual(Object.fromEntries(Object.entries(p.ratingDomains!).map(([k,d])=>[k,d.weight])),{finition:20,creation:20,passes:15,progression:15,defense:15,duels:10,arrets:5});
});
test('defensive actions do not get an extra recovery reward for the same event',()=>{
 const m=game([{interceptions:2,recoveries:2},{interceptions:1,recoveries:1},{interceptions:0,recoveries:0}]);
 m.events=[0,1].map(i=>({id:'i'+i,playerId:'p0',team:'A',type:'INTERCEPTION',timestamp:i,relatedPlayerId:null,metadata:{schemaVersion:2}}));
 m.trackedKeys=['interceptions','recoveries'];
 const before=structuredClone(m);
 assert.equal(ratingStats(m)[0].recoveries,0);assert.equal(ratingStats(m)[1].recoveries,1);
 assert.deepEqual(m,before);
});
test('partial creation observations do not turn missing peer assists into zeroes',()=>{
 const s={assists:1,secondaryAssists:1};
 const result=automaticRatingV2(s,[s,{assists:2},{secondaryAssists:2},{assists:3,secondaryAssists:3}]);
 assert.equal(result.value,null);assert.deepEqual(result.domains,{});
});
test('disabled domains produce no note and retired metrics cannot influence it',()=>{
 const stats=[{goals:1,assists:1},{goals:1,assists:1},{goals:1,assists:1}];
 assert.equal(automaticRatingV2(stats[0],stats,{finition:0,creation:0}).value,null);
 const modified=stats.map(s=>({...s,goalsConceded:100,redCards:10,cleanSheets:10}));
 assert.deepEqual(notes(stats).map(p=>p.auto_rating),notes(modified).map(p=>p.auto_rating));
});
test('settings support rollback and reject invalid weights or engine versions',()=>{
 assert.equal(settingsSchema.parse({...defaultSettings,ratingEngine:'v1'}).ratingEngine,'v1');
 assert.equal(settingsSchema.safeParse({...defaultSettings,ratingEngine:'v3'}).success,false);
 assert.equal(settingsSchema.safeParse({...defaultSettings,ratingWeights:{arrets:1,progression:1,percussion:1}}).success,true);
 for(const ratingWeights of [{arrets:Infinity},{arrets:-1},{unknown:1}])assert.equal(settingsSchema.safeParse({...defaultSettings,ratingWeights}).success,false);
});
test('extreme values stay finite and bounded, scheduled matches have no note',()=>{
 const m=game([{goals:100000,assists:100000,turnovers:100000},{goals:0,assists:0},{goals:0,assists:0}]);
 for(const p of rateMatches([m])[0].participants){assert.ok(Number.isFinite(p.auto_rating));assert.ok(p.auto_rating!>=3&&p.auto_rating!<=10)}
 assert.ok(rateMatches([{...m,status:'scheduled'}])[0].participants.every(p=>p.auto_rating===null));
});

test('adding a successful fifth pass cannot lower the rating at the sample threshold',()=>{
 const low=notes([{passesCompleted:4,passesAttempted:4},{passesCompleted:1,passesAttempted:1},{passesCompleted:1,passesAttempted:1}])[0];
 const high=notes([{passesCompleted:5,passesAttempted:5},{passesCompleted:1,passesAttempted:1},{passesCompleted:1,passesAttempted:1}])[0];
 assert.ok(high.auto_rating!>=low.auto_rating!);
});
test('a single successful dribble cannot stand out as exceptional against observed zeroes',()=>{
 const p=notes([{dribblesCompleted:1,dribblesAttempted:1},...Array.from({length:9},()=>({dribblesCompleted:0,dribblesAttempted:0}))]);
 assert.ok(p[0].auto_rating!<8);
});

test('a video interception does not subtract an unproven manually counted recovery',()=>{
 const m=game([{interceptions:1,recoveries:4},{interceptions:0,recoveries:2},{interceptions:0,recoveries:1}]);
 m.trackedKeys=['interceptions'];
 m.events=[{id:'intercept',playerId:'p0',team:'A',type:'INTERCEPTION',timestamp:1,relatedPlayerId:null,metadata:{schemaVersion:2}}];
 assert.equal(ratingStats(m)[0].recoveries,4);
});
