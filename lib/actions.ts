import type {MatchEvent} from './model.ts';
export type Point={x:number;y:number};
export type Scene={players:Record<string,Point>;ball:Point|null};
export const actionDefinitions:Record<string,{label:string;outcomes:string[];tags:string[];shortcut?:string}>={
SHOT:{label:'Tir',outcomes:['GOAL','ON_TARGET','OFF_TARGET','BLOCKED','WOODWORK'],tags:['PENALTY','FREE_KICK','RIGHT_FOOT','LEFT_FOOT','HEADER'],shortcut:'s'},
PASS:{label:'Passe',outcomes:['COMPLETED','FAILED'],tags:['KEY_PASS','ASSIST','LONG_PASS','CROSS','THROUGH_BALL'],shortcut:'p'},
DRIBBLE:{label:'Dribble',outcomes:['COMPLETED','FAILED'],tags:['FOUL_WON'],shortcut:'d'},
DUEL:{label:'Duel',outcomes:['WON','LOST'],tags:['GROUND','AERIAL'],shortcut:'u'},
TACKLE:{label:'Tacle',outcomes:['WON','LOST','FOUL'],tags:['BALL_RECOVERED','BALL_OUT','OPPONENT_KEEPS_BALL'],shortcut:'t'},
INTERCEPTION:{label:'Interception',outcomes:[],tags:[],shortcut:'i'},RECOVERY:{label:'Récupération',outcomes:[],tags:['LOOSE_BALL','OPPONENT_ERROR','AFTER_DUEL','PRESSING'],shortcut:'r'},
BLOCK:{label:'Tir bloqué',outcomes:[],tags:[]},CLEARANCE:{label:'Dégagement',outcomes:[],tags:['FOOT','HEADER']},TURNOVER:{label:'Perte de balle',outcomes:[],tags:['BAD_PASS','BAD_TOUCH','LOST_DRIBBLE','DISPOSSESSED','OUT_OF_PLAY']},
FOUL:{label:'Faute',outcomes:['SIMPLE'],tags:[],shortcut:'f'},TOUCH:{label:'Touche',outcomes:[],tags:[]},SAVE:{label:'Arrêt',outcomes:['SAVED_HELD','SAVED_PARRIED'],tags:[]}};
export const actionLabels:Record<string,string>={GOAL:'But',ON_TARGET:'Cadré',OFF_TARGET:'Non cadré',BLOCKED:'Bloqué',WOODWORK:'Montant',COMPLETED:'Réussie',FAILED:'Ratée',WON:'Gagné',LOST:'Perdu',FOUL:'Faute',SIMPLE:'Simple',SAVED_HELD:'Capté',SAVED_PARRIED:'Repoussé',PENALTY:'Penalty',FREE_KICK:'Coup franc',RIGHT_FOOT:'Pied droit',LEFT_FOOT:'Pied gauche',HEADER:'Tête',KEY_PASS:'Passe clé',ASSIST:'Décisive',LONG_PASS:'Longue',CROSS:'Centre',THROUGH_BALL:'En profondeur',FOUL_WON:'Faute subie',GROUND:'Au sol',AERIAL:'Aérien',BALL_RECOVERED:'Ballon récupéré',BALL_OUT:'Ballon sorti',OPPONENT_KEEPS_BALL:'Adversaire conserve',LOOSE_BALL:'Ballon libre',OPPONENT_ERROR:'Erreur adverse',AFTER_DUEL:'Après duel',PRESSING:'Pressing',FOOT:'Pied',BAD_PASS:'Mauvaise passe',BAD_TOUCH:'Mauvais contrôle',LOST_DRIBBLE:'Dribble perdu',DISPOSSESSED:'Dépossédé',OUT_OF_PLAY:'Sortie'};
export const annotationRules={interceptionIsRecovery:true,boxStart:85,boxLeft:25,boxRight:75,finalThird:200/3,pitchLength:40,pitchWidth:20};
export const isV2=(e:MatchEvent)=>e.metadata.schemaVersion===2;
export const isGoal=(e:MatchEvent)=>e.type==='GOAL'||(isV2(e)&&e.type==='SHOT'&&e.metadata.outcome==='GOAL');
export function eventLabel(e:MatchEvent){return isV2(e)?`${actionDefinitions[e.type]?.label??e.type}${e.metadata.outcome?' · '+(actionLabels[String(e.metadata.outcome)]??e.metadata.outcome):''}`:e.type.replaceAll('_',' ')}
export function canonicalEffects(e:MatchEvent,events:MatchEvent[]):[string,string][]{
 const out:[string,string][]=[],a=e.playerId,b=String(e.metadata.opponentPlayerId??''),mate=e.relatedPlayerId,o=e.metadata.outcome,t=(e.metadata.tags??[]) as string[],has=(s:string)=>t.includes(s),add=(k:string,id=a)=>{if(id)out.push([id,k])};
 const linked=events.find(x=>x.id===e.metadata.linkedEventId);const pos=e.metadata.position as Point|undefined;
 const recovery=()=>{add('recoveries');if(pos&&pos.x>=annotationRules.finalThird)add('highRecoveries')};
 switch(e.type){
 case'SHOT':add('shots');if(o==='GOAL'||o==='ON_TARGET')add('shotsOnTarget');if(o==='GOAL'){add('goals');if(mate)add('assists',mate)}if(o==='BLOCKED')add('blocks',b);break;
 case'PASS':add('passesAttempted');if(o==='COMPLETED')add('passesCompleted');for(const [tag,k]of [['LONG_PASS','longPasses'],['CROSS','crosses']])if(has(tag)){add(k+'Attempted');if(o==='COMPLETED')add(k+'Completed')}if(has('KEY_PASS')){add('keyPasses');add('chancesCreated')}if(has('ASSIST')&&!events.some(x=>isGoal(x)&&x.metadata.linkedEventId===e.id&&x.relatedPlayerId===a))add('assists');break;
 case'DRIBBLE':add('dribblesAttempted');if(o==='COMPLETED'){add('dribblesCompleted');add('dribbledPast',b)}if(has('FOUL_WON')){add('foulsWon');add('fouls',b)}break;
 case'DUEL':add('duelsAttempted');add('duelsAttempted',b);add('duelsWon',o==='WON'?a:b);if(has('AERIAL')){add('aerialDuelsAttempted');add('aerialDuelsAttempted',b);add('aerialDuelsWon',o==='WON'?a:b)}break;
 case'TACKLE':add('tackles');if(o==='FOUL'){add('fouls');add('foulsWon',b)}if(has('BALL_RECOVERED'))recovery();break;
 case'INTERCEPTION':add('interceptions');if(annotationRules.interceptionIsRecovery)recovery();break;
 case'RECOVERY':recovery();break;
 case'BLOCK':if(!(linked&&isV2(linked)&&linked.type==='SHOT'&&linked.metadata.outcome==='BLOCKED'&&linked.metadata.opponentPlayerId===a))add('blocks');break;
 case'CLEARANCE':add('clearances');break;case'TURNOVER':add('turnovers');break;
 case'FOUL':add('fouls');add('foulsWon',b);break;
 case'TOUCH':add('touches');if(pos&&pos.x>=85&&pos.y>=25&&pos.y<=75)add('boxTouches');break;
 case'SAVE':add('saves');break;
 }return out;
}
// Zero-valued result families remain tracked after edits and deletions.
export function canonicalKeys(e:MatchEvent,events:MatchEvent[]){const keys=canonicalEffects(e,events).map(([,k])=>k);for(const [tag,k]of [['LONG_PASS','longPasses'],['CROSS','crosses']])if(e.type==='PASS'&&(e.metadata.tags as string[]??[]).includes(tag))keys.push(k+'Attempted',k+'Completed');const families:Record<string,string[]>={SHOT:['shots','shotsOnTarget','goals'],PASS:['passesAttempted','passesCompleted'],DRIBBLE:['dribblesAttempted','dribblesCompleted'],DUEL:['duelsAttempted','duelsWon'],RECOVERY:['recoveries',...(e.metadata.position?['highRecoveries']:[])],INTERCEPTION:['interceptions',...(annotationRules.interceptionIsRecovery?['recoveries',...(e.metadata.position?['highRecoveries']:[])]:[])],TOUCH:['touches',...(e.metadata.position?['boxTouches']:[])]};return [...new Set([...keys,...(families[e.type]??[])])]}

/** Credit only the two most recent passes in an uninterrupted, explicitly named sequence. */
export function secondaryAssistCredits(events:MatchEvent[]):{goalId:string;playerId:string;passId:string}[]{
 const ordered=events.map((event,index)=>({event,index})).filter(x=>x.event.timestamp!=null).sort((a,b)=>a.event.timestamp!-b.event.timestamp!||a.index-b.index).map(x=>x.event);
 const credits:{goalId:string;playerId:string;passId:string}[]=[];
 for(let i=0;i<ordered.length;i++){
  const goal=ordered[i],seq=goal.metadata.sequenceId;
  if(!isV2(goal)||!isGoal(goal)||!goal.relatedPlayerId||typeof seq!=='string'||!seq)continue;
  if(events.some(e=>e.metadata.sequenceId===seq&&e.timestamp==null))continue;
  const passes:MatchEvent[]=[];let holder=goal.playerId;
  for(let j=i-1;j>=0&&passes.length<2;j--){
   const e=ordered[j],o=e.metadata.outcome,tags=(e.metadata.tags??[]) as string[];
   // Opponent possession or any restart/loss ends the chain, even when assigned another sequence.
   const opponentPossession=e.team!==goal.team&&( ['PASS','TOUCH','RECOVERY','INTERCEPTION','SAVE','CLEARANCE','SHOT','TURNOVER'].includes(e.type)||(e.type==='DUEL'&&o==='WON')||(e.type==='TACKLE'&&(o==='WON'||tags.includes('BALL_RECOVERED')))||(e.type==='DRIBBLE'&&o==='COMPLETED'));
   const broken=!isV2(e)||e.metadata.sequenceId!==seq||opponentPossession||['SHOT','FOUL','RECOVERY','INTERCEPTION','TURNOVER','CLEARANCE','SAVE'].includes(e.type)||(e.team===goal.team&&((e.type==='PASS'&&o!=='COMPLETED')||(e.type==='DRIBBLE'&&o==='FAILED')||(e.type==='DUEL'&&o==='LOST')||(e.type==='TACKLE'&&o==='LOST')));
   if(broken)break;
   if(e.team===goal.team&&['TOUCH','DRIBBLE'].includes(e.type)&&e.playerId!==holder)break;
   if(e.type==='PASS'){if(e.relatedPlayerId!==holder)break;passes.push(e);holder=e.playerId;}
  }
  const [assist,secondary]=passes;
  if(!assist||!secondary||assist.team!==goal.team||secondary.team!==goal.team)continue;
  if(assist.playerId!==goal.relatedPlayerId||assist.relatedPlayerId!==goal.playerId||secondary.relatedPlayerId!==assist.playerId)continue;
  if(secondary.playerId===goal.playerId||secondary.playerId===assist.playerId)continue;
  if(goal.metadata.linkedEventId&&goal.metadata.linkedEventId!==assist.id)continue;
  credits.push({goalId:goal.id,playerId:secondary.playerId,passId:secondary.id});
 }
 return credits;
}
