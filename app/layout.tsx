import type { Metadata } from 'next';
import './globals.css';
import './design-system.css';
import './hud-fonts.css';
import './hud.css';
import './hud-faithful.css';
import './hud-modules.css';
import './hud-motion-profile.css';
import './hud-spacing.css';
import {LeagueMotion} from '@/components/league-motion';
export const metadata: Metadata = { title: 'Copro League — Plus qu’un jeu', description: 'Matchs, joueurs et histoire de notre ligue de football à 5.', icons:{icon:'/brand/monogram-kush.png'} };
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="fr"><body><LeagueMotion>{children}</LeagueMotion></body></html>}
