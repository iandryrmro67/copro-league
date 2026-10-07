import test from 'node:test';
import assert from 'node:assert/strict';
import {captureStep,recordPreciseAction,type CaptureDraft} from '../lib/precise-annotation.ts';
import {canonicalEffects} from '../lib/actions.ts';
import {contactEpisodes} from '../lib/contact-episodes.ts';
import {coordinates} from '../lib/events.ts';
import {matchSchema} from '../lib/validation.ts';
import type {Match} from '../lib/model.ts';
const match=():Match=>({id:'m',seasonId:'s',number:1,date:'',duration:60,location:'',status:'finished',scoreA:0,scoreB:0,mvpId:null,level:3,video:'',version:0,trackedKeys:[],participants:[{playerId:'a',team:'A',stats:{}},{playerId:'b',team:'A',stats:{}},{playerId:'c',team:'B',stats:{}}],events:[]});
const draft=(patch:Partial<CaptureDraft>):CaptureDraft=>({captureRevision:3,type:'PASS',outcome:'COMPLETED',mate:'b',opponent:'',tags:[],participantChosen:true,detailChosen:true,passTypeChosen:false,positionPending:true,...patch});
const record=(d:CaptureDraft,m=match())=>recordPreciseAction(m,{draft:d,playerId:'a',sequenceId:'seq',moment:{timestamp:20,videoTimestamp:20}});
test('new pass requires type before the final position and cannot write early',()=>{
 const d=draft({});assert.equal(captureStep(d),'pass-type');assert.throws(()=>record(d));
 const typed={...d,tags:['NORMAL'],passTypeChosen:true};assert.equal(captureStep(typed),'position');assert.throws(()=>record(typed));
 const r=record({...typed,positionPending:false,position:{x:30,y:60}});
 assert.deepEqual(coordinates(r.event.metadata),{x:30,y:60});assert.equal(r.match.events.length,1);assert.ok(matchSchema.safeParse(r.match).success);
});
test('unknown final position remains absent from maps rather than inventing a point',()=>{
 const r=record(draft({tags:['PASS_UNKNOWN'],passTypeChosen:true,positionPending:false,position:null}));
 assert.equal(coordinates({...r.event.metadata,shotPosition:{x:50,y:50}}),null);assert.equal(coordinates(r.event.metadata),null);assert.equal(r.event.relatedPlayerId,'b');
});
test('failed retained pass creates no interception or possession loss',()=>{
 const r=record(draft({outcome:'FAILED',mate:'',tags:['NORMAL','TEAM_RETAINS'],passTypeChosen:true,positionPending:false}));
 assert.deepEqual(canonicalEffects(r.event,r.match.events),[['a','passesAttempted']]);
});
test('intercepted pass credits the opponent once while retaining observed origin',()=>{
 const r=record(draft({outcome:'FAILED',mate:'',opponent:'c',tags:['NORMAL','INTERCEPTED','POSSESSION_LOST'],passTypeChosen:true,positionPending:false,position:{x:10,y:30}}));
 const effects=canonicalEffects(r.event,r.match.events);assert.ok(effects.some(([id,k])=>id==='c'&&k==='interceptions'));assert.ok(effects.some(([id,k])=>id==='a'&&k==='turnovers'));assert.ok(!effects.some(([,k])=>k==='highRecoveries'));
});
test('failed new tackle is an attempt and cannot increase defensive tackles',()=>{
 const r=record(draft({type:'TACKLE',outcome:'LOST',mate:'',opponent:'c',passTypeChosen:undefined,positionPending:false}));
 assert.deepEqual(canonicalEffects(r.event,r.match.events),[['a','tacklesAttempted']]);
});
test('Golazo preserves sporting effects and is rejected on a non-goal',()=>{
 const goal=draft({type:'SHOT',outcome:'GOAL',mate:'b',tags:[],passTypeChosen:undefined,positionPending:false});
 const r=record(goal),g=record({...goal,tags:['GOLAZO']});assert.deepEqual(canonicalEffects(r.event,r.match.events),canonicalEffects(g.event,g.match.events));
 const invalid={...g.match,events:[{...g.event,metadata:{...g.event.metadata,outcome:'OFF_TARGET'}}]};assert.equal(matchSchema.safeParse(invalid).success,false);
});
test('pressure-linked recovery credits the recoverer and context to the distinct presser',()=>{
 const r=record(draft({type:'RECOVERY',outcome:'',mate:'',tags:['PRESSING'],passTypeChosen:undefined,pressurePlayerId:'b',pressureChosen:true,positionPending:false}));
 assert.deepEqual(canonicalEffects(r.event,r.match.events),[['a','recoveries'],['b','pressuresWithRecovery']]);assert.ok(matchSchema.safeParse(r.match).success);
});
test('a pressure-escaping dribble preserves the holder without creating a duel',()=>{
 const r=record(draft({type:'DRIBBLE',outcome:'COMPLETED',mate:'',opponent:'c',tags:['ESCAPE_PRESSURE'],passTypeChosen:undefined,positionPending:false}));
 assert.equal(r.nextActor,'a');assert.ok(!canonicalEffects(r.event,r.match.events).some(([,k])=>k==='duelsWon'));
});
test('contact episodes merge immediate receive/pass and do not treat failed tackles as contacts',()=>{
 const first=record(draft({tags:['NORMAL'],passTypeChosen:true,positionPending:false})).event;
 const next={...first,id:'p2',playerId:'b',relatedPlayerId:'a',timestamp:21};
 const failed={...first,id:'t1',type:'TACKLE',timestamp:22,metadata:{...first.metadata,outcome:'LOST'}};
 assert.deepEqual(contactEpisodes([first,next,failed]),{a:2,b:1});
});
