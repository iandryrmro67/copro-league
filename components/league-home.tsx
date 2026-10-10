'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import {createPortal} from 'react-dom';
import type { League, Match, Player } from '@/lib/model';
import { teamName } from '@/lib/model';
import { youtubeId, type Summary } from '@/lib/engine';
import { divisionFor } from '@/lib/divisions';
import { Calendar, Empty, date, fmt, time } from './league-ui';
import { homePitch, homeLineup } from '@/lib/league-selection';
import { homeScenery } from './home-scenery';
import { ArrowRight, Play } from 'lucide-react';
import { SourceTemplate } from './hud-source-template';

export function Replays({ matches }: { matches: Match[] }) {
  const replays = matches.filter(m => m.video).sort((a, b) => b.date.localeCompare(a.date));
  return <div className="leadersgrid">{replays.map(m => {
    const id = youtubeId(m.video);
    return <Link className="panel replay-card" key={m.id} href={'/matchs/' + m.id + '?tab=video'}>{id ? <img className="videothumb" src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt={`Replay du match ${m.number}`} loading="lazy"/> : <div className="replay-placeholder"><Play size={40}/></div>}<span className="eyebrow">{date(m.date)} · REPLAY</span><h3>Match #{m.number}</h3><p>{m.scoreA == null ? 'À venir' : `${m.scoreA} – ${m.scoreB}`}</p></Link>;
  })}{!replays.length && <Empty>Les replays apparaîtront ici une fois les vidéos ajoutées.</Empty>}</div>;
}

export function Home({ data, summaries, matches, seasonName, filters, divisionPopulation }: { data: League; summaries: Summary[]; matches: Match[]; seasonName: string; filters: React.ReactNode; divisionPopulation: Summary[] }) {
  const [now] = useState(() => Date.now());
  const root=useRef<HTMLDivElement>(null),[screen,setScreen]=useState(0);
  useEffect(()=>{const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)setScreen(Number((entry.target as HTMLElement).dataset.homeScreen))},{threshold:.45});root.current?.querySelectorAll('[data-home-screen]').forEach(el=>observer.observe(el));return()=>observer.disconnect()},[]);
  const [positionRound, setPositionRound] = useState(() => Math.floor(Date.now() / 1000) % 5);
  useEffect(() => {
    const timer = window.setInterval(() => setPositionRound(round => round + 1), 12000);
    return () => window.clearInterval(timer);
  }, []);
  const next = [...matches].filter(m => m.status === 'scheduled' && new Date(m.date).getTime() > now).sort((a, b) => a.date.localeCompare(b.date))[0];
  const done = matches.filter(m => m.status === 'finished');
  const eloLeaders = summaries.filter(s => s.appearances > 0 && !s.player.archived).sort((a, b) => b.elo - a.elo).slice(0, 5);
  const goals = done.reduce((n, m) => n + (m.scoreA ?? 0) + (m.scoreB ?? 0), 0);
  const { match: pitchMatch, roster } = homePitch(data, matches, now);
  const lineup = homeLineup(roster, positionRound);
  const active = data.players.filter(p => !p.archived && summaries.some(s => s.player.id === p.id));
  const weekday = next ? new Date(next.date).toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' }) : 'On joue';
  const questions = [
    ['Comment préparer un match ?', 'Les joueurs sont choisis à partir du sondage WhatsApp, puis ajoutés au match par un administrateur. La fiche rassemble la date, le lieu et les équipes. Il n’y a pas d’inscription ni de liste d’attente sur le site.'],
    ['Comment sont tirées les équipes ?', 'Trois modes sont disponibles : cartes, équilibré par ELO ou capitaine. En mode capitaine, chaque choix dure 60 secondes ; à zéro, un joueur disponible est tiré au sort.'],
    ['Comment marche l’ELO ?', 'Les victoires, nuls et défaites font évoluer l’ELO selon la force des équipes. Battre une équipe plus forte rapporte davantage de points.'],
    ['Où revoir les matchs ?', 'Ouvre les replays ou l’onglet Vidéo d’un match. Les actions horodatées de la timeline permettent de rejoindre le passage correspondant.'],
    ['Que signifient les divisions ?', 'Régional, National, Ligue 2 et Ligue 1 sont calculés par percentile d’ELO dans la saison : moitié basse, top 50 %, top 20 % et top 5 %. Les ex æquo partagent la même division.'],
    ['Qui saisit les stats ?', 'Un administrateur analyse la vidéo et enregistre les actions. Une statistique non observée reste un tiret ; elle ne devient jamais un zéro.'],
  ];
  const kickoff = next ? time(next.date).replace(':', 'h') : '';
  return <div className="source-home-scroll"><div className="faithful-home hm" ref={root} data-home-screen-active={screen}>
    {typeof document!=='undefined'&&createPortal(<div className="source-home-scroll"><div className="hm home-scroll-chrome" data-home-screen-active={screen}>    <SourceTemplate name="homeScrollNav" slots={{'8':`${seasonName} · ${active.length} JOUEURS`}} props={{'':{'aria-hidden':screen===0,inert:screen===0},'0':{as:'a',href:'/'},...Object.fromEntries(['/','/matchs','/draft','/joueurs','/stats','/awards','/replays'].map((href,i)=>[String(i+1),{href}]))}}/>
    <SourceTemplate name="homeProgress" slots={{'3':<><span>FAQ</span>03</>}} props={{...Object.fromEntries([0,1,3].map(i=>[String(i),{href:`#h${i+1}`,'aria-current':screen===i?'location':undefined}])),'2':{hidden:true}}}/>
    <SourceTemplate name="homeScrollHint" props={{'':{'aria-hidden':true,hidden:screen!==0}}}/>
</div></div>,document.body)}
    <DesignFrame id="h1" screen={0} hero label="Le terrain de la ligue">
      <div className="html-scenery" aria-hidden="true" dangerouslySetInnerHTML={{ __html: homeScenery }}/>
      <div className="outlined-season" aria-hidden="true"><span>{seasonName}</span></div>
      <section className="html-elo"><div className="html-section-label"><span>Classement ELO</span><span>TOP 5</span></div>{eloLeaders.map((s, i) => {
        const delta = s.history.at(-1)?.delta;
        return <Link className="html-elo-row" href={'/joueurs/' + s.player.id} key={s.player.id}><span className="html-rank">{i + 1}</span><span className="html-player-name"><strong>{s.player.name}</strong><small>{divisionFor(s.player.id, divisionPopulation)?.name ?? 'Non classé'}</small></span><b>{s.elo}</b><small className={delta != null && delta < 0 ? 'negative' : 'accent'}>{delta == null || !delta ? '—' : delta > 0 ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`}</small></Link>;
      })}{!eloLeaders.length && <Empty>Le classement commence après le premier match.</Empty>}<Link className="html-text-link" href="/stats">Voir tout →</Link></section>
      <section className="html-fixture"><span className="eyebrow accent">Prochain match{next ? ' · #' + next.number : ''}</span><h1>{next ? weekday : 'On joue'}<br/><em>{next ? kickoff : 'quand ?'}</em></h1>{next ? <><p className="html-teams"><span>{teamName(next, 'A')}</span><b>VS</b><span>{teamName(next, 'B')}</span></p><p className="html-fixture-context">{date(next.date)} · {next.participants.length} joueurs</p><Link className="html-primary" href={'/matchs/' + next.id}>Voir le match <ArrowRight size={26}/></Link></> : <><p className="html-fixture-context">Le prochain rendez-vous reste à programmer.</p><Link className="html-primary" href={data.admin ? '/admin' : '/matchs'}>{data.admin ? 'Créer un match' : 'Voir les matchs'}<ArrowRight size={26}/></Link></>}</section>
      {pitchMatch && <><div className="html-team-label team-a">{teamName(pitchMatch, 'A')}</div><div className="html-team-label team-b">{teamName(pitchMatch, 'B')}</div><Link className="html-pitch-context" href={'/matchs/' + pitchMatch.id}>{pitchMatch.status === 'scheduled' && Date.parse(pitchMatch.date) > now ? 'Prochain match' : 'Dernières équipes'} · #{pitchMatch.number}</Link></>}
      {!pitchMatch && <span className="html-pitch-context">Joueurs de la ligue</span>}<div className="html-pitch-players">{lineup.map(({ player, side, fieldSide, slot, left, top, width }, i) => <Link href={'/joueurs/' + player!.id} className={'html-pitch-player ' + (side === 'B' ? 'white' : side === 'A' ? '' : 'unassigned-player')} key={player!.id} data-team={fieldSide} data-pitch-slot={slot} style={{ left, top, width, animationDelay: `${i * .23}s` }}><span className="html-pitch-tooltip"><b>{player!.name}</b><small>{summaries.find(s => s.player.id === player!.id)?.elo ?? '—'} ELO</small></span><span className="html-player-hex"><span>{player!.name.charAt(0).toUpperCase()}</span></span><span className="html-pitch-name">{player!.name}</span></Link>)}</div>
      <div className="html-shortcuts">{[['Matchs', '/matchs', `${done.length} joués`], ['Draft', '/draft', next ? weekday : '3 modes'], ['Joueurs', '/joueurs', String(active.length)], ['Stats', '/stats', `${goals} buts`], ['Awards', '/awards', '25 à gagner']].map(([name, href, value]) => <Link href={href} key={href}><span>{name}</span><strong>{value}</strong></Link>)}</div>
      <div className="html-season-bar"><div className="controls">{filters}</div><span><i/> {seasonName} · {active.length} joueurs</span></div>
    </DesignFrame>
    <DesignFrame id="h2" screen={1} label="Le vestiaire">
      <div className="html-room-floor" aria-hidden="true"/>{[100,400,700,1000,1300].map((left,i) => <i key={left} className="html-room-lamp" aria-hidden="true" style={{left,animationDelay:`${i*1.3}s`}}/>)}
      <div className="html-room-heading rvv"><span className="eyebrow accent">02 · Vestiaire</span><h2>Le <em>vestiaire</em></h2></div>
      {[0,1].map(side => <div className={'html-locker-wall wall-' + side} key={side}>{lineup.filter(p => p.fieldSide === (side === 0 ? 'A' : 'B')).map(({player:p,side:team}) => {
        const summary = summaries.find(s => s.player.id === p.id), playing = pitchMatch?.participants.some(s => s.playerId === p.id);
        return <Link className="html-locker" href={'/joueurs/' + p.id} key={p.id} data-team={team ?? 'unassigned'}><div className="html-locker-inside"><b>{summary?.elo ?? '—'}</b><small>ELO</small></div><div className="html-locker-door"><i style={{background:team === 'B' ? 'var(--bone)' : playing ? 'var(--kush)' : 'var(--ash)'}}/><strong>{p.name}</strong><small>{playing && pitchMatch && team ? teamName(pitchMatch, team) : 'JOUEUR'}</small></div></Link>;
      })}</div>)}
      <section className="html-room-match rvv"><span className="eyebrow accent">{next ? `PROCHAIN MATCH · MATCH ${next.number}` : 'LE RENDEZ-VOUS'}</span><h3>{next ? <>{weekday} <em>{kickoff}</em></> : 'À programmer'}</h3>{next ? <><div className="html-room-detail"><span>Date</span><b>{date(next.date)}</b></div><div className="html-room-detail"><span>Lieu</span><b>{next.location || 'À préciser'}</b></div><div className="html-room-detail"><span>Participants</span><b>{next.participants.length} joueurs</b></div><div className="html-match-schedule"><div><b>{time(next.date)}</b><span>Coup d’envoi</span></div><div><b>{time(new Date(new Date(next.date).getTime() + next.duration * 60000).toISOString())}</b><span>Coup de sifflet final</span></div></div></> : <p className="muted">Les disponibilités sont choisies sur WhatsApp. Le rendez-vous apparaîtra ici une fois ajouté par un administrateur.</p>}</section>
      <div className="html-room-bench" aria-hidden="true"/>
      <div className="html-calendar rvv">{next ? <><span className="eyebrow">＋ Ajouter à mon calendrier</span><Calendar match={next}/></> : <Link className="html-primary" href={data.admin ? '/admin' : '/matchs'}>Les rendez-vous <ArrowRight size={22}/></Link>}</div>
    </DesignFrame>
    <DesignFrame id="h4" screen={3} label="Questions fréquentes">
      <div className="html-grid" aria-hidden="true"/><div className="html-scan" aria-hidden="true"/>
      <div className="html-faq-heading rvv"><span className="eyebrow accent">03 · FAQ</span><h2>Des <em>questions</em> ?</h2><p>Tout ce qu’il faut savoir pour jouer, du sondage WhatsApp jusqu’à la publication des stats.</p><Link className="html-ghost" href="/glossaire">Voir les règles <ArrowRight size={18}/></Link></div>
      <div className="html-faq-list rvv">{questions.map(([question, answer], i) => <details name="home-faq" key={question} open={i === 0}><summary>{question}<span>＋</span></summary><p>{answer}</p></details>)}</div>
      <footer className="html-footer"><span>COPRO<b>{'//'}</b>LEAGUE · {seasonName}</span><div>{[['Matchs','/matchs'],['Joueurs','/joueurs'],['Stats','/stats'],['Replays','/replays']].map(([label,href]) => <Link href={href} key={href}>{label}</Link>)}</div><span>© 2026</span></footer>
    </DesignFrame>
  </div></div>;
}

// The export defines 1440 × 900 frames. Each frame fills the screen edge to edge: the
// scene is scaled to cover the frame, cropping at most 40px per side horizontally and
// 15 % vertically, so its panels stay visible. The canvas takes the frame size and
// --cx/--cy recentre the scene. Narrow screens reflow the content instead.
function DesignFrame({ children, hero = false, label, id, screen }: { children: React.ReactNode; hero?: boolean; label: string; id:string; screen:number }) {
  const outer = useRef<HTMLElement>(null), [fit, setFit] = useState({ scale: 1, width: 1440, height: hero ? 836 : 900 });
  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const visible = hero ? 836 : 900;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect, x = width / 1440, y = height / visible;
      const scale = Math.max(Math.min(x, y), Math.min(Math.max(x, y), width / 1360, y * 1.15)) || 1;
      setFit({ scale, width: width / scale, height: height / scale });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hero]);
  const style = { '--design-scale': fit.scale, '--canvas-w': `${fit.width}px`, '--canvas-h': `${fit.height + (hero ? 64 : 0)}px`, '--cx': `${(fit.width - 1440) / 2}px`, '--cy': `${(fit.height - (hero ? 836 : 900)) / 2}px` } as CSSProperties;
  return <section ref={outer} id={id} data-home-screen={screen} aria-label={label} className={'html-frame ' + (hero ? 'html-hero' : '')} style={style}><div className="html-canvas">{children}</div></section>;
}

/** The home pitch, reused for a match lineup: same scenery, hexagons and slots. */
export function MatchPitch({ match: m, players, onSelect }: { match: Match; players: Player[]; onSelect: (id: string) => void }) {
  const outer = useRef<HTMLDivElement>(null), [scale, setScale] = useState(1);
  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / 1000));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const roster = m.participants.flatMap(p => { const player = players.find(x => x.id === p.playerId); return player ? [{ player, side: p.team }] : []; });
  const lineup = homeLineup(roster), rating = (id: string) => m.participants.find(p => p.playerId === id)?.stats.rating;
  const extra = roster.filter(r => !lineup.some(l => l.player.id === r.player.id));
  return <div className="match-pitch">
    <div ref={outer} className="match-pitch-frame" style={{ '--design-scale': scale } as CSSProperties}><div className="match-pitch-canvas">
      <div className="html-scenery" aria-hidden="true" dangerouslySetInnerHTML={{ __html: homeScenery }}/>
      <div className="html-team-label team-a">{teamName(m, 'A')}</div><div className="html-team-label team-b">{teamName(m, 'B')}</div>
      <div className="html-pitch-players">{lineup.map(({ player, side, slot, left, top, width }, i) => <button type="button" onClick={() => onSelect(player.id)} className={'html-pitch-player ' + (side === 'B' ? 'white' : side === 'A' ? '' : 'unassigned-player')} key={player.id} data-pitch-slot={slot} style={{ left, top, width, animationDelay: `${i * .23}s` }}><span className="html-pitch-tooltip"><b>{player.name}</b><small>Note {fmt(rating(player.id))}</small></span><span className="html-player-hex"><span>{player.name.charAt(0).toUpperCase()}</span></span><span className="html-pitch-name">{player.name}</span></button>)}</div>
    </div></div>
    <div className="match-pitch-roster">{(['A', 'B'] as const).map(side => <div key={side}><h3>{teamName(m, side)}</h3>{roster.filter(r => r.side === side).map(({ player }) => <button type="button" key={player.id} onClick={() => onSelect(player.id)}><strong>{player.name}</strong><span>{fmt(rating(player.id))}</span></button>)}</div>)}</div>
    {extra.length > 0 && <p className="muted">Aussi dans ce match : {extra.map(r => r.player.name).join(', ')}.</p>}
  </div>;
}
