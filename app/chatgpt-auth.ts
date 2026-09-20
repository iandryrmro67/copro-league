// Kept as a compatibility import for existing pages; identity comes only from Supabase.
import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/server/auth';
import {safeReturnPath} from '@/lib/auth-policy';
export type ChatGPTUser=NonNullable<Awaited<ReturnType<typeof currentUser>>>;
export const getChatGPTUser=currentUser;
export async function requireChatGPTUser(returnTo:string){const user=await currentUser();if(user)return user;redirect(chatGPTSignInPath(returnTo))}
export const chatGPTSignInPath=(returnTo:string)=>'/connexion?return_to='+encodeURIComponent(safeReturnPath(returnTo));
export const chatGPTSignOutPath=()=>'/auth/logout';
