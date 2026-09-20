export const MAX_VIDEO_BYTES=50*1024*1024;
export const MAX_PHOTO_BYTES=5*1024*1024;
export type MediaKind='videos'|'photos';
const videos:Record<string,string>={mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm'};
export function mediaSpec(kind:MediaKind,file:Pick<File,'name'|'type'|'size'>){
 if(!Number.isSafeInteger(file.size)||file.size<16||file.size>(kind==='videos'?MAX_VIDEO_BYTES:MAX_PHOTO_BYTES))return null;
 if(kind==='photos')return ['image/jpeg','image/png','image/webp'].includes(file.type)?{type:file.type,extension:''}:null;
 const extension=file.name.split('.').at(-1)?.toLowerCase()??'';const type=videos[extension];
 if(!type||file.type&&!['application/octet-stream',type,...(extension==='mov'?['video/mp4']:[])].includes(file.type))return null;
 return {type,extension:'.'+extension};
}
export function validMediaId(kind:MediaKind,id:string){return new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'+(kind==='videos'?'\\.(mp4|mov|webm)':'')+'$').test(id)}
export function validMediaHeader(type:string,h:Uint8Array){
 const ascii=(a:number,b:number)=>String.fromCharCode(...h.slice(a,b));
 if(type==='image/jpeg')return h[0]===255&&h[1]===216&&h[2]===255;
 if(type==='image/png')return [137,80,78,71,13,10,26,10].every((b,i)=>h[i]===b);
 if(type==='image/webp')return ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP';
 if(type==='video/webm')return [0x1a,0x45,0xdf,0xa3].every((b,i)=>h[i]===b);
 if(type==='video/mp4'||type==='video/quicktime')return ascii(4,8)==='ftyp'||type==='video/quicktime'&&['moov','mdat','wide','free','skip'].includes(ascii(4,8));
 return false;
}
