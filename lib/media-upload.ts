'use client';
export async function uploadMedia(kind:'videos'|'photos',file:File,options:{signal?:AbortSignal;onProgress?:(percent:number)=>void}={}){
 const post=async(path:string,body:unknown)=>{
  const response=await fetch(`/api/${kind}/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:options.signal});
  const data=await response.json() as {error?:string;id:string;signedUrl:string;type:string;url:string};if(!response.ok)throw Error(data.error??'Envoi impossible.');return data;
 };
 const ticket=await post('ticket',{name:file.name,type:file.type,size:file.size});
 await new Promise<void>((resolve,reject)=>{
  const xhr=new XMLHttpRequest();const abort=()=>xhr.abort();
  const done=(error?:Error)=>{options.signal?.removeEventListener('abort',abort);error?reject(error):resolve()};
  xhr.open('PUT',ticket.signedUrl);xhr.setRequestHeader('Content-Type',ticket.type);xhr.setRequestHeader('Cache-Control','max-age=3600');
  xhr.upload.onprogress=e=>{if(e.lengthComputable)options.onProgress?.(Math.round(e.loaded/e.total*100))};
  xhr.onerror=()=>done(Error('Envoi interrompu. Réessayez.'));
  xhr.onabort=()=>done(new DOMException('Envoi annulé.','AbortError'));
  xhr.onload=()=>done(xhr.status>=200&&xhr.status<300?undefined:Error('Le stockage a refusé le fichier. Vérifie sa taille et réessaie.'));
  if(options.signal?.aborted){done(new DOMException('Envoi annulé.','AbortError'));return}
  options.signal?.addEventListener('abort',abort,{once:true});xhr.send(file);
 });
 return (await post('complete',{id:ticket.id})).url as string;
}
