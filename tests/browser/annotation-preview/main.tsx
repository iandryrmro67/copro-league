import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Analyzer} from '../../../components/league-analyzer';
import {beginAnalysis} from '../../../lib/match-analysis';
import type {League,Match} from '../../../lib/model';
import '../../../app/globals.css';
import '../../../app/design-system.css';
import './preview.css';
const names=['Mathis','Loris','Xan','Adam','Sam','Alex','Paul','Tom','Hugo','Leo'];
const players=names.map((name,i)=>({id:'p'+i,name,bio:'',photo:'',archived:false,demo:false,funFacts:'',attributes:{},version:1}));
function fixture():Match{return beginAnalysis({id:'browser-test',seasonId:'s',number:1,date:'',duration:3,location:'Test local',status:'finished',scoreA:8,scoreB:6,mvpId:null,level:3,video:'/api/videos/00000000-0000-4000-8000-000000000000.mp4',participants:players.map((p,i)=>({playerId:p.id,team:i<5?'A':'B',stats:{goals:i===0?8:i===5?6:0}})),events:[],trackedKeys:[],teamAName:'Les Verts',teamBName:'Les Bleus',version:1});}
function Preview(){const [match,setMatch]=useState(fixture),[epoch,setEpoch]=useState(0);const data:League={players,seasons:[],matches:[match],settings:{minRating:5,minRadar:5,minDuo:5,minPasses:30,minAttempts:10},admin:true,bootstrap:false,user:'browser-test'};return <main className="annotation-preview-shell"><div className="annotation-preview-top"><strong>COPRO / LEAGUE</strong><p>APERÇU LOCAL · MATCH FICTIF</p><button className="button" onClick={()=>{setMatch(fixture());setEpoch(n=>n+1);}}>Réinitialiser le test</button></div><Analyzer key={epoch} match={match} data={data} onChange={setMatch}/><details><summary>État du test</summary><pre data-testid="test-state">{JSON.stringify(match)}</pre></details></main>}
createRoot(document.getElementById('root')!).render(<Preview/>);
