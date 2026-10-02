import test from 'node:test';
import assert from 'node:assert/strict';
import {projectEvents} from '../lib/events.ts';
import {matchSchema} from '../lib/validation.ts';
import type {Match,MatchEvent} from '../lib/model.ts';
const action=(id:string,type:string,actor='a',outcome='COMPLETED',mate:string|null=null,t=10,extra:Record<string,unknown>={}):MatchEvent=>({id,type,playerId:actor,team:actor==='c'?'B':'A',timestamp:t,relatedPlayerId:mate,metadata:{schemaVersion:2,sequenceId:'s',outcome,tags:[],...extra}});
const match=(events:MatchEvent[]):Match=>({id:'m',seasonId:'s',number:1,date:'',duration:60,location:'',status:'finished',scoreA:8,scoreB:6,mvpId:null,level:3,video:'',version:1,trackedKeys:[],participants:[{playerId:'a',team:'A',stats:{goals:8}},{playerId:'b',team:'A',stats:{goals:0}},{playerId:'c',team:'B',stats:{goals:6}}],events});
test('one annotated goal preserves the official 8–6 score',()=>{
 const result=projectEvents(match([action('g','SHOT','a','GOAL')]));
 assert.deepEqual([result.scoreA,result.scoreB],[8,6]);
});
test('draft observations do not replace manual totals or invent verified zeroes',()=>{
 const input={...match([action('g','SHOT','a','GOAL')]),analysis:{schemaVersion:1,status:'in_progress',mode:'highlights',completeKeys:[],ranges:[],session:{sequenceId:'s',videoTime:10,offset:0}}} as Match;
 const result=projectEvents(input);
 assert.equal(result.participants[0].stats.goals,8);
 assert.equal(result.participants[2].stats.goals,6);
 assert.equal(result.participants[1].stats.shots,undefined);
});
test('tagged assist plus unlinked goal credits one assist',()=>{
 const result=projectEvents(match([action('p','PASS','a','COMPLETED','b',10,{tags:['ASSIST']}),action('g','SHOT','b','GOAL','a',12)]));
 assert.equal(result.participants[0].stats.assists,1);
});
test('failed pass may have an unknown intended recipient',()=>{
 assert.equal(matchSchema.safeParse(match([action('p','PASS','a','FAILED')])).success,true);
});
test('a linked pass later than its shot is rejected',()=>{
 assert.equal(matchSchema.safeParse(match([action('p','PASS','a','COMPLETED','b',20),action('g','SHOT','b','GOAL','a',12,{linkedEventId:'p'})])).success,false);
});
export {action,match};

// These protect the boundary between observed actions and published league data.
test('publication requires full coverage and preserves unrelated manual categories',async()=>{
 const {beginAnalysis,publishAnalysis,reviewAnalysis}=await import('../lib/match-analysis.ts');
 const m=beginAnalysis({...match([action('g','SHOT','a','GOAL')]),scoreA:1,scoreB:0});
 m.analysis!.completeKeys=['goals'];
 assert.ok(reviewAnalysis(m).some(i=>i.code==='coverage'&&i.blocking));
 assert.throws(()=>publishAnalysis(m),/observ|couvert/i);
 m.analysis!.ranges=[{start:0,end:3600}];
 const published=publishAnalysis(m);
 assert.equal(published.participants[0].stats.goals,1);
 assert.equal(published.participants[2].stats.goals,0);
 assert.equal(published.participants[1].stats.shots,undefined);
 assert.equal(published.analysis!.publishedEvents!.length,1);
});
test('published goals must agree with official score',async()=>{
 const {beginAnalysis,publishAnalysis}=await import('../lib/match-analysis.ts');
 const m=beginAnalysis(match([action('g','SHOT','a','GOAL')]));
 m.analysis!.completeKeys=['goals'];m.analysis!.ranges=[{start:0,end:3600}];
 assert.throws(()=>publishAnalysis(m),/score/i);
});
test('guest sees last published events while admin edits a correction',async()=>{
 const {beginAnalysis,publishAnalysis,publicMatch}=await import('../lib/match-analysis.ts');
 let m=beginAnalysis({...match([action('g','SHOT','a','GOAL')]),scoreA:1,scoreB:0});
 m.analysis!.completeKeys=['goals'];m.analysis!.ranges=[{start:0,end:3600}];m=publishAnalysis(m);
 m={...m,events:[],analysis:{...m.analysis!,status:'in_progress',ranges:[]}};
 const guest=publicMatch(m);
 assert.equal(guest.events.length,1);assert.equal(guest.participants[0].stats.goals,1);
 assert.equal(guest.analysis!.manualStats,undefined);assert.equal(guest.analysis!.session,undefined);
 assert.equal(guest.analysis!.completeKeys.includes('goals'),true);
});
test('loss confirmation plus a linked turnover count once',()=>{
 const p=action('p','PASS','a','FAILED',null,10,{tags:['POSSESSION_LOST']});
 const loss=action('l','TURNOVER','a','',null,10,{linkedEventId:'p'});
 assert.equal(projectEvents(match([p,loss])).participants[0].stats.turnovers,1);
});
test('shot links derive a key pass without counting the manual tag twice',()=>{
 const p=action('p','PASS','a','COMPLETED','b',10,{tags:['KEY_PASS']});
 const shot=action('s','SHOT','b','ON_TARGET',null,12,{linkedEventId:'p'});
 assert.equal(projectEvents(match([p,shot])).participants[0].stats.keyPasses,1);
 assert.equal(matchSchema.safeParse(match([p,shot])).success,true);
});
test('ratings compare confirmed playing time on equal 60-minute volumes',async()=>{
 const {rateMatches}=await import('../lib/performance.ts');
 const m=match([]);m.participants=[{playerId:'a',team:'A',stats:{goals:2},minutesPlayed:30,role:'field'},{playerId:'b',team:'A',stats:{goals:4},minutesPlayed:60,role:'field'},{playerId:'c',team:'B',stats:{goals:4},minutesPlayed:60,role:'field'}];
 const result=rateMatches([m]);assert.deepEqual(result[0].participants.map(p=>p.auto_rating),[6,6,6]);
});
test('goalkeeper ratings require comparable goalkeeper observations',async()=>{
 const {rateMatches}=await import('../lib/performance.ts');
 const m=match([]);m.participants=[{playerId:'a',team:'A',stats:{saves:1},role:'field'},{playerId:'b',team:'A',stats:{saves:1},role:'field'},{playerId:'c',team:'B',stats:{saves:10},role:'goalkeeper'}];
 assert.equal(rateMatches([m])[0].participants[2].auto_rating,null);
});
test('spatial categories cannot publish unpositioned recoveries as verified zeroes',async()=>{
 const {beginAnalysis,reviewAnalysis}=await import('../lib/match-analysis.ts');
 const m=beginAnalysis({...match([action('r','RECOVERY','a','')]),scoreA:8,scoreB:6});m.analysis!.completeKeys=['highRecoveries'];m.analysis!.ranges=[{start:0,end:3600}];
 assert.ok(reviewAnalysis(m).some(i=>i.code==='position'&&i.blocking));
});
test('one pass cannot create two shot links',()=>{
 const p=action('p','PASS','a','COMPLETED','b',10);
 assert.equal(matchSchema.safeParse(match([p,action('s1','SHOT','b','OFF_TARGET',null,12,{linkedEventId:'p'}),action('s2','SHOT','b','OFF_TARGET',null,15,{linkedEventId:'p'})])).success,false);
});
test('verified empty categories publish zero rather than reuse manual totals',async()=>{
 const {beginAnalysis,publishAnalysis,analysisCounts}=await import('../lib/match-analysis.ts');
 const input=match([]);input.participants[0].stats.passesAttempted=10;
 const m=beginAnalysis(input);m.analysis!.completeKeys=['passesAttempted'];m.analysis!.ranges=[{start:0,end:3600}];
 assert.equal(analysisCounts(m).participants[0].stats.goals??0,0);
 assert.equal(publishAnalysis(m).participants[0].stats.passesAttempted,0);
});

test('legacy goals contribute to shots when the shot category is explicitly complete',async()=>{
 const {beginAnalysis,publishAnalysis}=await import('../lib/match-analysis.ts');
 const input=match([{id:'old-goal',type:'GOAL',playerId:'a',team:'A',timestamp:null,relatedPlayerId:null,metadata:{}}]);
 input.scoreA=1;input.scoreB=0;input.trackedKeys=['shots','shotsOnTarget'];input.participants.forEach(p=>{p.stats={goals:p.playerId==='a'?1:0}});
 const m=beginAnalysis(input);m.analysis!.completeKeys=['shots','shotsOnTarget'];m.analysis!.ranges=[{start:0,end:3600}];
 const published=publishAnalysis(m);
 assert.equal(published.participants[0].stats.shots,1);assert.equal(published.participants[0].stats.shotsOnTarget,1);
 assert.equal(matchSchema.safeParse(published).success,true);
});
