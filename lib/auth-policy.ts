export type VerifiedAccount={email?:string;email_confirmed_at?:string};
export function accessFor(user:VerifiedAccount|null,config:{admins:string;members:string}){
 const list=(s:string)=>s.split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
 const email=user?.email?.toLowerCase();
 const verified=!!email&&!!user?.email_confirmed_at;
 const admin=verified&&list(config.admins).includes(email!);
 return {allowed:admin||verified&&list(config.members).includes(email!),admin};
}
export function safeReturnPath(value:unknown):string{
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//'))return '/';
 try{const url=new URL(value,'https://app.local');if(url.origin!=='https://app.local'||/^\/(auth(?:\/|$)|connexion(?:\/|$)|signin-with-chatgpt|signout-with-chatgpt|callback)/.test(url.pathname))return '/';return url.pathname+url.search+url.hash}catch{return '/'}
}
