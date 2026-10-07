import type { Metadata } from 'next';
import './globals.css';
import './design-system.css';
import './hud-fonts.css';
import './hud.css';
export const metadata: Metadata = { title: 'Copro League — Plus qu’un jeu', description: 'Matchs, joueurs et histoire de notre ligue de football à 5.', icons:{icon:'/brand/monogram-kush.png'} };
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="fr"><body>{children}</body></html>}
