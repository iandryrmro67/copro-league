import assert from 'node:assert/strict';
const base='http://localhost:5173';
let cookie='';let checks=0;
async function get(path){const r=await fetch(base+path,{headers:{cookie}});assert.equal(r.status,200,path);return r}
async function post(path,body,expected=200,auth=true){const r=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:base,...(auth?{cookie}:{})},body:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));checks++;return data}
await post('players',{},401,false);
const login=await fetch(base+'/signin-with-chatgpt?return_to=/admin',{redirect:'manual'});cookie=login.headers.get('set-cookie')?.split(';')[0]??'';assert.ok(cookie);checks++;
let league=await(await get('/api/league')).json();if(league.bootstrap)await post('bootstrap',{});
await post('players',{id:'qa-player',name:'QA — joueur de test',version:0,attributes:{overall:60}});
league=await(await get('/api/league')).json();assert.ok(league.players.some(p=>p.id==='qa-player'));await get('/joueurs/qa-player');checks++;
await post('seasons',{id:'qa-season',name:'QA — parcours complet',start:'2026-01-01',end:'2027-12-31',status:'active',contribution:1,minParticipation:.3,winnerId:null,version:0});
for(let i=1;i<10;i++)await post('players',{id:'qa-p'+i,name:'QA '+i,version:0,attributes:{overall:50+i}});
const participants=['qa-player',...Array.from({length:9},(_,i)=>'qa-p'+(i+1))].map((playerId,i)=>({playerId,team:i<5?'A':'B',stats:{goals:0,assists:0}}));
let m={id:'qa-match',seasonId:'qa-season',number:1,date:'2026-10-01T18:00:00.000Z',duration:60,location:'Terrain QA',status:'scheduled',scoreA:null,scoreB:null,mvpId:null,level:1,video:'',participants,events:[],trackedKeys:[],version:0};
await post('matches',m);league=await(await get('/api/league')).json();m=league.matches.find(x=>x.id===m.id);assert.equal(m.participants.length,10);await get('/');checks++;
const ics=await(await get('/api/calendar/'+m.id)).text();assert.match(ics,/DTSTART:20261001T180000Z/);checks++;
m={...m,status:'finished',scoreA:2,scoreB:0,mvpId:'qa-player',participants:m.participants.map((p,i)=>({...p,stats:{...p.stats,goals:i===0?2:0,rating:7}}))};await post('matches',m);
league=await(await get('/api/league')).json();m=league.matches.find(x=>x.id===m.id);assert.equal(m.version,2);assert.equal(m.participants[0].stats.goals,2);checks++;
const old=structuredClone(m);m.participants[0].stats.assists=3;await post('matches',m);
await post('matches',old,409);league=await(await get('/api/league')).json();m=league.matches.find(x=>x.id===m.id);assert.equal(m.participants[0].stats.assists,3);checks++;
m.video='https://www.youtube.com/watch?v=M7lc1UVf-VE';await post('matches',m);await get('/matchs/'+m.id);checks++;
league=await(await get('/api/league')).json();m=league.matches.find(x=>x.id===m.id);m.scoreA=1;m.trackedKeys=['goals'];m.events=[{id:'qa-goal',playerId:'qa-player',team:'A',type:'GOAL',timestamp:30,relatedPlayerId:'qa-p1',metadata:{}}];await post('matches',m);league=await(await get('/api/league')).json();m=league.matches.find(x=>x.id===m.id);assert.equal(m.participants.find(x=>x.playerId==='qa-player').stats.goals,1);assert.equal(m.participants.find(x=>x.playerId==='qa-p1').stats.assists,1);checks++;
m.events=[];m.scoreA=0;await post('matches',m);league=await(await get('/api/league')).json();m=league.matches.find(x=>x.id===m.id);assert.equal(m.participants.find(x=>x.playerId==='qa-player').stats.goals,0);assert.equal(m.participants.find(x=>x.playerId==='qa-p1').stats.assists,0);checks++;
await post('seasons',{id:'qa-season2',name:'QA — saison suivante',start:'2027-01-01',end:'2028-01-01',status:'active',contribution:2,minParticipation:.3,winnerId:null,version:0});
let p=league.players.find(p=>p.id==='qa-player');p.attributes.overall=85;await post('players',p);await post('players',{...p,attributes:{overall:1}},409);league=await(await get('/api/league')).json();assert.equal(league.players.find(p=>p.id===p.id&&p.id==='qa-player').attributes.overall,85);checks++;
await get('/api/export?table=MATCH_STATS');checks++;
await post('demo',{},404);
console.log(JSON.stringify({checks,status:'passed',journey:'Auth, joueur, profil, saison, match, participants, calendrier, résultat, correction, concurrence, vidéo, événements, export, nouvelle saison, démo désactivée'},null,2));
