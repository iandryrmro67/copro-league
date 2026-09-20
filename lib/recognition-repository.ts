import {db} from './server/database';
import type {League} from './model';
import {awardDefinitions,badgeDefinitions,recognitionLimits} from './recognition-definitions';
import {candidates,evaluateAwards,evaluateBadges,mainBadges,type AwardResult} from './recognition';
export type RecognitionData=Awaited<ReturnType<typeof recognitionData>>;
export async function recognitionData(league:Pick<League,'players'|'matches'|'seasons'>){

 const stored=(await db().prepare('SELECT season_id, data FROM recognition_seasons').all()).results as {season_id:string;data:string}[];
 const results:{seasonId:string;seasonName:string;finalized:boolean;awards:AwardResult[]}[]=[];
 for(const season of league.seasons.filter(s=>!s.demo)){
  const prior=stored.find(r=>r.season_id===season.id);
  if(prior){results.push({seasonId:season.id,seasonName:season.name,finalized:true,awards:JSON.parse(prior.data)});continue}
  const awards=evaluateAwards(league,season.id,awardDefinitions);
  const finished=['finished','archived'].includes(season.status)&&league.matches.some(m=>m.seasonId===season.id&&m.status==='finished');
  if(finished){const frozen=awards.map(a=>({...a,status:'final' as const}));await db().prepare('INSERT OR IGNORE INTO recognition_seasons(season_id,data,finalized_at) VALUES(?,?,?)').bind(season.id,JSON.stringify(frozen),new Date().toISOString()).run();const record=await db().prepare('SELECT data FROM recognition_seasons WHERE season_id=?').bind(season.id).first<{data:string}>();results.push({seasonId:season.id,seasonName:season.name,finalized:true,awards:JSON.parse(record!.data)});}else results.push({seasonId:season.id,seasonName:season.name,finalized:false,awards});
 }
 const active=league.seasons.find(s=>s.status==='active'&&!s.demo)??league.seasons.filter(s=>!s.demo).sort((a,b)=>b.start.localeCompare(a.start)||b.id.localeCompare(a.id))[0];
 const population=candidates(league,active?.id);const players=league.players.filter(p=>!p.demo).map(p=>{const c=population.find(c=>c.id===p.id)??{id:p.id,playerIds:[p.id],name:p.name,values:{matches:0}};const badges=evaluateBadges(c,population,badgeDefinitions);return{playerId:c.id,badges,main:mainBadges(badges),activeCount:badges.filter(b=>b.active).length}});
 return{seasons:results,players,badgeSeasonId:active?.id??null,badgeSeasonName:active?.name??'',limits:recognitionLimits,method:'Percentiles avec rang moyen des ex æquo ; 50 si valeurs identiques. Composantes manquantes : récompense indisponible, sauf COPRO D’OR (poids disponibles renormalisés). Égalités : rating, victoires, présences puis identifiant stable. Badges : au moins 3 joueurs dans la population. Impact offensif : tiers G+A, tiers création (xA et occasions à parts égales), tiers dribbles réussis. Impact défensif : récupérations, interceptions, duels gagnés et tacles à parts égales. Badges récents : 5 derniers matchs comparés aux 5 précédents.'};
}

export async function exportRecognitionHistory(){const stored=(await db().prepare('SELECT season_id, data, finalized_at FROM recognition_seasons').all()).results as {season_id:string;data:string;finalized_at:string}[];return stored.map(s=>({seasonId:s.season_id,finalizedAt:s.finalized_at,awards:JSON.parse(s.data)}))}
export async function restoreRecognitionHistory(history:import('./recognition-history').RecognitionHistory){if(!history.length)return;await db().batch(history.map(s=>db().prepare('INSERT OR IGNORE INTO recognition_seasons(season_id,data,finalized_at) VALUES(?,?,?)').bind(s.seasonId,JSON.stringify(s.awards),s.finalizedAt)))}
