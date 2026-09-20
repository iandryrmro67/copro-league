import {env} from 'cloudflare:workers';

export const MAX_VIDEO_BYTES=90*1024*1024;
const MIME:Record<string,string>={mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm'};
export function videoType(file:Pick<File,'name'|'type'|'size'>,header:Uint8Array):string|null{
 const ext=file.name.split('.').at(-1)?.toLowerCase()??'';const type=MIME[ext];if(!type||file.size<16||file.size>MAX_VIDEO_BYTES)return null;
 const requested=file.type.toLowerCase();if(requested&&!([type,'application/octet-stream',...(ext==='mov'?['video/mp4']:[])].includes(requested)))return null;
 const ascii=(from:number,to:number)=>String.fromCharCode(...header.slice(from,to));
 if(ext==='webm')return header[0]===0x1a&&header[1]===0x45&&header[2]===0xdf&&header[3]===0xa3?type:null;
 if(ascii(4,8)==='ftyp')return type;
 if(ext==='mov'&&['moov','mdat','wide','free','skip'].includes(ascii(4,8)))return type;
 return null;
}
export function parseVideoRange(header:string|null,size:number):{offset:number;length:number}|null|false{
 if(!header)return null;const match=/^bytes=(\d*)-(\d*)$/.exec(header.trim());if(!match)return false;
 const [,start,end]=match;if(!start&&!end)return false;
 if(!start){const suffix=Number(end);if(!Number.isSafeInteger(suffix)||suffix<1)return false;const length=Math.min(suffix,size);return{offset:size-length,length}}
 const offset=Number(start),last=end?Number(end):size-1;if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(last)||offset>=size||last<offset)return false;
 return{offset,length:Math.min(last,size-1)-offset+1};
}
export async function videoUpload(request:Request):Promise<Response>{
 const contentLength=Number(request.headers.get('content-length'));if(contentLength&&contentLength>MAX_VIDEO_BYTES+16384)return Response.json({error:'Vidéo limitée à 90 Mo.'},{status:413});
 if(!env.BUCKET)return Response.json({error:'Stockage vidéo indisponible.'},{status:503});
 if(!request.headers.get('content-type')?.startsWith('multipart/form-data'))return Response.json({error:'Formulaire vidéo requis.'},{status:415});
 const form=await request.formData();const file=form.get('file');if(!(file instanceof File))return Response.json({error:'Fichier vidéo requis.'},{status:400});
 const bytes=new Uint8Array(await file.slice(0,32).arrayBuffer());const type=videoType(file,bytes);if(!type)return Response.json({error:'Vidéo MP4, MOV ou WebM valide de 90 Mo maximum requise.'},{status:file.size>MAX_VIDEO_BYTES?413:400});
 const ext=file.name.split('.').at(-1)!.toLowerCase();const key=`videos/${crypto.randomUUID()}.${ext}`;
 await env.BUCKET.put(key,file,{httpMetadata:{contentType:type},customMetadata:{originalName:file.name.slice(0,120)}});
 return Response.json({url:`/api/videos/${key.split('/').at(-1)}`,size:file.size,type},{headers:{'Cache-Control':'no-store'}});
}
export async function videoRead(request:Request,filename:string,head=false):Promise<Response>{
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,40}\.(mp4|mov|webm)$/.test(filename))return new Response('Vidéo introuvable',{status:404});
 if(!env.BUCKET)return new Response('Stockage indisponible',{status:503});const key=`videos/${filename}`;const meta=await env.BUCKET.head(key);if(!meta)return new Response('Vidéo introuvable',{status:404});
 const range=parseVideoRange(request.headers.get('range'),meta.size);if(range===false)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${meta.size}`,'Accept-Ranges':'bytes','Cache-Control':'no-store'}});
 const type=meta.httpMetadata?.contentType??MIME[filename.split('.').at(-1)!];const headers=new Headers({'Content-Type':type,'Accept-Ranges':'bytes','Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'});
 if(range){headers.set('Content-Range',`bytes ${range.offset}-${range.offset+range.length-1}/${meta.size}`);headers.set('Content-Length',String(range.length))}else headers.set('Content-Length',String(meta.size));
 if(head)return new Response(null,{status:range?206:200,headers});
 const object=await env.BUCKET.get(key,range?{range:{offset:range.offset,length:range.length}}:undefined);if(!object)return new Response('Vidéo introuvable',{status:404});return new Response(object.body,{status:range?206:200,headers});
}
