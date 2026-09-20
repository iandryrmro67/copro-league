import assert from 'node:assert/strict';
const base='http://localhost:5173';const login=await fetch(base+'/signin-with-chatgpt?return_to=/admin',{redirect:'manual'});const cookie=login.headers.get('set-cookie').split(';')[0];let count=0;
async function post(path,body,status=200){const r=await fetch(base+'/api/'+path,{method:'POST',headers:{cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));count++;return d}
async function league(){return(await fetch(base+'/api/league',{headers:{cookie}})).json()}
const original=await league();assert.equal(original.players.filter(p=>p.id.startsWith('s2-')).length,22);
const season={id:'qa-sequence',name:'QA Sequence Builder',start:'',end:'',status:'inactive',demo:false,contribution:0,minParticipation:0,winnerId:null,version:0};await post('seasons',season);
for(const [id,name]of [['a','Alpha'],['b','Bravo'],['c','Charlie']])await post('players',{id:'qa-seq-'+id,name:'QA '+name,version:0,demo:false});
let m={id:'qa-sequence-match',seasonId:season.id,number:1,date:'',duration:120,location:'',status:'finished',scoreA:0,scoreB:0,mvpId:null,level:3,video:'',version:0,trackedKeys:[],participants:['a','b','c'].map((id,i)=>({playerId:'qa-seq-'+id,team:i===2?'B':'A',stats:{}})),events:[]};
const event=(id,type,outcome,metadata={},extra={})=>({id,playerId:'qa-seq-a',team:'A',type,timestamp:7218,relatedPlayerId:null,metadata:{schemaVersion:2,sequenceId:'qa-seq',outcome,tags:[],position:{x:90,y:50},scene:{players:{'qa-seq-a':{x:90,y:50}},ball:{x:90,y:50}},...metadata},...extra});
const pass=event('qa-pass','PASS','COMPLETED',{tags:['ASSIST','LONG_PASS','KEY_PASS']},{relatedPlayerId:'qa-seq-b'});const shot=event('qa-shot','SHOT','GOAL',{linkedEventId:'qa-pass'},{playerId:'qa-seq-b',relatedPlayerId:'qa-seq-a'});m.events=[pass,shot];await post('matches',m);m=(await league()).matches.find(x=>x.id===m.id);assert.equal(m.scoreA,1);assert.equal(m.participants[0].stats.assists,1);assert.equal(m.events[0].timestamp,7218);count+=3;
await post('matches',{...m,events:[{...shot,metadata:{...shot.metadata,opponentPlayerId:'qa-seq-a'}}]},400);
await post('matches',{...m,events:[event('bad','DUEL','WON',{opponentPlayerId:'qa-seq-b'})]},400);
await post('matches',{...m,events:[event('bad','SHOT','BOGUS')]},400);
await post('matches',{...m,events:[event('bad','TOUCH','',{position:{x:101,y:2}})]},400);
m.events=[pass,{...shot,relatedPlayerId:null,metadata:{...shot.metadata,outcome:'OFF_TARGET',linkedEventId:null}}];await post('matches',m);m=(await league()).matches.find(x=>x.id===m.id);assert.equal(m.scoreA,0);assert.equal(m.participants[1].stats.shotsOnTarget,0);count+=2;
m.events=[];await post('matches',m);m=(await league()).matches.find(x=>x.id===m.id);assert.equal(m.participants[0].stats.assists,0);assert.equal(m.participants[1].stats.shots,0);count+=2;
const boundary=new FormData();boundary.append('file',new File(['bad video'],'bad.mp4',{type:'video/mp4'}));const rejected=await fetch(base+'/api/videos',{method:'POST',headers:{cookie,Origin:base},body:boundary});assert.equal(rejected.status,400);count++;
const unauthorized=await fetch(base+'/api/videos',{method:'POST',headers:{Origin:base},body:boundary});assert.equal(unauthorized.status,401);count++;
assert.equal((await league()).players.filter(p=>p.id.startsWith('s2-')).length,22);count++;
console.log(count+' annotation HTTP checks passed; QA match ready for browser.');
