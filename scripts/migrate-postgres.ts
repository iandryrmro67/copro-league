import {postgresTLS} from '../lib/server/postgres-options';
import postgres from 'postgres';
import {readFile,readdir} from 'node:fs/promises';
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL manquante dans .env.local');
const sql=postgres(process.env.DATABASE_URL,{prepare:false,max:1,ssl:postgresTLS});
try{
 await sql`CREATE TABLE IF NOT EXISTS copro_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
 await sql`ALTER TABLE copro_migrations ENABLE ROW LEVEL SECURITY`;
 for(const name of (await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort()){
  await sql.begin(async tx=>{
   await tx`SELECT pg_advisory_xact_lock(21462026)`;
   if((await tx`SELECT name FROM copro_migrations WHERE name=${name}`).length)return;
   await tx.unsafe(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
   await tx`INSERT INTO copro_migrations(name) VALUES(${name})`;
   console.log('Appliquée : '+name);
  });
 }
}finally{await sql.end()}
