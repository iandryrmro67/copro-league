import {NextRequest,NextResponse} from 'next/server';
import {authClient,accessConfig} from '@/lib/server/auth';
import {accessFor,safeReturnPath} from '@/lib/auth-policy';
export async function POST(req:NextRequest){
 if(req.headers.get('origin')!==req.nextUrl.origin)return new Response('Origine non autorisée',{status:403});
 if(Number(req.headers.get('content-length')??0)>4096)return new Response('Requête trop volumineuse',{status:413});
 const form=await req.formData();const destination=safeReturnPath(form.get('return_to'));
 const failure=new URL('/connexion',req.url);failure.searchParams.set('error','1');failure.searchParams.set('return_to',destination);
 const email=String(form.get('email')??'').trim(),password=String(form.get('password')??'');
 if(email.length>254||password.length>256)return NextResponse.redirect(failure,303);
 try{
  const client=await authClient();const {data,error}=await client.auth.signInWithPassword({email,password});
  if(error||!accessFor(data.user,accessConfig()).allowed){await client.auth.signOut({scope:'local'});return NextResponse.redirect(failure,303)}
  return NextResponse.redirect(new URL(destination,req.url),303);
 }catch{return NextResponse.redirect(failure,303)}
}
