import type {SQLConnection} from './sql';
export const leagueTables=['players','seasons','settings','player_attributes','matches','teams','match_players','match_player_stats','match_events','videos','season_awards','player_awards','award_definitions','award_identities','award_votes','recognition_seasons'] as const;
export type RawBackup={format:'copro-raw-v1';tables:Record<string,Record<string,unknown>[]>};
export async function restoreRawBackup(connection:SQLConnection,backup:RawBackup){
 if(backup?.format!=='copro-raw-v1'||!backup.tables)throw Error('Sauvegarde brute copro-raw-v1 requise.');
 for(const table of leagueTables)if(!Array.isArray(backup.tables[table]))throw Error('Table manquante : '+table);
 return connection.transaction(async tx=>{
  // Lock every destination before checking emptiness: no partial imports or concurrent seed.
  await tx.query('LOCK TABLE '+leagueTables.join(',')+' IN ACCESS EXCLUSIVE MODE',[]);
  for(const table of leagueTables){const {rows}=await tx.query(`SELECT 1 FROM ${table} LIMIT 1`,[]);if(rows.length)throw Error('Import refusé : la destination contient déjà des données ('+table+').')}
  const {rows:columns}=await tx.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'",[]);
  const counts:Record<string,number>={};
  for(const table of leagueTables){
   const allowed=columns.filter(c=>c.table_name===table).map(c=>c.column_name);
   for(const original of backup.tables[table]){
    // Authentication provider IDs change. Match the same verified email again on first login.
    const row=table==='award_identities'?{...original,user_id:null}:original;
    const keys=Object.keys(row);if(!keys.length||keys.some(k=>!allowed.includes(k)))throw Error('Colonnes invalides dans '+table);
    await tx.query(`INSERT INTO ${table} (${keys.map(k=>'"'+k+'"').join(',')}) VALUES (${keys.map((_,i)=>'$'+(i+1)).join(',')})`,keys.map(k=>row[k]));
   }
   counts[table]=backup.tables[table].length;
  }
  return counts;
 });
}
