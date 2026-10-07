import type {Match,Stats} from './model.ts';
import {canonicalEffects,isV2} from './actions.ts';

export const ratingV2Config={
 version:'v2.0',base:6,min:3,max:10,minPeers:3,
 minActions:{finition:3,creation:3,passes:5,progression:5,defense:5,duels:5,arrets:3},
 turnoverPenalty:.06,maxTurnoverPenalty:1,
 domains:{
  finition:{label:'Finition',weight:20},creation:{label:'Création',weight:20},
  passes:{label:'Passes / maîtrise',weight:15},progression:{label:'Progression',weight:15},
  defense:{label:'Défense',weight:15},duels:{label:'Duels',weight:10},arrets:{label:'Arrêts',weight:5},
 },
} as const;
export type RatingDomain=keyof typeof ratingV2Config.domains;
type Observation={volume:number|null;success?:number|null;attempts?:number|null;volumeWeight?:number};
export type DomainRating={score:number;index:number;weight:number;volume:number|null;efficiency:number|null};
const mean=(values:number[])=>values.reduce((sum,n)=>sum+n,0)/values.length;
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const known=(n:number|null|undefined):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const value=(s:Stats,k:string)=>known(s[k])?s[k]:null;
const total=(s:Stats,keys:readonly string[])=>{
 const seen=keys.map(k=>value(s,k)).filter(known);
 return seen.length?seen.reduce((a,b)=>a+b,0):null;
};

// Only match-local values observed for everyone in this comparison are used.
// This prevents a player with extra annotations from gaining an unfair advantage.
function observations(stats:Stats,keys:Set<string>):Record<RatingDomain,Observation>{
 const get=(k:string)=>keys.has(k)?value(stats,k):null;
 const creationKeys=['assists','secondaryAssists','keyPasses','chancesCreated'].filter(k=>keys.has(k));
 const assists=get('assists'),secondary=get('secondaryAssists');
 const chances=[get('keyPasses'),get('chancesCreated')].filter(known);
 const chanceVolume=chances.length?Math.max(...chances):null;
 // A decisive pass can also be a key pass/chance: only the extra chances add credit.
 const creation=creationKeys.length&&creationKeys.every(k=>known(stats[k]))?
  (assists??0)+.5*(secondary??0)+.25*Math.max(0,(chanceVolume??0)-(assists??0)):null;
 const pair=(success:string,attempts:string,volumeWeight=.5):Observation=>({volume:get(success),success:get(success),attempts:get(attempts),volumeWeight});
 const goals=get('goals');
 return {
  finition:{volume:keys.has('goals')?goals:get('shotsOnTarget'),success:keys.has('goals')?goals:get('shotsOnTarget'),attempts:get('shots'),volumeWeight:.5},
  creation:{volume:creation},passes:pair('passesCompleted','passesAttempted',.25),
  progression:pair('dribblesCompleted','dribblesAttempted'),
  defense:{volume:[...keys].filter(k=>['tackles','interceptions','recoveries','blocks','clearances'].includes(k)).every(k=>known(stats[k]))?total(Object.fromEntries([...keys].map(k=>[k,stats[k]])),['tackles','interceptions','recoveries','blocks','clearances']):null},
  duels:pair('duelsWon','duelsAttempted'),arrets:{volume:get('saves')},
 };
}

/** Remove only overlaps proven by an annotated action, without changing raw totals. */
export function ratingStats(match:Match):Stats[]{
 const overlap=new Map<string,number>();
 const tracked=new Set(match.analysis?(match.analysis.publishedKeys??(match.analysis.publishedAt?match.analysis.completeKeys:[])):match.trackedKeys);
 const events=match.analysis?.publishedEvents??match.events;
 for(const event of events){
  if(!isV2(event)||!tracked.has('recoveries')||!['INTERCEPTION','TACKLE','PASS'].includes(event.type))continue;
  const effects=canonicalEffects(event,events);
  for(const playerId of new Set(effects.map(([id])=>id))){
   const keys=effects.filter(([id])=>id===playerId).map(([,k])=>k);
   if(keys.includes('recoveries')&&((keys.includes('interceptions')&&tracked.has('interceptions'))||(keys.includes('tackles')&&tracked.has('tackles'))))
    overlap.set(playerId,(overlap.get(playerId)??0)+1);
  }
 }
 return match.participants.map(p=>({...p.stats,...(known(p.stats.recoveries)&&overlap.has(p.playerId)?
  {recoveries:Math.max(0,p.stats.recoveries-overlap.get(p.playerId)!)}:{})}));
}

export function automaticRatingV2(stats:Stats,peers:Stats[],weights:Record<string,number>={}){
 const keys=new Set(Object.keys(stats).filter(k=>known(stats[k])&&peers.filter(p=>known(p[k])).length>=ratingV2Config.minPeers));
 const target=observations(stats,keys),population=peers.map(p=>observations(p,keys));
 const domains:Partial<Record<RatingDomain,DomainRating>>={};
 const explanation:string[]=["Barème v2.0 · comparaison avec les joueurs de ce match · aucun bonus de victoire ou de poste."];
 for(const [key,config]of Object.entries(ratingV2Config.domains)){
  const domain=key as RatingDomain,o=target[domain];
  const multiplier=weights[domain]??(domain==='progression'?weights.percussion:undefined)??1;
  const weight=config.weight*multiplier;
  if(!Number.isFinite(weight)||weight<=0)continue;
  const volumes=population.map(p=>p[domain].volume).filter(known);
  if(!known(o.volume)||volumes.length<ratingV2Config.minPeers)continue;
  const reference=mean(volumes);
  // Lack of a scoring action is weaker evidence than an observed failed action.
  const relative=reference===0?0:clamp((o.volume-reference)/Math.max(1,reference),-1,2);
  const volumeScore=relative<0?.25*relative:relative;
  const paired=population.map(p=>p[domain]).filter(p=>known(p.success)&&known(p.attempts)&&p.attempts>0&&p.success<=p.attempts);
  let efficiency:number|null=null;
  if(known(o.success)&&known(o.attempts)&&o.attempts>0&&o.success<=o.attempts&&paired.length>=ratingV2Config.minPeers){
   const attempted=paired.reduce((sum,p)=>sum+p.attempts!,0);
   const typical=paired.reduce((sum,p)=>sum+p.success!,0)/attempted;
   efficiency=clamp((o.success/o.attempts-typical)/Math.max(.25,typical,1-typical),-1,1);
  }
  const pairedVolumeWeight=o.volumeWeight??.5;
  const combined=efficiency==null?volumeScore:pairedVolumeWeight*volumeScore+(1-pairedVolumeWeight)*efficiency;
  // Confidence increases continuously; crossing five attempts never switches
  // from 100% volume to a different blend. Unknown attempts use observed actions.
  const sample=known(o.attempts)?o.attempts:o.volume;
  const confidence=Math.min(1,sample/ratingV2Config.minActions[domain]);
  const score=combined*(combined<0?Math.max(.25,confidence):confidence);
  domains[domain]={score:Math.round(clamp(50+25*score,0,100)),index:score,weight,volume:o.volume,efficiency};
 }
 const available=Object.entries(domains) as [RatingDomain,DomainRating][];
 if(!available.length)return {value:null,domains,coverage:0,explanation:['Pas assez de données comparables dans ce match pour calculer une note.']};
 const field=available.filter(([key])=>key!=='arrets');
 const fieldWeight=field.reduce((sum,[,d])=>sum+d.weight,0);
 const saves=domains.arrets;
 // Missing field categories renormalize; rotating goalkeeping remains at most 5%
 // of the default budget, even when it is the only recorded category.
 const totalWeight=fieldWeight+(saves?.weight??0);
 const saveShare=saves?Math.min(.05,saves.weight/totalWeight):0;
 const weighted=fieldWeight?field.reduce((sum,[,d])=>sum+d.index*d.weight,0)/fieldWeight:0;
 const performance=(1-saveShare)*weighted+saveShare*(saves?.index??0);
 const penalty=known(stats.turnovers)?Math.min(ratingV2Config.maxTurnoverPenalty,stats.turnovers*ratingV2Config.turnoverPenalty):0;
 const raw=ratingV2Config.base+6*performance-penalty;
 const compressed=raw>8?8+2*(1-Math.exp(-(raw-8)/2)):raw;
 const rating=Math.round(clamp(compressed,ratingV2Config.min,ratingV2Config.max)*10)/10;
 for(const [domain,d]of available){
  const share=domain==='arrets'?saveShare:fieldWeight?(1-saveShare)*d.weight/fieldWeight:0;
  explanation.push(`${ratingV2Config.domains[domain].label} : ${d.index>0?'au-dessus':d.index<0?'en dessous':'proche'} de la référence · poids utilisé ${(100*share).toFixed(1)} %${d.efficiency!=null?' · volume et efficacité':' · volume observé uniquement'}.`);
 }
 if(penalty)explanation.push(`Pertes observées : −${penalty.toFixed(2)} avant compression.`);
 const coverage=available.reduce((sum,[k])=>sum+ratingV2Config.domains[k].weight,0);
 explanation.push(`${available.length}/7 domaines comparables · ${coverage} % du barème couvert${coverage<100?' · note partielle':''}. Les données manquantes sont exclues ; zéro reste une observation. Les petits volumes ont une influence réduite.`);
 explanation.push("Au-delà de 8, les gains diminuent progressivement. Une seule excellente catégorie ne suffit pas à garantir un 10.");
 return {value:rating,domains,coverage,explanation};
}
