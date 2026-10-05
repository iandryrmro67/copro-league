import type {Match, Stats} from './model.ts';
import {labels} from './model.ts';
import {isGoal,isV2,canonicalEffects} from './actions.ts';
import {observedEvents} from './events.ts';

export const coverageFamilies:Record<string,string[]>={
 'Buts et assists':['goals','assists'],
 'Secondary assists':['secondaryAssists'],
 'Tirs':['shots','shotsOnTarget'],
 'Passes':['passesAttempted','passesCompleted','keyPasses','chancesCreated','longPassesAttempted','longPassesCompleted','crossesAttempted','crossesCompleted'],
 'Dribbles':['dribblesAttempted','dribblesCompleted','dribbledPast'],
 'Duels':['duelsAttempted','duelsWon','aerialDuelsAttempted','aerialDuelsWon'],
 'Défense':['tackles','interceptions','recoveries','blocks','clearances'],
 'Récupérations hautes':['highRecoveries'], 'Touches dans la surface':['boxTouches'], 'Pertes de balle':['turnovers'], 'Fautes':['fouls','foulsWon'],
 'Arrêts':['saves'], 'Touches':['touches'],
};
export const analysisLabels={not_started:'Non commencée',in_progress:'En cours',review:'À vérifier',validated:'Validée'};
export function beginAnalysis(m:Match):Match {
 if(m.analysis)return m;
 return {...m,analysis:{schemaVersion:1,status:'in_progress',mode:'highlights',completeKeys:[],ranges:[],manualSource:'Feuille de match / saisie manuelle',
 session:{sequenceId:crypto.randomUUID(),videoTime:0,offset:0},
 manualStats:Object.fromEntries(m.participants.map(p=>[p.playerId,structuredClone(p.stats)])),
 publishedEvents:structuredClone(m.events),publishedKeys:[...m.trackedKeys]}};
}
export function analysisCounts(m:Match){return observedEvents({...m,trackedKeys:m.analysis?.completeKeys??[],participants:m.participants.map(p=>({...p,stats:{}}))})}
export function annotatedScore(m:Match){return {A:m.events.filter(e=>isGoal(e)&&e.team==='A').length,B:m.events.filter(e=>isGoal(e)&&e.team==='B').length}}
export function coveredSeconds(ranges:{start:number;end:number}[]){
 let end=0,total=0;for(const r of [...ranges].sort((a,b)=>a.start-b.start)){total+=Math.max(0,r.end-Math.max(r.start,end));end=Math.max(end,r.end)}return total;
}
export type AnalysisIssue={code:string;message:string;blocking:boolean;eventId?:string};
export function reviewAnalysis(m:Match):AnalysisIssue[]{
 const issues:AnalysisIssue[]=[];const a=m.analysis;const add=(code:string,message:string,blocking=true,eventId?:string)=>issues.push({code,message,blocking,eventId});
 if(!a)return issues;
 if(!a.completeKeys.length)add('categories','Choisissez les catégories observées sur tout le match.');
 if(a.completeKeys.length&&(m.duration<1||!a.ranges.some(r=>r.start===0)||coveredSeconds(a.ranges.filter(r=>r.start>=0&&r.end<=m.duration*60))<m.duration*60))add('coverage','La totalité du match doit être couverte pour publier ces catégories. Renseignez la durée et les périodes observées.');
 if(m.status!=='finished'||m.scoreA==null||m.scoreB==null)add('result','Renseignez le résultat officiel et terminez le match avant de publier les statistiques.');
 const score=annotatedScore(m);if(a.completeKeys.includes('goals')&&(score.A!==m.scoreA||score.B!==m.scoreB))add('score',`Score officiel ${m.scoreA??'—'}–${m.scoreB??'—'} ; buts annotés ${score.A}–${score.B}. Corrigez cet écart.`);
 const used=new Set<string>();
 for(const e of m.events){
  if(e.timestamp==null)add('time','Temps inconnu : action conservée dans l’historique.',false,e.id);
  if(e.timestamp!=null&&m.duration>0&&e.timestamp>m.duration*60)add('time','Action au-delà de la durée du match.',true,e.id);
  const linkedId=e.metadata.linkedEventId;if(linkedId){
   const linked=m.events.find(x=>x.id===linkedId);
   if(!linked||linked.timestamp==null||e.timestamp==null||linked.timestamp>e.timestamp||linked.metadata.sequenceId!==e.metadata.sequenceId)add('link','Lien hors de la séquence ou dans le mauvais ordre.',true,e.id);
   if(e.type==='SHOT'){if(used.has(String(linkedId)))add('duplicate','Une même passe est liée à plusieurs tirs.',true,e.id);used.add(String(linkedId));}
  }
  if(isV2(e)&&e.type==='PASS'&&(e.metadata.tags as string[]??[]).includes('ASSIST')&&!m.events.some(g=>isGoal(g)&&g.relatedPlayerId===e.playerId&&g.metadata.sequenceId===e.metadata.sequenceId&&g.timestamp!=null&&e.timestamp!=null&&g.timestamp>=e.timestamp))add('assist','Passe déclarée décisive sans but correspondant.',true,e.id);
  if(a.completeKeys.includes('highRecoveries')&&canonicalEffects(e,m.events).some(([id,key])=>key==='recoveries'&&id!==e.playerId))add('position','Position du récupérateur inconnue : renseignez une interception ou récupération liée au même instant pour valider les récupérations hautes.',true,e.id);
  if(e.metadata.position==null){const spatial=(a.completeKeys.includes('highRecoveries')&&(['RECOVERY','INTERCEPTION'].includes(e.type)||(e.type==='TACKLE'&&(e.metadata.tags as string[]??[]).includes('BALL_RECOVERED'))))||(a.completeKeys.includes('boxTouches')&&e.type==='TOUCH');add('position',spatial?'Position requise pour valider la catégorie de zone.':'Position inconnue : exclue des cartes.',spatial,e.id);}
 }
 return issues;
}
export function publishAnalysis(input:Match):Match {
 const m=beginAnalysis(structuredClone(input));const blocking=reviewAnalysis(m).filter(i=>i.blocking);
 if(blocking.length)throw Error(blocking.map(i=>i.message).join(' · '));
 const observed=analysisCounts(m),a=m.analysis!;
 m.participants=m.participants.map(p=>{const stats:Stats={...p.stats};
  // Removing a previously published category restores its original manual observation.
  for(const k of a.publishedKeys??[])if(!a.completeKeys.includes(k))stats[k]=a.manualStats?.[p.playerId]?.[k]??null;
  for(const k of a.completeKeys)stats[k]=observed.participants.find(q=>q.playerId===p.playerId)?.stats[k]??0;
  return {...p,stats};});
 m.trackedKeys=[...a.completeKeys];
 m.analysis={...a,status:'validated',publishedKeys:[...a.completeKeys],publishedRanges:structuredClone(a.ranges),publishedEvents:structuredClone(m.events),publishedAt:new Date().toISOString()};
 return m;
}
export function publicMatch(m:Match):Match {
 if(!m.analysis||!m.analysis.session)return m;
 const a=m.analysis;
 // Never expose an unpublished session, manual baseline or draft scene to a visitor.
 const summary={schemaVersion:1,status:a.status,mode:a.mode,completeKeys:a.publishedKeys??[],ranges:a.publishedRanges??[],manualSource:a.manualSource,publishedAt:a.publishedAt} as Match['analysis'];
 return {...m,events:structuredClone(a.publishedEvents??[]),analysis:summary};
}
export function previousPass(m:Match,actor:string,sequence:string,time:number,editing:string|null=null){
 const preceding=[...m.events].reverse().filter(e=>e.id!==editing&&e.timestamp!=null&&e.timestamp<=time).sort((a,b)=>b.timestamp!-a.timestamp!);
 for(const e of preceding){
  if(e.metadata.sequenceId!==sequence)break;
  if(e.type==='PASS')return e.metadata.outcome==='COMPLETED'&&e.relatedPlayerId===actor&&!m.events.some(shot=>shot.id!==editing&&shot.metadata.linkedEventId===e.id)?e:null;
  if(['TURNOVER','FOUL','RECOVERY','INTERCEPTION','SHOT','SAVE','CLEARANCE'].includes(e.type)||(e.metadata.tags as string[]??[]).includes('POSSESSION_LOST'))break;
  if(['TOUCH','DRIBBLE'].includes(e.type)&&(e.playerId!==actor||e.metadata.outcome==='FAILED'))break;
 }
 return null;
}
export function statProvenance(m:Match,key:string){return (m.analysis?.publishedKeys??(m.analysis?.publishedAt?m.analysis.completeKeys:[]))?.includes(key)||(!m.analysis&&m.trackedKeys.includes(key))?'Timeline validée':m.analysis?.manualSource||'Feuille de match'}
export function coverageText(m:Match){const a=m.analysis;if(!a)return 'Données historiques : couverture non documentée.';return a.publishedAt?`${a.publishedKeys?.length??a.completeKeys.length} catégories validées · ${Math.round(coveredSeconds(a.publishedRanges??a.ranges)/60)} min observées. ${a.status!=='validated'?'Correction en cours ; dernières statistiques validées affichées.':''}`:'Analyse en cours ; statistiques de la feuille de match affichées.'}
export const categoryNames=(keys:string[])=>keys.map(k=>labels[k]??k).join(', ');
