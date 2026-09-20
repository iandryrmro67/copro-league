
export const MAX_VIDEO_BYTES=50*1024*1024;
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
