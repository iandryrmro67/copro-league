import {postgresTLS} from '../lib/server/postgres-options';
import {createClient} from '@supabase/supabase-js';
import postgres from 'postgres';
import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {mediaSpec,validMediaHeader,validMediaId,type MediaKind} from '../lib/media-policy';
const directory=process.argv[2];
if(!directory||!process.env.DATABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Dossier et variables Supabase requis.');
const sql=postgres(process.env.DATABASE_URL,{prepare:false,max:1,ssl:postgresTLS});
const bucket=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from('league-media');
const digest=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex');
let copied=0,failed=0;
try{
 for(const kind of ['photos','videos'] as MediaKind[]){
  const folder=kind==='photos'?resolve(directory):resolve(directory,'videos');
  let names:string[];try{names=await readdir(folder)}catch(e){if(kind==='videos')continue;throw e}
  for(const name of names){
   if(!(await stat(join(folder,name))).isFile())continue;
   try{
    if(!validMediaId(kind,name))throw Error('Nom non reconnu : conserver les noms R2 originaux.');
    const bytes=await readFile(join(folder,name));
    const type=['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'].find(t=>validMediaHeader(t,bytes.subarray(0,32)));
    const declared=kind==='videos'?({mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm'} as Record<string,string>)[name.split('.').at(-1)!]:type;
    if(!declared||!mediaSpec(kind,{name,type:declared,size:bytes.length})||!validMediaHeader(declared,bytes.subarray(0,32)))throw Error('Format ou taille incompatible.');
    const path=kind+'/'+name;
    const {data:info,error:infoError}=await bucket.info(path);
    if(info){
     if(info.size!==bytes.length)throw Error('Fichier distant différent, aucun remplacement.');
     const existing=await bucket.download(path);
     if(existing.error||!existing.data||digest(new Uint8Array(await existing.data.arrayBuffer()))!==digest(bytes))throw Error('Contenu distant différent, aucun remplacement.');
    }else{
     // Upload is non-overwriting even if the preceding lookup failed or raced.
     const {error}=await bucket.upload(path,bytes,{contentType:declared,upsert:false});if(error)throw Error('Copie Storage refusée : '+error.message);
    }
    await sql`INSERT INTO media_uploads(id,kind,owner_id,object_path,content_type,size,ready) VALUES(${name},${kind},'migration',${path},${declared},${bytes.length},1) ON CONFLICT(id) DO NOTHING`;
    copied++;console.log('Vérifié : '+path);
   }catch(e){failed++;console.error(name+' : '+(e instanceof Error?e.message:'échec'))}
  }
 }
 console.log({copied,failed});if(failed)process.exitCode=1;
}finally{await sql.end()}
