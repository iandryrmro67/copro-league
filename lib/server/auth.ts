import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {accessFor} from '../auth-policy';
export function authConfigured(){return !!process.env.NEXT_PUBLIC_SUPABASE_URL&&!!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}
export function accessConfig(){return {admins:process.env.ADMIN_EMAILS??'',members:process.env.MEMBER_EMAILS??''}}
export async function authClient(){
 if(!authConfigured())throw Error('Authentification non configurée.');
 const jar=await cookies();
 return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>jar.getAll(),setAll:values=>{try{for(const {name,value,options} of values)jar.set(name,value,options)}catch{/* Server components cannot write cookies; proxy refreshes them. */}}}});
}
export async function currentUser(){
 if(!authConfigured())return null;
 const {data:{user},error}=await (await authClient()).auth.getUser();
 if(error||!user)return null;
 const access=accessFor(user,accessConfig());if(!access.allowed)return null;
 const fullName=typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name:null;
 return {userId:user.id,email:user.email!,displayName:fullName??user.email!,fullName,admin:access.admin};
}
