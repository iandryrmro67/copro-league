import type {Match,MatchEvent} from './model.ts';
import {isGoal,eventLabel} from './actions.ts';
import {beginAnalysis,previousPass} from './match-analysis.ts';

export const quickActions={
 goal:{label:'But',type:'SHOT',outcome:'GOAL',icon:'⚽'},
 'on-target':{label:'Tir cadré',type:'SHOT',outcome:'ON_TARGET',icon:'◎'},
 'off-target':{label:'Tir non cadré',type:'SHOT',outcome:'OFF_TARGET',icon:'↗'},
 'failed-pass':{label:'Passe ratée',type:'PASS',outcome:'FAILED',icon:'↛'},
 recovery:{label:'Récupération',type:'RECOVERY',outcome:'',icon:'↶'},
 interception:{label:'Interception',type:'INTERCEPTION',outcome:'',icon:'↔'},
 turnover:{label:'Perte de balle',type:'TURNOVER',outcome:'',icon:'×'},
 clearance:{label:'Dégagement',type:'CLEARANCE',outcome:'',icon:'↑'},
 pass:{label:'Passe réussie',type:'PASS',outcome:'COMPLETED',icon:'→'},
} as const;
export type QuickAction=keyof typeof quickActions;
export type AnnotationMoment={timestamp:number;videoTimestamp:number};

export function restoreAnnotation(current:Match,snapshot:Match):Match{
 const restored=beginAnalysis({...current,events:structuredClone(snapshot.events)});
 return {...restored,analysis:{...restored.analysis!,status:'in_progress',ranges:[],session:{...(snapshot.analysis?.session??restored.analysis!.session),videoTime:restored.analysis!.session.videoTime}}};
}

export function annotationMoment({videoTime,offset,stamp,useVideo}:{videoTime:number;offset:number;stamp:string;useVideo:boolean}):AnnotationMoment{
 if(useVideo){
  if(!Number.isFinite(videoTime)||!Number.isFinite(offset))throw Error('Temps vidéo indisponible.');
  if(videoTime<offset)throw Error('La vidéo est avant le début du match. Ajustez le décalage.');
  return {timestamp:Math.floor(videoTime-offset),videoTimestamp:videoTime};
 }
 if(!/^\d{1,4}:[0-5]\d$/.test(stamp))throw Error('Temps attendu : mm:ss.');
 const [minutes,seconds]=stamp.split(':').map(Number);
 return {timestamp:minutes*60+seconds,videoTimestamp:Math.max(0,minutes*60+seconds+offset)};
}

export function recordQuickAction(input:Match,{preset,playerId,recipientId,sequenceId,moment}:{preset:QuickAction;playerId:string;recipientId?:string;sequenceId:string;moment:AnnotationMoment}){
 const participant=input.participants.find(p=>p.playerId===playerId);
 if(!participant?.team)throw Error('Sélectionnez un joueur affecté à une équipe.');
 if(!Number.isFinite(moment.timestamp)||moment.timestamp<0||!Number.isFinite(moment.videoTimestamp)||moment.videoTimestamp<0)throw Error('Temps de l’action invalide.');
 const action=quickActions[preset];
 if(!action)throw Error('Action inconnue.');
 if(preset==='pass'){
  const recipient=input.participants.find(p=>p.playerId===recipientId);
  if(!recipient||recipient.team!==participant.team||recipient.playerId===playerId)throw Error('Sélectionnez un autre partenaire de la même équipe.');
 }
 const pass=action.type==='SHOT'?previousPass(input,playerId,sequenceId,moment.timestamp):null;
 const now=new Date().toISOString();
 const event:MatchEvent={id:crypto.randomUUID(),playerId,team:participant.team,type:action.type,timestamp:moment.timestamp,
  relatedPlayerId:preset==='pass'?recipientId!:preset==='goal'?pass?.playerId??null:null,
  metadata:{schemaVersion:2,atomic:true,sequenceId,outcome:action.outcome||null,tags:[],opponentPlayerId:null,
   linkedEventId:pass?.id??null,position:null,endPosition:null,videoTimestamp:moment.videoTimestamp,createdAt:now,updatedAt:now}};
 const ended=['RECOVERY','INTERCEPTION','TURNOVER','CLEARANCE'].includes(action.type)||preset==='goal';
 const nextSequence=ended?crypto.randomUUID():sequenceId;
 const m=beginAnalysis({...input,events:[...input.events,event]});
 return {match:{...m,analysis:{...m.analysis!,status:'in_progress' as const,ranges:m.analysis!.status==='validated'?[]:m.analysis!.ranges,session:{...m.analysis!.session,sequenceId:nextSequence}}},event,
  nextActor:preset==='pass'?recipientId!:playerId,sequenceId:nextSequence};
}

export function eventVideoTime(event:MatchEvent,offset:number):number|null{
 if(event.timestamp==null)return null;
 const stored=event.metadata.videoTimestamp;
 return typeof stored==='number'&&Number.isFinite(stored)?Math.max(0,stored):Math.max(0,event.timestamp+offset);
}

export type ReviewRange={start:number;end:number};
export function reviewProgress(range:ReviewRange,time:number,awaitingSeek:boolean){
 if(awaitingSeek&&(Math.abs(time-range.start)>.75||time>=range.end))return 'waiting';
 return time>=range.end?'finished':'playing';
}
export function reviewRanges(events:MatchEvent[],offset:number,before=4,after=3,duration=Infinity):ReviewRange[]{
 const ranges=events.map(e=>eventVideoTime(e,offset)).filter((t):t is number=>t!=null)
  .map(t=>({start:Math.max(0,t-before),end:Math.min(duration,t+after)})).filter(r=>r.end>r.start).sort((a,b)=>a.start-b.start);
 const merged:ReviewRange[]=[];
 for(const range of ranges){const prev=merged.at(-1);if(prev&&range.start<=prev.end)prev.end=Math.max(prev.end,range.end);else merged.push({...range});}
 return merged;
}

export type ActionFilters={player?:string;team?:string;type?:string;query?:string};
export function filterActions(events:MatchEvent[],filters:ActionFilters,name:(id:string)=>string=id=>id){
 return events.filter(e=>{
  if(filters.team&&filters.team!=='all'&&e.team!==filters.team)return false;
  if(filters.player&&filters.player!=='all'&&![e.playerId,e.relatedPlayerId,e.metadata.opponentPlayerId].includes(filters.player))return false;
  const type=filters.type;
  if(type&&type!=='all'){
   if(type==='GOAL'){if(!isGoal(e))return false;}
   else if(type==='ASSIST'){if(isGoal(e)){if(!e.relatedPlayerId||filters.player&&filters.player!=='all'&&e.relatedPlayerId!==filters.player)return false;}else if(e.type!=='ASSIST')return false;}
   else if(type==='SHOT'){if(!isGoal(e)&&!['SHOT','SHOT_ON_TARGET','SHOT_OFF_TARGET','SHOT_BLOCKED'].includes(e.type))return false;}
   else if(type==='PASS'){if(!['PASS','PASS_ATTEMPT','PASS_COMPLETED','PASS_FAILED'].includes(e.type))return false;}
   else if(e.type!==type)return false;
  }
  if(filters.query){const text=[name(e.playerId),e.relatedPlayerId?name(e.relatedPlayerId):'',e.metadata.opponentPlayerId?name(String(e.metadata.opponentPlayerId)):'',e.type,eventLabel(e),e.metadata.sequenceId].join(' ').toLocaleLowerCase('fr');if(!text.includes(filters.query.toLocaleLowerCase('fr')))return false;}
  return true;
 }).sort((a,b)=>(a.timestamp??Infinity)-(b.timestamp??Infinity));
}

export function timelineWindow(duration:number,center:number,span:number){
 const length=Math.max(60,Number.isFinite(duration)?duration:60),width=span>0?Math.min(span,length):length;
 const start=Math.max(0,Math.min(length-width,center-width/2));
 return {start,end:start+width};
}
