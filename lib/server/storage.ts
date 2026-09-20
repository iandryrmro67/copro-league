import {createClient} from '@supabase/supabase-js';
import {db} from './database';
import {mediaSpec,validMediaHeader,validMediaId,type MediaKind} from '../media-policy';
const BUCKET='league-media';
function storage(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('Stockage non configuré.');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from(BUCKET);
}
type Upload={id:string;kind:MediaKind;owner_id:string;object_path:string;content_type:string;size:number;ready:number};
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function mediaTicket(kind:MediaKind,input:unknown,ownerId:string){
 const file=input as Pick<File,'name'|'type'|'size'>;
 if(!file||typeof file.name!=='string'||typeof file.type!=='string')return response({error:'Fichier invalide.'},400);
 const spec=mediaSpec(kind,file);if(!spec)return response({error:kind==='videos'?'Vidéo MP4, MOV ou WebM de 50 Mo maximum requise.':'Photo JPG, PNG ou WebP de 5 Mo maximum requise.'},400);
 const id=crypto.randomUUID()+spec.extension,path=kind+'/'+id;
 const {data,error}=await storage().createSignedUploadUrl(path,{upsert:false});if(error||!data)throw Error('Impossible de préparer l’envoi du fichier.');
 await db().prepare('INSERT INTO media_uploads(id,kind,owner_id,object_path,content_type,size) VALUES(?,?,?,?,?,?)').bind(id,kind,ownerId,path,spec.type,file.size).run();
 return response({id,signedUrl:data.signedUrl,type:spec.type});
}
export async function mediaComplete(kind:MediaKind,id:string,ownerId:string){
 if(!validMediaId(kind,id))return response({error:'Fichier invalide.'},400);
 const record=await db().prepare('SELECT * FROM media_uploads WHERE id=? AND kind=? AND owner_id=?').bind(id,kind,ownerId).first<Upload>();
 if(!record)return response({error:'Envoi introuvable.'},404);
 if(record.ready)return response({url:`/api/${kind}/${id}`});
 const bucket=storage();const {data:info,error}=await bucket.info(record.object_path);
 if(error||!info)return response({error:'Envoi incomplet. Réessayez.'},409);
 if(info.size!==record.size||info.contentType!==record.content_type)return response({error:'Le fichier reçu ne correspond pas au fichier annoncé.'},400);
 const {data:signed,error:signError}=await bucket.createSignedUrl(record.object_path,60);
 if(signError||!signed)throw Error('Validation du fichier indisponible.');
 const file=await fetch(signed.signedUrl,{headers:{Range:'bytes=0-31'},cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!file.ok||!file.body)throw Error('Lecture du fichier impossible.');
 // Read at most the signature, even if the storage server ignores the Range request.
 const reader=file.body.getReader();const header=new Uint8Array(32);let length=0;
 try{while(length<32){const {done,value}=await reader.read();if(done)break;const bytes=value.subarray(0,32-length);header.set(bytes,length);length+=bytes.length}}finally{await reader.cancel()}
 if(!validMediaHeader(record.content_type,header.subarray(0,length)))return response({error:'Le contenu du fichier ne correspond pas à son format.'},400);
 await db().prepare('UPDATE media_uploads SET ready=1 WHERE id=? AND owner_id=?').bind(id,ownerId).run();
 return response({url:`/api/${kind}/${id}`});
}
export async function mediaRead(kind:MediaKind,id:string){
 if(!validMediaId(kind,id))return new Response(null,{status:404});
 const record=await db().prepare('SELECT object_path FROM media_uploads WHERE id=? AND kind=? AND ready=1').bind(id,kind).first<{object_path:string}>();
 if(!record)return new Response(null,{status:404});
 // Private signed delivery supports seek/range requests without routing file bodies through Vercel.
 const {data,error}=await storage().createSignedUrl(record.object_path,3600);
 if(error||!data)return new Response(null,{status:503});
 return new Response(null,{status:307,headers:{Location:data.signedUrl,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
}
