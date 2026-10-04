import type { Metadata } from 'next';
import './globals.css';
import './tokens.css';
import './design-system.css';
import './animations.css';
import {AnimationProvider} from '@/components/animations/AnimationProvider';
import {LeagueDataProvider} from '@/components/animations/LeagueDataProvider';
export const metadata: Metadata = { title: 'Copro League — Plus qu’un jeu', description: 'Matchs, joueurs et histoire de notre ligue de football à 5.', icons:{icon:'/favicon.svg'} };
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="fr"><body><AnimationProvider><LeagueDataProvider>{children}</LeagueDataProvider></AnimationProvider></body></html>}
