import test from 'node:test';
import assert from 'node:assert/strict';
import {annotationMoment,recordQuickAction,eventVideoTime,reviewRanges,filterActions,timelineWindow,reviewProgress,restoreAnnotation} from '../lib/annotation-controls.ts';
import {analysisCounts,beginAnalysis,previousPass} from '../lib/match-analysis.ts';
import {matchSchema} from '../lib/validation.ts';
import {secondaryAssistCredits} from '../lib/actions.ts';
import type {Match,MatchEvent} from '../lib/model.ts';

function fixture():Match{return beginAnalysis({id:'m',seasonId:'s',number:1,date:'',duration:60,location:'',status:'finished',scoreA:8,scoreB:6,mvpId:null,level:3,video:'',version:1,trackedKeys:[],participants:[{playerId:'a',team:'A',stats:{goals:8}},{playerId:'b',team:'A',stats:{}},{playerId:'d',team:'A',stats:{}},{playerId:'c',team:'B',stats:{goals:6}}],events:[]});}
const moment={timestamp:20,videoTimestamp:50};

test('marking preserves the match time and video offset, rejecting pre-kickoff frames',()=>{
 assert.deepEqual(annotationMoment({videoTime:50.8,offset:30,stamp:'0:00',useVideo:true}),{timestamp:20,videoTimestamp:50.8});
 assert.deepEqual(annotationMoment({videoTime:99,offset:30,stamp:'120:05',useVideo:false}),{timestamp:7205,videoTimestamp:7235});
 assert.throws(()=>annotationMoment({videoTime:20,offset:30,stamp:'0:00',useVideo:true}),/début/i);
 assert.throws(()=>annotationMoment({videoTime:0,offset:0,stamp:'1:99',useVideo:false}),/mm:ss/);
});

test('one-click goal counts once and leaves official and manual scores intact',()=>{
 const result=recordQuickAction(fixture(),{preset:'goal',playerId:'a',sequenceId:'seq',moment});
 assert.equal(result.match.events.length,1);
 assert.deepEqual([result.match.scoreA,result.match.scoreB],[8,6]);
 assert.equal(result.match.participants[0].stats.goals,8);
 assert.equal(analysisCounts(result.match).participants[0].stats.goals,1);
 assert.equal(analysisCounts(result.match).participants[0].stats.shots,1);
 assert.equal(result.event.metadata.position,null);
 assert.notEqual(result.sequenceId,'seq');
 assert.equal(matchSchema.safeParse(result.match).success,true);
});

test('chained passes transfer the carrier and a goal derives both assists',()=>{
 const first=recordQuickAction(fixture(),{preset:'pass',playerId:'a',recipientId:'b',sequenceId:'seq',moment});
 assert.equal(first.nextActor,'b');
 const second=recordQuickAction(first.match,{preset:'pass',playerId:'b',recipientId:'d',sequenceId:first.sequenceId,moment:{timestamp:22,videoTimestamp:52}});
 const goal=recordQuickAction(second.match,{preset:'goal',playerId:'d',sequenceId:second.sequenceId,moment:{timestamp:25,videoTimestamp:55}});
 assert.equal(goal.event.relatedPlayerId,'b');
 assert.equal(goal.event.metadata.linkedEventId,second.event.id);
 assert.equal(analysisCounts(goal.match).participants[1].stats.assists,1);
 assert.equal(secondaryAssistCredits(goal.match.events)[0]?.playerId,'a');
 assert.equal(matchSchema.safeParse(goal.match).success,true);
});

test('a new possession does not reuse an earlier assist',()=>{
 const pass=recordQuickAction(fixture(),{preset:'pass',playerId:'a',recipientId:'b',sequenceId:'old',moment});
 const goal=recordQuickAction(pass.match,{preset:'goal',playerId:'b',sequenceId:'new',moment:{timestamp:25,videoTimestamp:55}});
 assert.equal(goal.event.relatedPlayerId,null);
 assert.equal(goal.event.metadata.linkedEventId,null);
});

test('seeking backward never links a pass already consumed by a later shot',()=>{
 const pass=recordQuickAction(fixture(),{preset:'pass',playerId:'a',recipientId:'b',sequenceId:'seq',moment:{timestamp:10,videoTimestamp:10}});
 const first=recordQuickAction(pass.match,{preset:'on-target',playerId:'b',sequenceId:'seq',moment:{timestamp:20,videoTimestamp:20}});
 const earlier=recordQuickAction(first.match,{preset:'off-target',playerId:'b',sequenceId:'seq',moment:{timestamp:19,videoTimestamp:19}});
 assert.equal(earlier.event.metadata.linkedEventId,null);
 assert.equal(matchSchema.safeParse(earlier.match).success,true);
});

test('reselecting the shot type during an edit retains its own compatible pass',()=>{
 const pass=recordQuickAction(fixture(),{preset:'pass',playerId:'a',recipientId:'b',sequenceId:'seq',moment:{timestamp:10,videoTimestamp:10}});
 const goal=recordQuickAction(pass.match,{preset:'goal',playerId:'b',sequenceId:'seq',moment:{timestamp:20,videoTimestamp:20}});
 assert.equal(previousPass(goal.match,'b','seq',20,goal.event.id)?.id,pass.event.id);
});

test('review waits for an asynchronous seek before advancing clips',()=>{
 const range={start:46,end:53};
 assert.equal(reviewProgress(range,300,true),'waiting');
 assert.equal(reviewProgress(range,52,true),'waiting');
 assert.equal(reviewProgress(range,46,true),'playing');
 assert.equal(reviewProgress(range,53,false),'finished');
 assert.equal(reviewProgress({start:0,end:3},0,true),'playing');
});

test('passes reject a self-recipient, opponent or unassigned player',()=>{
 for(const recipientId of ['a','c','unknown'])assert.throws(()=>recordQuickAction(fixture(),{preset:'pass',playerId:'a',recipientId,sequenceId:'seq',moment}),/partenaire/i);
 assert.throws(()=>recordQuickAction(fixture(),{preset:'goal',playerId:'unknown',sequenceId:'seq',moment}),/équipe/i);
});

test('failed pass with unknown recipient stays valid without inventing a loss',()=>{
 const result=recordQuickAction(fixture(),{preset:'failed-pass',playerId:'a',sequenceId:'seq',moment});
 const stats=analysisCounts(result.match).participants[0].stats;
 assert.equal(stats.passesAttempted,1);assert.equal(stats.passesCompleted??0,0);assert.equal(stats.turnovers??0,0);
 assert.equal(result.event.relatedPlayerId,null);
 assert.equal(matchSchema.safeParse(result.match).success,true);
});

test('review uses the stored video timestamp and merges overlapping clips',()=>{
 const a=recordQuickAction(fixture(),{preset:'goal',playerId:'a',sequenceId:'seq',moment}).event;
 const b={...a,id:'b',timestamp:23,metadata:{...a.metadata,videoTimestamp:53}};
 const unknown={...a,id:'unknown',timestamp:null,metadata:{}};
 assert.equal(eventVideoTime(a,99),50);
 assert.equal(eventVideoTime({...a,metadata:{}},30),50);
 assert.equal(eventVideoTime(unknown,30),null);
 assert.deepEqual(reviewRanges([b,unknown,a],30),[{start:46,end:56}]);
 assert.deepEqual(reviewRanges([{...a,metadata:{videoTimestamp:1}}],0,4,3,2),[{start:0,end:2}]);
});

test('player filters include recipients, assistants and opponents',()=>{
 const pass=recordQuickAction(fixture(),{preset:'pass',playerId:'a',recipientId:'b',sequenceId:'seq',moment}).event;
 const duel:MatchEvent={...pass,id:'duel',type:'DUEL',relatedPlayerId:null,metadata:{schemaVersion:2,outcome:'WON',opponentPlayerId:'c'}};
 assert.deepEqual(filterActions([pass,duel],{player:'b'}).map(e=>e.id),[pass.id]);
 assert.deepEqual(filterActions([pass,duel],{player:'c',team:'A'}).map(e=>e.id),['duel']);
 assert.equal(filterActions([pass],{player:'c'}).length,0);
});

test('goal and shot filters work with legacy and atomic actions',()=>{
 const goal=recordQuickAction(fixture(),{preset:'goal',playerId:'a',sequenceId:'seq',moment}).event;
 const old={...goal,id:'legacy',type:'GOAL',metadata:{}};
 const shot=recordQuickAction(fixture(),{preset:'on-target',playerId:'a',sequenceId:'seq',moment}).event;
 assert.equal(filterActions([goal,old,shot],{type:'GOAL'}).length,2);
 assert.equal(filterActions([goal,old,shot],{type:'SHOT'}).length,3);
});

test('assist filter excludes the selected player’s own goals',()=>{
 const own=recordQuickAction(fixture(),{preset:'goal',playerId:'a',sequenceId:'seq',moment}).event;
 const assisted={...own,id:'assisted',playerId:'b',relatedPlayerId:'a'};
 assert.deepEqual(filterActions([own,assisted],{player:'a',type:'ASSIST'}).map(e=>e.id),['assisted']);
});

test('editing a validated analysis clears its coverage without changing the published snapshot',()=>{
 const m=fixture();m.analysis!.status='validated';m.analysis!.ranges=[{start:0,end:3600}];m.analysis!.publishedEvents=[];
 const result=recordQuickAction(m,{preset:'goal',playerId:'a',sequenceId:'seq',moment});
 assert.deepEqual(result.match.analysis!.ranges,[]);
 assert.deepEqual(result.match.analysis!.publishedEvents,[]);
});

test('undo restores observations while retaining later official and manual edits',()=>{
 const before=fixture();
 const current=recordQuickAction(before,{preset:'goal',playerId:'a',sequenceId:'seq',moment}).match;
 current.scoreA=9;current.participants[0].stats.goals=9;current.video='updated-video';current.version=5;
 current.analysis!.publishedEvents=[current.events[0]];
 const restored=restoreAnnotation(current,before);
 assert.equal(restored.events.length,0);
 assert.equal(restored.scoreA,9);
 assert.equal(restored.participants[0].stats.goals,9);
 assert.equal(restored.video,'updated-video');assert.equal(restored.version,5);
 assert.equal(restored.analysis!.publishedEvents?.length,1);
});

test('zoom stays inside the match at both ends',()=>{
 assert.deepEqual(timelineWindow(3600,20,120),{start:0,end:120});
 assert.deepEqual(timelineWindow(3600,3590,120),{start:3480,end:3600});
 assert.deepEqual(timelineWindow(0,0,0),{start:0,end:60});
});
