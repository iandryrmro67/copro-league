import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {accessFor} from './lib/auth-policy';
export async function proxy(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const pathname=request.nextUrl.pathname;
 // APIs check their own identity, including media. Refresh here only for pages.
 if(pathname.startsWith('/api/'))return NextResponse.next();
 let response=NextResponse.next({request});
 response.headers.set('Cache-Control','private, no-store');
 const login=()=>{const target=new URL('/connexion',request.url);target.searchParams.set('return_to',pathname+request.nextUrl.search);const redirect=NextResponse.redirect(target);for(const cookie of response.cookies.getAll())redirect.cookies.set(cookie);redirect.headers.set('Cache-Control','no-store');return redirect};
 const protectedPage=pathname==='/admin'||pathname.startsWith('/admin/');
 if(!url||!key)return protectedPage?login():response;
 const client=createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll:values=>{for(const {name,value} of values)request.cookies.set(name,value);response=NextResponse.next({request});for(const {name,value,options} of values)response.cookies.set(name,value,options);response.headers.set('Cache-Control','private, no-store')}}});
 const {data:{user}}=await client.auth.getUser();
 const access=accessFor(user,{admins:process.env.ADMIN_EMAILS??'',members:process.env.MEMBER_EMAILS??''});
 if(pathname==='/connexion'||pathname.startsWith('/auth/'))return response;
 return !protectedPage||access.allowed?response:login();
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|webp|woff2)$).*)']};
