'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { League, Match } from '@/lib/model';
import { teamName } from '@/lib/model';
import { eligible, youtubeId, type Summary } from '@/lib/engine';
import { divisionFor } from '@/lib/divisions';
import { Avatar, Calendar, Empty, LeaderCard, date, fmt, time } from './league-ui';
import { DivisionBadge } from './league-hud';
import { ArrowRight, MapPin, Play, Trophy } from 'lucide-react';

export function Replays({ matches }: { matches: Match[] }) {
  const replays = matches.filter(m => m.video).sort((a, b) => b.date.localeCompare(a.date));
  return <div className="leadersgrid">{replays.map(m => {
    const id = youtubeId(m.video);
    return <Link className="panel replay-card" key={m.id} href={'/matchs/' + m.id + '?tab=video'}>{id ? <img className="videothumb" src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt={`Replay du match ${m.number}`} loading="lazy"/> : <div className="replay-placeholder"><Play size={40}/></div>}<span className="eyebrow">{date(m.date)} · REPLAY</span><h3>Match #{m.number}</h3><p>{m.scoreA == null ? 'À venir' : `${m.scoreA} – ${m.scoreB}`}</p></Link>;
  })}{!replays.length && <Empty>Les replays apparaîtront ici une fois les vidéos ajoutées.</Empty>}</div>;
}

export function Home({ data, summaries, matches, seasonName, filters, divisionPopulation }: { data: League; summaries: Summary[]; matches: Match[]; seasonName: string; filters: React.ReactNode; divisionPopulation: Summary[] }) {
  const [now] = useState(() => Date.now());
  const next = [...matches].filter(m => m.status === 'scheduled' && new Date(m.date).getTime() > now).sort((a, b) => a.date.localeCompare(b.date))[0];
  const done = matches.filter(m => m.status === 'finished');
  const last = done[0];
  const eloLeaders = summaries.filter(s => s.appearances > 0 && !s.player.archived).sort((a, b) => b.elo - a.elo).slice(0, 5);
  const goals = done.reduce((n, m) => n + (m.scoreA ?? 0) + (m.scoreB ?? 0), 0);
  const scorer = [...summaries].filter(s => s.stats.assists != null).sort((a, b) => (b.stats.assists ?? 0) - (a.stats.assists ?? 0))[0];
  const wildest = [...done].sort((a, b) => (b.scoreA ?? 0) + (b.scoreB ?? 0) - (a.scoreA ?? 0) - (a.scoreB ?? 0))[0];
  const roster = next?.participants.map(p => ({ player: data.players.find(x => x.id === p.playerId), side: p.team })).filter(p => p.player).sort((a,b) => (a.side === 'A' ? 0 : a.side === 'B' ? 1 : 2) - (b.side === 'A' ? 0 : b.side === 'B' ? 1 : 2)) ?? [];
  const active = data.players.filter(p => !p.archived && summaries.some(s => s.player.id === p.id));
  const weekday = next ? new Date(next.date).toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' }) : 'On joue';
  const questions = [
    ['Comment préparer un match ?', 'Un administrateur crée le match et sélectionne ses participants. La fiche du match rassemble la date, le lieu et les équipes.'],
    ['Comment sont tirées les équipes ?', 'Trois modes sont disponibles : cartes, équilibré par ELO ou capitaine. Sélectionne les participants puis lance le tirage.'],
    ['Comment marche l’ELO ?', 'Les victoires, nuls et défaites font évoluer l’ELO selon la force des équipes. Battre une équipe plus forte rapporte davantage de points.'],
    ['Où revoir les matchs ?', 'Ouvre les replays ou l’onglet Vidéo d’un match. Les actions horodatées de la timeline permettent de rejoindre le passage correspondant.'],
    ['Que signifient les divisions ?', 'Régional, National, Ligue 2 et Ligue 1 sont calculés par percentile d’ELO dans la saison : moitié basse, top 50 %, top 20 % et top 5 %. Les ex æquo partagent la même division.'],
    ['Qui saisit les stats ?', 'Un administrateur analyse la vidéo et enregistre les actions. Une statistique non observée reste un tiret ; elle ne devient jamais un zéro.'],
  ];
  return <div className="hud-home">
    <div className="controls home-filters">{filters}</div>
    {!data.seasons.length && <section className="panel welcome"><h2>Votre histoire commence au prochain match.</h2><p>Créez une saison et ajoutez vos joueurs pour ouvrir le vestiaire.</p>{data.admin && <Link className="button primary" href="/admin">Configurer la ligue <ArrowRight size={16}/></Link>}</section>}
    <section className="home-lobby" aria-label="Le prochain rendez-vous">
      <div className="home-field" aria-hidden="true"><i className="field-center"/></div>
      <div className="home-roster">{roster.slice(0, 10).map(({ player, side }, i) => <Link href={'/joueurs/' + player!.id} className={'field-player ' + (side === 'B' ? 'white' : side === 'A' ? '' : 'unassigned-player')} key={player!.id} style={{ left: `${12 + (i % 5) * 18}%`, top: i < 5 ? '26%' : '60%' }}><Avatar player={player}/><span>{player!.name}</span></Link>)}</div>
      <section className="home-elo panel"><div className="split"><h3>Classement ELO</h3><span className="eyebrow">TOP 5</span></div>{eloLeaders.map((s, i) => {
        const delta = s.history.at(-1)?.delta;
        return <Link className="home-elo-row" href={'/joueurs/' + s.player.id} key={s.player.id}><span className="eyebrow">{String(i + 1).padStart(2, '0')}</span><div><strong>{s.player.name}</strong><DivisionBadge division={divisionFor(s.player.id, divisionPopulation)}/></div><b>{s.elo}<small className={delta != null && delta < 0 ? 'negative' : 'accent'}>{delta == null ? '—' : delta > 0 ? `▲ ${delta}` : delta < 0 ? `▼ ${Math.abs(delta)}` : '—'}</small></b></Link>;
      })}{!eloLeaders.length && <Empty>Le classement commence après le premier match.</Empty>}<Link className="textbutton" href="/stats">Voir tout ↗</Link></section>
      <div className="home-emblem"><img src="/brand/monogram-bone.png" alt=""/></div>
      <section className="home-fixture panel"><span className="eyebrow accent">{next ? 'PROCHAIN MATCH · #' + next.number : 'PROCHAIN MATCH'}</span><h1><span>{weekday}</span><br/><em>{next ? time(next.date) : 'quand ?'}</em></h1>{next ? <><p className="fixture-teams">{teamName(next, 'A')}<span>VS</span>{teamName(next, 'B')}</p><p className="matchmeta"><MapPin size={14}/>{next.location || 'Lieu à préciser'}</p><p className="eyebrow">{date(next.date)} · {next.participants.length} participants</p><Link className="button primary wide" href={'/matchs/' + next.id}>Voir le match <ArrowRight size={16}/></Link></> : <><p className="muted">Le prochain rendez-vous reste à programmer.</p>{data.admin && <Link className="button primary wide" href="/admin">Créer un match <ArrowRight size={16}/></Link>}</>}</section>
      <div className="home-shortcuts">{[['Matchs', '/matchs', `${done.length} joués`], ['Draft', '/draft', '3 modes'], ['Joueurs', '/joueurs', String(active.length)], ['Stats', '/stats', `${goals} buts`], ['Awards', '/awards', '25 trophées']].map(([name, href, value]) => <Link href={href} key={href}><strong>{name}</strong><span>{value} ↗</span></Link>)}</div>
      <div className="home-season eyebrow"><i/>{seasonName} · {active.length} joueurs</div>
    </section>
    <section className="home-lockers home-section"><div><span className="eyebrow accent">02 · VESTIAIRE</span><h2>Le <em>vestiaire</em></h2></div><div className="home-locker-layout"><div className="lockers-grid">{active.slice(0, 10).map(p => {
      const summary = summaries.find(s => s.player.id === p.id);
      const playing = next?.participants.some(s => s.playerId === p.id);
      return <Link className="locker" href={'/joueurs/' + p.id} key={p.id}><div className="locker-inside"><strong>{summary?.elo ?? '—'}</strong><span className="eyebrow">ELO</span></div><div className="locker-door"><i className={playing ? 'selected-shirt' : ''}/><Avatar player={p}/><strong>{p.name}</strong><small>{playing ? 'PARTICIPANT' : 'JOUEUR'}</small></div></Link>;
    })}</div><section className="panel locker-match"><span className="eyebrow accent">{next ? `PROCHAIN MATCH · #${next.number}` : 'LE RENDEZ-VOUS'}</span><h3>{next ? `${weekday} ${time(next.date)}` : 'À programmer'}</h3>{next && <><div className="statrow"><span>Date</span><strong>{date(next.date)}</strong></div><div className="statrow"><span>Lieu</span><strong>{next.location || '—'}</strong></div><div className="statrow"><span>Participants</span><strong>{next.participants.length}</strong></div><div className="statrow"><span>Durée</span><strong>{next.duration} min</strong></div><Calendar match={next}/></>}</section></div></section>
    <section className="home-numbers home-section"><span className="eyebrow accent">03 · CHIFFRES</span><h2>La saison <em>en chiffres</em></h2><p className="eyebrow">{seasonName} · {done.length} matchs joués</p><div className="season-numbers">{[
      [String(goals), 'Buts marqués', `${done.length} matchs · ${fmt(done.length ? goals / done.length : null)} par match`],
      [wildest ? `${wildest.scoreA}–${wildest.scoreB}` : '—', 'Score le plus fou', wildest ? `Match #${wildest.number} · ${date(wildest.date)}` : 'En attente du premier résultat'],
      [fmt(scorer?.stats.assists, 0), 'Passes décisives', scorer ? `${scorer.player.name}, meilleur passeur` : 'Données non observées'],
      [`${done.filter(m => Math.abs((m.scoreA ?? 0) - (m.scoreB ?? 0)) === 1).length}/${done.length}`, 'Matchs serrés', 'Décidés à un seul but d’écart'],
      [eloLeaders[0] ? String(eloLeaders[0].elo) : '—', 'ELO en tête', eloLeaders[0]?.player.name ?? 'Classement à venir'],
    ].map(([value, label, context], i) => <div key={label}><span className="eyebrow accent">{String(i + 1).padStart(2, '0')}</span><strong>{value}</strong><h3>{label}</h3><p>{context}</p></div>)}</div></section>
    <section className="home-faq home-section"><div><span className="eyebrow accent">04 · FAQ</span><h2>Des <em>questions</em> ?</h2><p className="muted">Du prochain match aux stats, les repères pour jouer ensemble.</p><Link className="button" href="/glossaire">Comprendre les règles</Link></div><div className="faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<span>＋</span></summary><p>{answer}</p></details>)}</div></section>
    {last && <section className="panel home-last"><span className="eyebrow">COUP DE SIFFLET FINAL · {date(last.date)}</span><Link href={'/matchs/' + last.id}><div className="score">{last.scoreA}<span>–</span>{last.scoreB}</div><p className="fixture-teams">{teamName(last, 'A')} · {teamName(last, 'B')}</p></Link>{last.mvpId && <Link className="mvpline" href={'/joueurs/' + last.mvpId}><Trophy size={20}/><strong>{data.players.find(p => p.id === last.mvpId)?.name} · MVP</strong></Link>}</section>}
    {!!done.length && <><div className="sectionhead"><h2>Les leaders de la saison</h2></div><div className="leadersgrid">{[['Buteurs', 'goals'], ['Passeurs', 'assists'], ['Les mieux notés', 'rating']].map(([title, key]) => <LeaderCard key={key} title={title} stat={key} summaries={summaries.filter(s => eligible(s, key, data.settings))}/>)}</div></>}
    {matches.some(m => m.video) && <><div className="sectionhead"><h2>Les derniers replays</h2><Link className="textbutton" href="/replays">Voir tout ↗</Link></div><Replays matches={matches.filter(m => m.video).slice(0, 3)}/></>}
  </div>;
}
