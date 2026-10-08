'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {divisionFor} from '@/lib/divisions';
import {facts,metric,power,duos,type Summary} from '@/lib/engine';
import type {Match} from '@/lib/model';
import {SourceTemplate,hudTemplates,sourceAt} from './hud-source-template';
import {usePlayerRecognition} from './league-recognition';
import {Picker,Empty,fmt} from './league-ui';
type Slots=Record<string,ReactNode>;
type Props=Record<string,Record<string,unknown>>;
export function SourcePlayersMenu({summaries,population,matches,seasonName}:{summaries:Summary[];population:Summary[];matches:Match[];seasonName:string}){
 const [search,setSearch]=useState(''),[sort,setSort]=useState('elo'),[selected,setSelected]=useState(''),[width,setWidth]=useState(616);
 const scene=useRef<HTMLDivElement>(null);
 useEffect(()=>{const element=scene.current;if(!element)return;const observer=new ResizeObserver(([entry])=>setWidth(entry.contentRect.width));observer.observe(element);return()=>observer.disconnect()},[]);
 const rows=summaries.filter(s=>s.player.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a,b)=>(metric(b,sort)??-Infinity)-(metric(a,sort)??-Infinity)||a.player.name.localeCompare(b.player.name));
 const s=rows.find(s=>s.player.id===selected)??rows.find(s=>s.appearances>0)??rows[0],recognition=usePlayerRecognition(s?.player.id??'');
 if(!summaries.length)return <Empty>Aucun joueur pour le moment.</Empty>;
 const header=sourceAt(hudTemplates.playersMenu,'0'),row=sourceAt(hudTemplates.playersMenu,'1'),footer=sourceAt(hudTemplates.playersMenu,'7');
 if(!s)return <><input aria-label="Rechercher un joueur" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un joueur…"/><Empty>Aucun joueur trouvé.</Empty></>;
 const division=divisionFor(s.player.id,population)?.name.toUpperCase()??'—',last=s.history.at(-1),badge=recognition.row?.main[0];
 const fact=facts(summaries).find(f=>f.playerId===s.player.id)?.text??`${s.player.name} : ${s.appearances} matchs, ${s.wins} victoires sur cette période.`;
 const bestGoals=s.form.flatMap(f=>f.participant.stats.goals==null?[]:[f.participant.stats.goals]);
 const duo=duos(summaries,matches,1).find(d=>d.a.id===s.player.id||d.b.id===s.player.id);
 const focus:Slots={'0.1.1.0':division,'0.1.1.1':`ELO ${s.elo}`,'0.1.1.2':s.player.archived?'ARCHIVÉ':badge?.name.toUpperCase()??'JOUEUR ACTIF','0.1.2':s.player.name,'0.1.3':`${seasonName.toUpperCase()} · ${s.appearances} MATCHS · ${fmt(s.stats.goals,0)} BUTS`,'0.1.4':fact};
 const card:Slots={'0.0.0':fmt(power(s.player,s.elo),0),'0.0.1':`ELO ${s.elo}`,'0.1':division,'1':s.player.photo?<img src={s.player.photo} alt={s.player.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:s.player.name.slice(0,2).toUpperCase(),'2':s.player.name,'3.0.0':fmt(s.stats.goals,0),'3.1.0':fmt(s.stats.assists,0),'3.2.0':s.appearances};
 const scale=Math.min(1,width/616),geometry:Slots={'13.0':'BADGE PRINCIPAL','13.1':badge?.name??'AUCUN BADGE ACTIF','14.1':bestGoals.length?`${fmt(Math.max(...bestGoals),0)} buts · 1 match`:'Non observé','15.1':duo?`${duo.a.id===s.player.id?duo.b.name:duo.a.name} · ${duo.matches} matchs`:'Pas encore de duo','17':'VOIR LES BADGES'};
 Object.entries(card).forEach(([path,value])=>geometry['12.0.'+path]=value);
 focus['1']=<div style={{height:380*scale}}><SourceTemplate node={sourceAt(hudTemplates.playersFocus,'1')} slots={geometry} props={{'':{style:{width:616,transform:`scale(${scale})`,transformOrigin:'top left',marginTop:0}},'12.0':{as:'a',href:'/joueurs/'+s.player.id,'aria-label':'Profil de '+s.player.name},'16':{as:'a',href:'/joueurs/'+s.player.id+'?tab=profile','aria-label':'Voir les badges de '+s.player.name}}}/></div>;
 const stats:Slots={'0.1':seasonName.toUpperCase(),'3.1.1':fact},sp:Props={'4.0':{as:'a',href:'/joueurs/'+s.player.id+'?tab=compare'},'4.1':{as:'a',href:'/joueurs/'+s.player.id}};
 ['goals','assists','rating','elo','shotsOnTarget'].forEach((key,i)=>{const value=metric(s,key),known=summaries.flatMap(p=>metric(p,key)==null?[]:[metric(p,key)!]),max=Math.max(1,...known),average=known.length?known.reduce((n,v)=>n+v,0)/known.length:null;
  stats[`1.${i}.0.1.${i===4?1:0}`]=fmt(value,key==='rating'?2:0);stats[`1.${i}.0.1.${i===4?0:1}`]=key==='elo'&&last?`${last.delta>0?'+':''}${last.delta}`:'';
  if(i!==4){sp[`1.${i}.1.0`]={style:{width:`${value==null?0:value/max*100}%`}};sp[`1.${i}.1.0.0`]={style:{width:'100%'}};sp[`1.${i}.1.0.1`]={style:{display:'none'}};sp[`1.${i}.1.1`]={style:{left:`${(average??0)/max*100}%`,display:average==null?'none':'block'}};}
  else stats['1.4.1']=<SourceTemplate node={sourceAt(hudTemplates.playersStats,'1.0.1')} props={{'0':{style:{width:`${value==null?0:value/max*100}%`}},'0.0':{style:{width:'100%'}},'0.1':{style:{display:'none'}},'1':{style:{left:`${(average??0)/max*100}%`,display:average==null?'none':'block'}}}}/>;
 });
 return <section className="source-players-menu"><div className="controls filterrow"><input aria-label="Rechercher un joueur" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un joueur…"/><Picker label="Trier les joueurs" value={sort} onChange={setSort} options={[{value:'elo',label:'ELO'},{value:'goals',label:'Buts'},{value:'rating',label:'Rating'}]}/></div><div className="source-players-layout"><SourceTemplate name="playersMenu" slots={{'':<><SourceTemplate node={header} slots={{'0':`JOUEURS · ${rows.length}`,'1':`TRI : ${sort.toUpperCase()}`}}/>{rows.map(p=><SourceTemplate key={p.player.id} node={{...row,tag:'button'}} slots={{'0':fmt(power(p.player,p.elo),0),'1.0':p.player.name,'1.1':`${divisionFor(p.player.id,population)?.name.toUpperCase()??'—'} · ${fmt(p.stats.goals,0)} BUTS`,'2':p.history.at(-1)?`${p.history.at(-1)!.delta>0?'▲':'▼'} ${Math.abs(p.history.at(-1)!.delta)}`:'—'}} props={{'':{type:'button',className:'prow'+(s.player.id===p.player.id?' sel':''),'aria-pressed':s.player.id===p.player.id,onClick:()=>setSelected(p.player.id),style:{background:s.player.id===p.player.id?'#12290F':'#121512',borderLeftColor:s.player.id===p.player.id?'#56B947':'transparent',boxShadow:s.player.id===p.player.id?'0 0 0 1px #56B947 inset':'none'}},'2':{style:{color:(p.history.at(-1)?.delta??0)<0?'#E5484D':'#56B947'}}}}/>)}<SourceTemplate node={footer} slots={{'0':`${rows.length} / ${summaries.length} joueurs`}}/></>}}/><div ref={scene}><SourceTemplate name="playersFocus" slots={focus} props={{'1':{style:{height:380*scale}}}}/></div><SourceTemplate name="playersStats" slots={stats} props={sp}/></div><Link className="textbutton" href={'/joueurs/'+s.player.id}>Ouvrir le profil de {s.player.name} ↗</Link></section>;
}
