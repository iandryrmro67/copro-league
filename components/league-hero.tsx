import {ArrowRight,ArrowUpRight} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export function LeagueHero({seasonName}:{seasonName:string}) {
  return <section className="leaguehero" aria-labelledby="leaguehero-title">
    <div className="hero-copy">
      <div className="hero-meta"><span>COPRO LEAGUE</span><span className="hero-rule" aria-hidden="true"/><span className="accent">{seasonName}</span></div>
      <h1 id="leaguehero-title">Plus qu’un<br/>jeu<span className="accent" aria-hidden="true">{'//'}</span></h1>
      <p className="hero-tagline"><span aria-hidden="true">—</span> Football pour de vrai. <span aria-hidden="true">+</span></p>
      <p className="hero-description">Dix joueurs. Un terrain.<br/>Chaque match écrit notre histoire.</p>
      <div className="hero-actions"><Link href="/matchs" className="button primary">Les rendez-vous <ArrowRight size={22} aria-hidden="true"/></Link><Link href="/joueurs" className="textbutton">Le collectif <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
    </div>
    <div className="hero-visual" aria-hidden="true">
      <Image src="/brand/moodboard.png" alt="" fill sizes="(max-width: 700px) 100vw, 50vw" loading="eager" fetchPriority="high"/>
      <span className="hero-cross top">+</span><span className="hero-cross bottom">+</span>
      <span className="hero-side">COPRO LEAGUE / SUR LE TERRAIN</span>
      <div className="hero-accent"><div className="hero-index">05<small>× 02</small></div><span>CONTRE CINQ<br/>SUR LE TERRAIN</span><div className="hero-duotone"/><div className="hero-barcode"/><span>ON REMET ÇA ? ↗</span></div>
      <span className="hero-caption">LE CLUB / PLUS QU’UN JEU</span>
    </div>
  </section>;
}
