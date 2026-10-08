'use client';
import { SourceCompareDomains } from './league-source-modules';
import { useState } from 'react';
import type { Match, Settings } from '@/lib/model';
import { labels } from '@/lib/model';
import { isGoal } from '@/lib/actions';
import { duos, metric, type Summary } from '@/lib/engine';
import { Avatar, Empty, Picker, Radar, fmt, date } from './league-ui';

export function PlayerCompare({ summary, population, settings }: { summary: Summary; population: Summary[]; settings: Settings }) {
  const [selected, setSelected] = useState('');
  const [mode, setMode] = useState('average');
  const other = population.find(s => s.player.id === selected) ?? population.find(s => s.player.id !== summary.player.id && s.appearances > 0);
  if (!other) return <Empty>Deux joueurs sont nécessaires pour comparer les performances.</Empty>;
  const keys = ['rating', 'goals', 'assists', 'ga', 'defensiveActions', 'recoveries', 'interceptions', 'passesCompleted', 'passPct', 'dribblesCompleted', 'duelPct', 'winRate', 'elo'];
  return <section className="profile-compare"><div className="controls filterrow"><Picker label="Joueur à comparer" value={other.player.id} onChange={setSelected} options={population.filter(s => s.player.id !== summary.player.id).map(s => ({ value: s.player.id, label: s.player.name }))}/><Picker label="Mode de comparaison" value={mode} onChange={setMode} options={[{ value: 'average', label: 'Par match observé' }, { value: 'total', label: 'Total' }]}/></div><SourceCompareDomains a={summary} b={other} population={population} minimum={settings.minRadar}/><div className="homegrid"><div><h2 className="compare-radar-name">{summary.player.name}</h2><Radar summary={summary} population={population} minimum={settings.minRadar}/></div><div><h2 className="compare-radar-name">{other.player.name}</h2><Radar summary={other} population={population} minimum={settings.minRadar}/></div></div><section className="panel filterrow"><div className="compare-players"><div><Avatar player={summary.player}/><h3>{summary.player.name}</h3></div><span className="eyebrow">COMPARAISON</span><div><Avatar player={other.player}/><h3>{other.player.name}</h3></div></div>{keys.map(key => {
    const a = metric(summary, key, mode === 'average'), b = metric(other, key, mode === 'average');
    return <div className="profile-compare-row" key={key}><strong className={a != null && b != null && a > b ? 'accent' : ''}>{fmt(a, key === 'rating' ? 2 : 1)}</strong><span>{labels[key]}{mode === 'average' && !['rating', 'elo', 'winRate', 'passPct', 'duelPct'].includes(key) ? ' / match' : ''}</span><strong className={a != null && b != null && b > a ? 'accent' : ''}>{fmt(b, key === 'rating' ? 2 : 1)}</strong></div>;
  })}<p className="muted">Même période et même saison. Les moyennes utilisent les matchs où la statistique est observée ; les données manquantes restent inconnues.</p></section></section>;
}

export function PlayerDuo({ summary, population, matches, minimum }: { summary: Summary; population: Summary[]; matches: Match[]; minimum: number }) {
  const [selected, setSelected] = useState('');
  const pairs = duos(population, matches, minimum).filter(pair => pair.a.id === summary.player.id || pair.b.id === summary.player.id);
  const partnerId = (pair: typeof pairs[number]) => pair.a.id === summary.player.id ? pair.b.id : pair.a.id;
  const pair = pairs.find(p => partnerId(p) === selected) ?? [...pairs].sort((a, b) => b.winRate - a.winRate || b.matches - a.matches)[0];
  if (!pair) return <Empty>Il faut au moins {minimum} matchs dans la même équipe pour comparer les associations.</Empty>;
  const partner = population.find(s => s.player.id === partnerId(pair));
  const games = matches.filter(m => m.status === 'finished' && m.participants.find(p => p.playerId === summary.player.id)?.team && m.participants.find(p => p.playerId === summary.player.id)?.team === m.participants.find(p => p.playerId === partnerId(pair))?.team);
  const goalsObserved = games.some(m => m.participants.some(p => [summary.player.id, partnerId(pair)].includes(p.playerId) && p.stats.goals != null));
  const assistsObserved = games.some(m => m.events.some(e => isGoal(e) && e.relatedPlayerId));
  return <section className="profile-duo"><div className="controls filterrow"><Picker label="Partenaire du duo" value={partnerId(pair)} onChange={setSelected} options={pairs.map(p => ({ value: partnerId(p), label: p.a.id === summary.player.id ? p.b.name : p.a.name }))}/></div><section className="panel"><span className="eyebrow accent">ENSEMBLE SUR LE TERRAIN</span><div className="duo-title"><Avatar player={summary.player} large/><h2>{summary.player.name}<span> + </span>{partner?.player.name}</h2><Avatar player={partner?.player} large/></div><div className="leaguebar compact">{[[pair.matches, 'MATCHS'], [pair.wins, 'VICTOIRES'], [fmt(pair.winRate) + ' %', 'VICTOIRES %'], [fmt(goalsObserved ? pair.goals : null, 0), 'BUTS DU DUO'], [fmt(assistsObserved ? pair.assists : null, 0), 'ASSISTS LIÉES']].map(([value, label]) => <div key={String(label)}><strong>{value}</strong><span className="eyebrow">{label}</span></div>)}</div><p className="muted">Les buts sont ceux inscrits par les deux joueurs dans leurs matchs partagés. Une saisie partielle peut sous-estimer ces totaux. Les assists nécessitent des buts avec passeur renseigné dans la timeline ; en leur absence, le total reste inconnu.</p></section><div className="sectionhead"><h2>Leurs matchs ensemble</h2></div><section className="panel flush">{games.map(m => <a className="matchrow" href={'/matchs/' + m.id} key={m.id}><span>{date(m.date)}</span><strong>Match #{m.number}</strong><strong>{m.scoreA} – {m.scoreB}</strong></a>)}</section></section>;
}
