import type {Match} from './model';
import {isGoal,secondaryAssistCredits} from './actions';

/** A paired average only includes matches with an observation for both players. */
export function pairedProduction(matches:Match[],a:string,b:string,key:string){
 const observations=matches.flatMap(m=>{
  const pa=m.participants.find(p=>p.playerId===a),pb=m.participants.find(p=>p.playerId===b);
  const av=pa?.stats[key],bv=pb?.stats[key];
  return pa?.team&&pa.team===pb?.team&&av!=null&&bv!=null?[{a:av,b:bv}]:[];
 });
 const count=observations.length;
 const av=count?observations.reduce((n,v)=>n+v.a,0):null,bv=count?observations.reduce((n,v)=>n+v.b,0):null;
 const total=av==null||bv==null?null:av+bv;
 return {count,a:av,b:bv,total,average:total==null?null:total/count};
}
export function linkedAssists(matches:Match[],from:string,to:string,secondary=false):number|null {
 const observed=matches.filter(m=>secondary?m.trackedKeys.includes('secondaryAssists')||secondaryAssistCredits(m.events).length>0:m.events.some(e=>isGoal(e)&&e.relatedPlayerId));
 if(!observed.length)return null;
 return observed.reduce((n,m)=>n+(secondary?secondaryAssistCredits(m.events).filter(c=>c.playerId===from&&m.events.find(e=>e.id===c.goalId)?.playerId===to).length:m.events.filter(e=>isGoal(e)&&e.playerId===to&&e.relatedPlayerId===from).length),0);
}
