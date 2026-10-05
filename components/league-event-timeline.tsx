'use client';
import {useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,CircleDot,Play,Target,Trash2} from 'lucide-react';
import type {League,Match,MatchEvent} from '@/lib/model';
import {teamName} from '@/lib/model';
import {actionDefinitions,eventLabel,isGoal,isOwnGoal,scoringTeam} from '@/lib/actions';
import {filterActions,timelineWindow,type ActionFilters} from '@/lib/annotation-controls';
import {formatVideoTime} from './league-video';

type Props={match:Match;data:League;time:number;selected:string|null;filters:ActionFilters;onFilters:(filters:ActionFilters)=>void;onSeek:(seconds:number)=>void;onSelect:(event:MatchEvent)=>void;onReview:(events:MatchEvent[])=>void;onRemove:(id:string)=>void;canReview:boolean;compact?:boolean;onExpand?:()=>void};
export function EventTimeline({match:m,data,time,selected,filters,onFilters,onSeek,onSelect,onReview,onRemove,canReview,compact=false,onExpand}:Props){
 const [newest,setNewest]=useState(true);
 const [span,setSpan]=useState(0),[center,setCenter]=useState<number|null>(null),[limit,setLimit]=useState(80);
 const name=(id:string)=>data.players.find(p=>p.id===id)?.name??id;
 const events=useMemo(()=>filterActions(m.events,compact?{}:filters,id=>data.players.find(p=>p.id===id)?.name??id),[m.events,filters,data.players,compact]);
 const duration=Math.max(60,m.duration*60,time,...m.events.map(e=>e.timestamp??0));
 const window=timelineWindow(duration,center??time,compact?0:span),width=window.end-window.start;
 const visible=events.filter(e=>e.timestamp!=null&&e.timestamp>=window.start&&e.timestamp<=window.end);
 const update=(key:keyof ActionFilters,value:string)=>{setLimit(80);onFilters({...filters,[key]:value});};
 const label=(e:MatchEvent)=>isOwnGoal(e)?'CSC · but pour '+teamName(m,scoringTeam(e)):e.type==='FOUL'&&e.metadata.schemaVersion===2?'Faute commise':eventLabel(e);
 const eventText=(e:MatchEvent)=>`${formatVideoTime(e.timestamp??0)} · ${name(e.playerId)} · ${label(e)}`;
 const hasFilters=Object.values(filters).some(v=>v&&v!=='all');
 return <section className={'match-timeline '+(compact?'timeline-compact':'timeline-review')} aria-label="Timeline des actions">
  <div className="timeline-heading"><div><h3>{compact?'Timeline':'Timeline · actions du match'}</h3><span>{compact?m.events.length:events.length} action{events.length===1?'':'s'}{!compact&&hasFilters?' sur '+m.events.length:''}</span></div>
   {compact?<button type="button" className="textbutton" onClick={onExpand}>Tout revoir<ArrowUpRight size={15} aria-hidden="true"/></button>:<button type="button" className="button primary" disabled={!canReview||!events.some(e=>e.timestamp!=null)} onClick={()=>onReview(events)}><Play size={14} aria-hidden="true"/>Lire la sélection</button>}
  </div>
  {!compact&&<div className="timeline-filters">
   <label>Équipe<select aria-label="Filtrer les actions par équipe" value={filters.team??'all'} onChange={e=>update('team',e.target.value)}><option value="all">Les deux équipes</option>{(['A','B'] as const).map(side=><option key={side} value={side}>{teamName(m,side)}</option>)}</select></label>
   <label>Joueur<select aria-label="Filtrer les actions par joueur" value={filters.player??'all'} onChange={e=>update('player',e.target.value)}><option value="all">Tous les joueurs</option>{m.participants.map(p=><option key={p.playerId} value={p.playerId}>{name(p.playerId)}</option>)}</select></label>
   <label>Action<select aria-label="Filtrer les actions par type" value={filters.type??'all'} onChange={e=>update('type',e.target.value)}><option value="all">Toutes les actions</option><option value="GOAL">Buts</option><option value="ASSIST">Passes décisives</option>{Object.entries(actionDefinitions).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select></label>
   <label>Recherche<input aria-label="Rechercher un événement" placeholder="Nom ou action…" value={filters.query??''} onChange={e=>update('query',e.target.value)}/></label>
   {hasFilters&&<button type="button" className="textbutton" onClick={()=>{onFilters({});setLimit(80);}}>Tout afficher</button>}
  </div>}
  {!compact&&<div className="timeline-navigation">
   <select aria-label="Zoom de la timeline" value={span} onChange={e=>{setSpan(Number(e.target.value));setCenter(null);}}><option value={0}>Tout le match</option><option value={600}>10 minutes</option><option value={300}>5 minutes</option><option value={120}>2 minutes</option><option value={30}>30 secondes</option></select>
   <button type="button" className="timeline-icon-button" aria-label="Période précédente" disabled={!span||window.start===0} onClick={()=>setCenter(window.start+width/2-width*.8)}><ArrowLeft size={15} aria-hidden="true"/></button>
   <span>{formatVideoTime(window.start)} — {formatVideoTime(window.end)}</span>
   <button type="button" className="timeline-icon-button" aria-label="Période suivante" disabled={!span||window.end>=duration} onClick={()=>setCenter(window.start+width/2+width*.8)}><ArrowRight size={15} aria-hidden="true"/></button>
   {center!==null&&<button type="button" className="textbutton" onClick={()=>setCenter(null)}>Suivre la lecture</button>}
  </div>}
  <div className="timeline-plot">
   <div className="timeline-axis">{Array.from({length:5},(_,i)=><span key={i}>{formatVideoTime(window.start+width*i/4)}</span>)}</div>
   {(['A','B'] as const).map(side=>{
    const lane=visible.filter(e=>e.team===side),buckets=new Map<number,MatchEvent[]>();for(const e of lane){const bucket=Math.min(7,Math.floor((e.timestamp!-window.start)/width*8));buckets.set(bucket,[...(buckets.get(bucket)??[]),e]);}
    return <div className={'timeline-lane team-'+side.toLowerCase()} key={side}><strong>{teamName(m,side)}</strong>
     <div className="timeline-track" onPointerDown={e=>{if((e.target as HTMLElement).closest('button'))return;const rect=e.currentTarget.getBoundingClientRect();onSeek(window.start+Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width))*width);}}>
      {time>=window.start&&time<=window.end&&<i className="timeline-playhead" aria-hidden="true" style={{left:`${(time-window.start)/width*100}%`}}/>}
      {[...buckets.entries()].map(([bucket,group])=>{const e=group[0],x=group.length>1?(bucket+.5)/8*100:Math.max(3,Math.min(97,(e.timestamp!-window.start)/width*100)),Icon=isGoal(e)?CircleDot:e.type.startsWith('PASS')?ArrowRight:e.type.startsWith('SHOT')?Target:CircleDot;return <button type="button" key={bucket} aria-label={group.length>1?'Agrandir '+group.length+' actions entre '+formatVideoTime(window.start+bucket/8*width)+' et '+formatVideoTime(window.start+(bucket+1)/8*width):'Modifier '+eventText(e)} aria-pressed={group.some(e=>selected===e.id)} title={group.length>1?group.length+' actions · cliquez pour agrandir':eventText(e)} className={'timeline-marker '+(group.some(isGoal)?'goal ':'')+(group.some(e=>selected===e.id)?'selected':'')} style={{left:`${x}%`,top:8}} onClick={()=>{if(group.length===1)onSelect(e);else{setCenter(window.start+(bucket+.5)/8*width);setSpan(width>600?600:width>120?120:30);}}}>{group.length>1?<span>{group.length}</span>:<Icon size={14} aria-hidden="true"/>}</button>;})}
     </div>
    </div>;
   })}
  </div>
  <label className="timeline-scrubber"><span>Position dans le match<time>{formatVideoTime(time)}</time></span><input aria-label="Position dans le match" type="range" min={0} max={duration} step={1} value={Math.min(duration,Math.max(0,time))} onChange={e=>onSeek(Number(e.target.value))}/></label>
  {!compact&&<>
   <div className="timeline-list-heading"><p className="timeline-help">Clique sur une ligne pour la corriger. ▶ lit 4 s avant et 3 s après l’action.</p><button type="button" className="button" onClick={()=>setNewest(!newest)}>{newest?'Plus récentes d’abord':'Ordre du match'}</button></div>
   <div className="timeline-event-list">
    {(newest?[...events].reverse():events).slice(0,limit).map(e=><div key={e.id} className={'timeline-event-card '+(selected===e.id?'selected':'')}>
     <button type="button" className="timeline-event-main" onClick={()=>onSelect(e)} aria-label={'Modifier '+eventText(e)}><time>{e.timestamp==null?'—':formatVideoTime(e.timestamp)}</time><span><strong>{name(e.playerId)} · {label(e)}{e.relatedPlayerId?(isGoal(e)?' · passe de ':' → ')+name(e.relatedPlayerId):''}</strong><small>{teamName(m,e.team)}{e.metadata.opponentPlayerId?(e.type==='FOUL'?' · sur ':e.type==='PASS'&&e.metadata.outcome==='FAILED'&&e.metadata.counterpartStats?' · interceptée par ':e.type==='SHOT'&&e.metadata.outcome==='ON_TARGET'&&e.metadata.counterpartStats?' · arrêté par ':e.type==='TURNOVER'&&e.metadata.counterpartStats?' · récupéré par ':e.type==='INTERCEPTION'?' · passe de ':e.type==='SAVE'||e.type==='BLOCK'?' · tir de ':' · face à ')+name(String(e.metadata.opponentPlayerId)):''}</small></span></button>
     <button type="button" className="timeline-icon-button" disabled={!canReview||e.timestamp==null} aria-label={'Revoir '+eventText(e)} title="Revoir l’extrait" onClick={()=>onReview([e])}><Play size={14} aria-hidden="true"/></button>
     <button type="button" className="timeline-icon-button" aria-label={'Supprimer '+eventText(e)} title="Supprimer l’action" onClick={()=>onRemove(e.id)}><Trash2 size={14} aria-hidden="true"/></button>
    </div>)}
    {!events.length&&<div className="timeline-empty"><CircleDot size={22} aria-hidden="true"/><strong>{m.events.length?'Aucun résultat':'Aucune action pour le moment'}</strong><p>{m.events.length?'Modifiez les filtres pour retrouver vos actions.':'Les actions saisies apparaîtront ici.'}</p></div>}
    {events.length>limit&&<button type="button" className="button" onClick={()=>setLimit(n=>n+80)}>Afficher la suite · {events.length-limit} actions</button>}
   </div>
  </>}
 </section>;
}
