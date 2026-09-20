import postgres from 'postgres';
import {createDatabase,type SQLConnection} from './sql';
let database:ReturnType<typeof createDatabase>|undefined;
export function db(){
 if(database)return database;
 if(!process.env.DATABASE_URL)throw Error('Base de données non configurée.');
 const sql=postgres(process.env.DATABASE_URL,{prepare:false,max:3,idle_timeout:20,connect_timeout:10,ssl:'verify-full'});
 const wrap=(client:postgres.Sql|postgres.TransactionSql):SQLConnection=>({
  query:async(query,args)=>{const result=await client.unsafe(query,args as postgres.ParameterOrJSON<never>[]);return {rows:[...result],count:result.count??result.length}},
  transaction:fn=>sql.begin(tx=>fn(wrap(tx))) as Promise<any>,
 });
 database=createDatabase(wrap(sql));return database;
}
