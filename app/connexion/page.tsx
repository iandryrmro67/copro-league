import {redirect} from 'next/navigation';
import {authConfigured,currentUser} from '@/lib/server/auth';
import {safeReturnPath} from '@/lib/auth-policy';
export const dynamic='force-dynamic';
export default async function Connexion({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const params=await searchParams;
 const destination=safeReturnPath(params.return_to);
 if(await currentUser())redirect(destination);
 const configured=authConfigured();
 return <main className="container" style={{maxWidth:500,paddingTop:'12vh'}}><section className="panel formstack"><a className="brand" href="/"><img src="/brand/logo.svg" alt=""/>COPRO<span>LEAGUE</span></a><p className="eyebrow">LE VESTIAIRE PRIVÉ</p><h1>Connexion</h1><p className="muted">Retrouve les matchs, les stats et les trophées de la ligue.</p>{!configured?<p role="status">La connexion est en cours de configuration. Reviens dans un instant.</p>:<form action="/auth/login" method="post" className="formstack"><input type="hidden" name="return_to" value={destination}/><label className="field"><span>Adresse e-mail</span><input type="email" name="email" autoComplete="username" required maxLength={254}/></label><label className="field"><span>Mot de passe</span><input type="password" name="password" autoComplete="current-password" required minLength={6} maxLength={256}/></label>{params.error&&<p className="error" role="alert">Connexion impossible. Vérifie tes identifiants et l’accès de ton compte à la ligue.</p>}<button className="button primary" type="submit">Entrer dans la ligue</button><p className="muted">L’accès est réservé aux membres. Contacte l’administrateur pour obtenir ton compte ou réinitialiser ton mot de passe.</p></form>}</section></main>
}
