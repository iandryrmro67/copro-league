import postgres from 'postgres';
import {readFile} from 'node:fs/promises';
import {restoreRawBackup,type RawBackup} from '../lib/server/import-data';
import type {SQLConnection} from '../lib/server/sql';
const filename=process.argv[2];
if(!filename||!process.env.DATABASE_URL)throw Error('Usage : npm run db:import -- /chemin/backup.json ; DATABASE_URL requise.');
const backup=JSON.parse(await readFile(filename,'utf8')) as RawBackup;
const sql=postgres(process.env.DATABASE_URL,{prepare:false,max:1,ssl:'verify-full'});
const wrap=(client:postgres.Sql|postgres.TransactionSql):SQLConnection=>({query:async(query,args)=>{const r=await client.unsafe(query,args as postgres.ParameterOrJSON<never>[]);return {rows:[...r],count:r.count}},transaction:fn=>sql.begin(tx=>fn(wrap(tx))) as Promise<any>});
try{const counts=await restoreRawBackup(wrap(sql),backup);console.log('Import validé (transaction complète) :',counts)}finally{await sql.end()}
