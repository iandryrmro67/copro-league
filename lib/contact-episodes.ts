import type {MatchEvent} from './model.ts';
/** Partial episodes evidenced by observed actions, never an estimate of all physical touches. */
export function contactEpisodes(events:MatchEvent[]):Record<string,number>{
 const counts:Record<string,number>={};let holder='',sequence:unknown=null;
 const touch=(id:string)=>{if(!id)return;if(holder!==id)counts[id]=(counts[id]??0)+1;holder=id;};
 for(const e of events.map((e,i)=>({e,i})).sort((a,b)=>(a.e.timestamp??Infinity)-(b.e.timestamp??Infinity)||a.i-b.i).map(x=>x.e)){
  if(e.timestamp==null){holder='';sequence=null;continue;}
  if(sequence!==e.metadata.sequenceId){holder='';sequence=e.metadata.sequenceId;}
  const o=e.metadata.outcome,t=(e.metadata.tags??[]) as string[],opp=String(e.metadata.opponentPlayerId??'');
  if(['PRESSURE','FOUL','DUEL'].includes(e.type))continue;
  if(e.type==='TACKLE'&&o!=='WON')continue;
  if(['SAVE','BLOCK','INTERCEPTION'].includes(e.type)&&opp)touch(opp);
  if(['PASS','SHOT','DRIBBLE','TOUCH','TURNOVER','RECOVERY','INTERCEPTION','SAVE','BLOCK','CLEARANCE','OWN_GOAL','TACKLE'].includes(e.type))touch(e.playerId);
  if(e.type==='PASS'&&o==='COMPLETED'&&e.relatedPlayerId)touch(e.relatedPlayerId);
  else if(e.type==='PASS'&&t.includes('INTERCEPTED')||e.type==='SHOT'&&['ON_TARGET','BLOCKED'].includes(String(o)))touch(opp);
  if(['SHOT','TURNOVER','OWN_GOAL','CLEARANCE'].includes(e.type)||t.includes('POSSESSION_LOST')||e.type==='PASS'&&o==='FAILED')holder='';
 }
 return counts;
}
