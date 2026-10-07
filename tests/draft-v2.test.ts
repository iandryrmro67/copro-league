import test from 'node:test';
import assert from 'node:assert/strict';
import type { Player, Match } from '../lib/model.ts';
import { draftAptitudes, draftHistory, hybridBalancedDraft, hybridCost, weakestFunction, randomPackDraft, shuffledIds, canApplyDraft, packEstimate, computeDraft, type Aptitudes } from '../lib/draft.ts';
import { matchSchema } from '../lib/validation.ts';
const player = (id: string, attributes: Record<string, number> = {}): Player => ({ id, name: id, attributes, archived: false, demo: false, bio: '', photo: '', funFacts: '', version: 0 });
const match = (i: number, participants: Match['participants'], patch: Partial<Match> = {}): Match => ({ id: 'm'+i, number: i+1, date: `2026-01-${String(i+1).padStart(2,'0')}T12:00:00Z`, seasonId: 'season', status: 'finished', duration: 60, location: 'Terrain', scoreA: 1, scoreB: 0, mvpId: null, level: 1, video: '', events: [], trackedKeys: [], version: 0, participants, ...patch });

test('Hybrid preparation uses every aptitude, preserves zero and keeps unknown neutral', () => {
 const players=[player('hybrid',{finition:85,creation:90,defense:78,percussion:70}),player('zero',{finition:0}),player('unknown')];
 const before=structuredClone(players);const skills=draftAptitudes(players,[]);
 assert.deepEqual(skills.hybrid,[78,90,70,85]);assert.equal(skills.zero[3],0);assert.deepEqual(skills.unknown,[50,50,50,50]);assert.deepEqual(players,before);
});
test('Automatic observations use the latest twenty appearances and react to corrected matches', () => {
 const players=['a','b','c','d'].map(id=>player(id,{finition:50}));
 const rows=players.map((p,i)=>({playerId:p.id,team:i<2?'A' as const:'B' as const,stats:{goals:i,shotsOnTarget:i+1}}));
 const ms=Array.from({length:25},(_,i)=>match(i,structuredClone(rows)));
 const before=structuredClone(ms);const skills=draftAptitudes(players,ms);assert.ok(skills.d[3]>skills.a[3]);
 const early=structuredClone(ms);early[0].participants[0].stats.goals=10000;assert.deepEqual(draftAptitudes(players,early),skills);
 const corrected=structuredClone(ms);corrected.at(-1)!.participants[0].stats.goals=10000;assert.ok(draftAptitudes(players,corrected).a[3]>skills.a[3]);
 assert.deepEqual(ms,before);
});
test('Incomplete observations do not turn missing values into zero or invent a public style', () => {
 const players=['a','b','c'].map(id=>player(id,{finition:80}));
 const ms=Array.from({length:5},(_,i)=>match(i,[{playerId:'a',team:'A',stats:{goals:0}},{playerId:'b',team:'A',stats:{}},{playerId:'c',team:'B',stats:{}}]));
 assert.equal(draftAptitudes(players,ms).a[3],80);assert.equal(draftAptitudes(players,ms).b[3],80);
});
test('History excludes the target, later matches, unscored matches and empty or duplicated lineups', () => {
 const rows=[{playerId:'a',team:'A' as const,stats:{}},{playerId:'b',team:'B' as const,stats:{}}];
 const ms=[match(0,rows),match(1,rows),match(2,rows),match(0,rows,{id:'missing',scoreA:null}),match(0,[rows[0]],{id:'empty'}),match(0,[...rows,rows[0]],{id:'duplicate'})];
 assert.deepEqual(draftHistory(ms,{id:'m1',date:ms[1].date}).map(m=>m.id),['m0']);
});
test('A hybrid cannot fill four simultaneous functions by itself', () => {
 assert.equal(weakestFunction([[90,90,90,90],[80,0,0,0],[0,80,0,0],[0,0,80,0]]),80);
 assert.equal(weakestFunction([[90,90,90,90],[0,0,0,0],[0,0,0,0],[0,0,0,0]]),0);
});
test('Search finds the global compromise, respects locks, and distributes complementary hybrids', () => {
 const players=Array.from({length:8},(_,i)=>player('p'+i,{overall:75}));
 const vectors: Aptitudes[]=[[90,20,20,20],[80,85,20,20],[20,90,20,20],[20,80,85,20],[20,20,90,20],[20,20,80,85],[20,20,20,90],[85,20,20,80]];
 const skills=Object.fromEntries(players.map((p,i)=>[p.id,vectors[i]]));
 const d=hybridBalancedDraft(players,{},skills,{p0:'A',p6:'B'},()=>.4);
 const A=players.filter(p=>d.A.includes(p.id)),B=players.filter(p=>d.B.includes(p.id));
 assert.ok(d.A.includes('p0'));assert.ok(d.B.includes('p6'));assert.equal(new Set([...d.A,...d.B]).size,8);
 assert.ok(weakestFunction(A.map(p=>skills[p.id]))>=80);assert.ok(weakestFunction(B.map(p=>skills[p.id]))>=80);
 let best=Infinity;
 for(let mask=0;mask<256;mask++){const a=players.filter((_,i)=>mask&(1<<i));if(a.length!==4||!a.some(p=>p.id==='p0')||a.some(p=>p.id==='p6'))continue;best=Math.min(best,hybridCost(a,players.filter(p=>!a.includes(p)),{},skills))}
 assert.ok(Math.abs(hybridCost(A,B,{},skills)-best)<1e-9);
});
test('No required role or five-percent cutoff blocks an imperfect group', () => {
 const players=Array.from({length:10},(_,i)=>player('p'+i,{overall:i===0?100:0}));
 const skills=Object.fromEntries(players.map(p=>[p.id,[70,75,20,80] as Aptitudes]));
 const d=hybridBalancedDraft(players,{},skills);assert.equal(d.A.length,5);assert.equal(d.B.length,5);assert.ok(d.gap>5);
 assert.throws(()=>hybridBalancedDraft(players,{},skills,Object.fromEntries(players.slice(0,6).map(p=>[p.id,'A' as const]))),/verrouillages/);
});
test('Pack always draws five versus five without using player strength', () => {
 const players=Array.from({length:10},(_,i)=>player('p'+i,{overall:i<5?100:0}));
 for(const random of [()=>0,()=>.999,Math.random]){
  const before=structuredClone(players);const d=randomPackDraft(players,random);
  assert.equal(d.A.length,5);assert.equal(d.B.length,5);assert.equal(new Set([...d.A,...d.B]).size,10);
  assert.deepEqual([...d.A,...d.B].sort(),players.map(p=>p.id).sort());assert.deepEqual(players,before);
 }
 const draw=randomPackDraft(players,()=>.999);assert.deepEqual(draw.A,players.slice(0,5).map(p=>p.id));
 assert.throws(()=>randomPackDraft(players.slice(0,8)),/10 joueurs/);
 assert.throws(()=>randomPackDraft([...players,players[0],players[1]]),/deux fois/);
 const ids=shuffledIds(players,()=>0);assert.deepEqual([...ids].sort(),players.map(p=>p.id).sort());assert.notDeepEqual(ids,players.map(p=>p.id));
});
test('Pack validation requires a complete unique ten-player roster split five versus five', () => {
 const players=Array.from({length:10},(_,i)=>player('p'+i));const teams=Object.fromEntries(players.map((p,i)=>[p.id,i<5?'A' as const:'B' as const]));
 assert.equal(canApplyDraft(players,teams,'pack'),true);
 assert.equal(canApplyDraft(players,{...teams,p0:'B'},'pack'),false);
 assert.equal(canApplyDraft(players.slice(0,8),Object.fromEntries(players.slice(0,8).map((p,i)=>[p.id,i<4?'A':'B'])),'pack'),false);
 assert.equal(canApplyDraft(players,{p0:'A',p1:'B'},'pack'),false);
 assert.equal(canApplyDraft(players,{...teams,stranger:'B'},'pack'),false);
 assert.equal(canApplyDraft(players,{...teams,p0:'B',p5:'A'},'pack'),true);
 const m=match(0,players.map(p=>({playerId:p.id,team:teams[p.id],stats:{}})),{status:'scheduled',date:'2026-10-15T12:00:00Z',scoreA:null,scoreB:null});
 assert.equal(matchSchema.safeParse(m).success,true);
});
test('Pack estimates handle draws symmetrically and refuse unsupported or incomplete evidence', () => {
 const players=['a','b'].map(id=>player(id));
 const ms=Array.from({length:20},(_,i)=>match(i,[{playerId:'a',team:'A',stats:{}},{playerId:'b',team:'B',stats:{}}],{scoreA:i%4?1:0,scoreB:0}));
 const e=packEstimate([players[0]],[players[1]],players,ms);assert.equal(e.available,true);
 if(e.available){assert.ok(Math.abs(e.A.win+e.A.draw+e.A.lose-100)<1e-9);assert.equal(e.A.win,e.B.lose);assert.equal(e.A.lose,e.B.win);assert.equal(e.A.draw,e.B.draw);assert.ok(e.A.win>e.B.win)}
 assert.equal(packEstimate([players[0]],[players[1]],players,ms.slice(0,19)).available,false);
 assert.equal(packEstimate(players,[players[1]],players,ms).available,false);
 assert.equal(packEstimate([],players,players,ms).available,false);
 assert.equal(packEstimate([players[0]],[players[1]],players,ms.map(m=>({...m,scoreA:null}))).available,false);
});
test('Async fallback produces a valid balanced result without modifying league data', async () => {
 const players=Array.from({length:10},(_,i)=>player('p'+i,{overall:50+i,defense:60+i}));
 const before=structuredClone(players);const d=await computeDraft({players,population:players,matches:[],locks:{p0:'A'}});
 assert.ok(d.A.includes('p0'));assert.equal(d.A.length,5);assert.deepEqual(players,before);
});
