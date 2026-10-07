'use client';
import type { CSSProperties } from 'react';
import type { Summary } from '@/lib/engine';
import { metric } from '@/lib/engine';
import { cardRating, type Division } from '@/lib/divisions';
import { Avatar, fmt, StatInfo } from './league-ui';

export function DivisionBadge({ division }: { division?: Division | null }) {
  return <span className={'division ' + (division?.id ?? 'unranked')} title="Division par percentile d’ELO de la saison, hors filtre de période">{division?.name ?? 'Non classé'}</span>;
}

export function PlayerCard({ summary: s, division, compact = false }: { summary: Summary; division?: Division | null; compact?: boolean }) {
  return <div className={'hud-player-card ' + (division?.id ?? 'unranked') + (compact ? ' compact-card' : '')}>
    <div className="hud-card-top"><div><strong className="card-rating" title="Note moyenne convertie sur 99">{fmt(cardRating(s.stats.rating), 0)}</strong><small className="card-elo">ELO {s.elo}</small></div><DivisionBadge division={division}/></div>
    <div className="hud-card-portrait"><Avatar player={s.player} large/></div>
    <h2>{s.player.name}</h2>
    <div className="hud-card-stats">{[[s.stats.goals, 'BUTS'], [s.stats.assists, 'PASSES'], [s.appearances, 'MATCHS']].map(([v, label]) => <div key={String(label)}><strong>{fmt(v as number | null, 0)}</strong><span>{label}</span></div>)}</div>
  </div>;
}

export function StatRings({ summary, population }: { summary: Summary; population: Summary[] }) {
  const keys = ['defensiveActions', 'interceptions', 'goals', 'saves', 'shotsOnTarget', 'appearances', 'duelsWon', 'wins', 'assists', 'tackles'];
  return <section className="panel"><div className="sectionhead"><h2>Dans la ligue</h2><span className="eyebrow">LA STAT · LE RANG</span></div><div className="hud-stat-rings">{keys.map(key => {
    const values = population.filter(s => s.appearances > 0).map(s => metric(s, key)).filter((v): v is number => v != null);
    const value = metric(summary, key), max = Math.max(0, ...values);
    const rank = value == null || summary.appearances === 0 || !values.length ? null : values.filter(v => v > value).length + 1;
    const names: Record<string, string> = { defensiveActions: 'Actions déf.', interceptions: 'Interceptions', goals: 'Buts', saves: 'Arrêts', shotsOnTarget: 'Tirs cadrés', appearances: 'Matchs', duelsWon: 'Duels gagnés', wins: 'Victoires', assists: 'Passes déc.', tackles: 'Tacles' };
    return <div className="hud-ring-stat" key={key}><div className="hud-ring" style={{ '--progress': `${value == null || !max ? 0 : Math.min(100, value / max * 100)}%` } as CSSProperties}><strong>{fmt(value, 0)}</strong><small>/ {values.length ? fmt(max, 0) : '—'} MAX</small></div><span>{names[key]} <StatInfo stat={key}/></span><small className="eyebrow">{rank == null ? 'NON OBSERVÉ' : `RANG ${rank} / ${values.length}`}</small></div>;
  })}</div></section>;
}
