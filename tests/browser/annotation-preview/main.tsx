import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {MatchEditor} from '../../../components/league-admin';
import {navigationKind} from '../../../lib/animated-navigation';
import {Draft} from '../../../components/league-draft';
import {AnimationPreview} from '../../../components/animations/AnimationProvider';
import {Analyzer} from '../../../components/league-analyzer';
import {beginAnalysis,publishAnalysis,coverageFamilies} from '../../../lib/match-analysis';
import type {League,Match,MatchEvent} from '../../../lib/model';
import '../../../app/globals.css';
import '../../../app/tokens.css';
import '../../../app/design-system.css';
import '../../../app/animations.css';
import './preview.css';
const names=['Mathis','Loris','Xan','Adam','Sam','Alex','Paul','Tom','Hugo','Leo'];
const players=names.map((name,i)=>({id:'p'+i,name,bio:'',photo:'',archived:false,demo:false,funFacts:'',attributes:{},version:1}));
const params=new URLSearchParams(window.location.search);
function fixture():Match{return beginAnalysis({id:'browser-test',seasonId:'s',number:1,date:'',duration:3,location:'Test local',status:'finished',scoreA:8,scoreB:6,mvpId:null,level:3,video:params.get('video')==='none'?'':params.get('video')==='broken'?'/api/videos/ffffffff-ffff-4fff-8fff-ffffffffffff.mp4':'/api/videos/00000000-0000-4000-8000-000000000000.mp4',participants:players.map((p,i)=>({playerId:p.id,team:i<5?'A':'B',stats:{goals:i===0?8:i===5?6:0}})),events:[],trackedKeys:[],teamAName:'Les Verts',teamBName:'Les Bleus',version:1});}
function Preview(){const [match,setMatch]=useState<Match>(()=>params.has('persist')&&localStorage.getItem('precise-preview')?JSON.parse(localStorage.getItem('precise-preview')!):fixture()),[epoch,setEpoch]=useState(0);const data:League={players,seasons:[],matches:[match],settings:{minRating:5,minRadar:5,minDuo:5,minPasses:30,minAttempts:10},admin:true,bootstrap:false,user:'browser-test'};return <main className="annotation-preview-shell"><div className="annotation-preview-top"><strong>COPRO / LEAGUE</strong><p>APERÇU LOCAL · MATCH FICTIF</p><button className="button" onClick={()=>{setMatch(fixture());setEpoch(n=>n+1);}}>Réinitialiser le test</button></div><Analyzer key={epoch} match={match} data={data} onChange={next=>{setMatch(next);if(params.has('persist'))localStorage.setItem('precise-preview',JSON.stringify(next))}}/><details><summary>État du test</summary><pre data-testid="test-state">{JSON.stringify(match)}</pre></details></main>}
function HistoryPreview(){
 const [blocked,setBlocked]=useState(false);
 useEffect(()=>{if(!blocked)return;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Fixture quota','QuotaExceededError')};return()=>{Storage.prototype.setItem=original;};},[blocked]);
 const match=fixture(),data:League={players,seasons:[],matches:[match],settings:{minRating:5,minRadar:5,minDuo:5,minPasses:30,minAttempts:10},admin:true,bootstrap:false,user:'history-fixture'};
 const editor=location.pathname==='/admin';
 return <main className="annotation-preview-shell"><h1>HISTOIRE / MATCH FICTIF LOCAL</h1>{editor?<><label><input type="checkbox" checked={blocked} onChange={e=>setBlocked(e.target.checked)}/> Bloquer le stockage local du test</label><p>Retour arrière doit proposer de rester si le brouillon est modifié.</p><MatchEditor match={match} data={data} busy={false} onSave={async()=>undefined} refresh={async()=>data}/></>:<a className="button" href="/admin?history=1&video=none" onClick={e=>{e.preventDefault();if(navigationKind(location.pathname,'/admin')==='document')location.assign(e.currentTarget.href);else{history.pushState(null,'',e.currentTarget.href);location.reload();}}}>Ouvrir l’éditeur local</a>}</main>;
}
function DraftPreview(){
 const [match,setMatch]=useState<Match>(()=>({...fixture(),status:'scheduled',participants:fixture().participants.slice(0,4)})),[fail,setFail]=useState(false),[saved,setSaved]=useState<Match|null>(null);
 useEffect(()=>{if(!params.has('draft-api'))return;const original=window.fetch;window.fetch=async(input,init)=>{if(String(input)!=='/api/matches')return original(input,init);if(fail)return new Response(JSON.stringify({error:'Validation HTTP fictive refusée'}),{status:409});const next=JSON.parse(String(init?.body)) as Match;setSaved(next);setMatch({...next,version:next.version+1});return new Response(JSON.stringify({id:next.id}),{status:200});};return()=>{window.fetch=original;};},[fail]);
 const data:League={players:players.slice(0,4),seasons:[],matches:params.has('draft-api')?[match]:[],settings:{minRating:5,minRadar:5,minDuo:5,minPasses:30,minAttempts:10},admin:true,bootstrap:false,user:'local-fixture'};
 return <AnimationPreview reduced={true}><main className="annotation-preview-shell"><h1>Draft fictive locale</h1><label><input type="checkbox" checked={fail} onChange={e=>setFail(e.target.checked)}/> Simuler un échec de validation</label><button className="button" onClick={()=>setMatch({...fixture(),id:match.id==='other'?'browser-test':'other',number:2,status:'scheduled',participants:fixture().participants.slice(0,4)})}>Changer de match fictif</button><Draft data={data} refresh={async()=>data} match={params.has('free')||params.has('draft-api')?undefined:match} onApply={params.has('free')||params.has('draft-api')?undefined:(next)=>{if(fail)throw Error('Validation fictive refusée');setSaved(next);setMatch(next);}}/><output aria-label="Équipes enregistrées dans le test">{JSON.stringify(saved?.participants.map(p=>({id:p.playerId,team:p.team}))??[])}</output></main></AnimationPreview>;
}
function PublicationPreview(){
 const [match,setMatch]=useState<Match>(()=>{
  const events:MatchEvent[]=Array.from({length:60},(_,i)=>({id:'review-'+i,playerId:'p0',team:'A' as const,type:i%2?'RECOVERY':'PASS',timestamp:i+1,relatedPlayerId:i%2?null:'p1',metadata:{schemaVersion:2,sequenceId:'review',outcome:i%2?'':'FAILED',tags:[],opponentPlayerId:i%2?null:'p5',counterpartStats:true}}));
  events.push({id:'review-assist',playerId:'p0',team:'A',type:'PASS',timestamp:80,relatedPlayerId:'p1',metadata:{schemaVersion:2,sequenceId:'review',outcome:'COMPLETED',tags:['ASSIST'],opponentPlayerId:null,counterpartStats:false}});
  const m=beginAnalysis({...fixture(),scoreA:0,scoreB:0,events,participants:fixture().participants.map(p=>({...p,stats:{goals:0}}))});
  m.analysis!.completeKeys=Object.values(coverageFamilies).flat();m.analysis!.ranges=[{start:0,end:180}];m.analysis!.status='review';return m;
 });
 const data:League={players,seasons:[],matches:[match],settings:{minRating:5,minRadar:5,minDuo:5,minPasses:30,minAttempts:10},admin:true,bootstrap:false,user:'publication-fixture'};
 return <main className="annotation-preview-shell"><h1>PUBLICATION · MATCH FICTIF</h1><MatchEditor match={match} data={data} busy={false} onSave={async next=>{const saved=next.analysis?.status==='validated'?publishAnalysis(next):next;const updated={...saved,version:next.version+1};setMatch(updated);return updated;}} refresh={async()=>data}/><pre data-testid="published-state">{JSON.stringify({status:match.analysis?.status,keys:match.analysis?.publishedKeys,events:match.events.length,stats:match.participants.map(p=>p.stats)})}</pre></main>
}
createRoot(document.getElementById('root')!).render(params.has('review')?<PublicationPreview/>:params.has('draft')?<DraftPreview/>:params.has('history')?<HistoryPreview/>:<Preview/>);
