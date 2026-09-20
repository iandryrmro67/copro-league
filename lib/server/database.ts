import {Pool} from 'pg';
import {postgresTLS} from './postgres-options';
import {createDatabase,type SQLConnection} from './sql';
let database:ReturnType<typeof createDatabase>|undefined;
export function db(){
 if(database)return database;
 if(!process.env.DATABASE_URL)throw Error('Base de données non configurée.');
 // Unnamed parameterized queries work with Supabase's transaction pooler.
 const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:postgresTLS,max:3,idleTimeoutMillis:20000,connectionTimeoutMillis:10000,query_timeout:20000});
 const connection:SQLConnection={
  query:async(sql,args)=>{const r=await pool.query(sql,args);return {rows:r.rows,count:r.rowCount??0}},
  transaction:async fn=>{
   const client=await pool.connect();
   try{
    await client.query('BEGIN');
    const tx:SQLConnection={query:async(sql,args)=>{const r=await client.query(sql,args);return {rows:r.rows,count:r.rowCount??0}},transaction:()=>{throw Error('Transactions imbriquées non prises en charge.')}};
    const result=await fn(tx);await client.query('COMMIT');return result;
   }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
  },
 };
 database=createDatabase(connection);return database;
}
