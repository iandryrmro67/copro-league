import {NextRequest,NextResponse} from 'next/server';
import {authClient} from '@/lib/server/auth';
export async function POST(req:NextRequest){
 if(req.headers.get('origin')!==req.nextUrl.origin)return new Response('Origine non autorisée',{status:403});
 await (await authClient()).auth.signOut({scope:'local'});
 return NextResponse.redirect(new URL('/connexion',req.url),303);
}
