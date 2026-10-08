'use client';
import type { Summary } from '@/lib/engine';
import { cardRating, type Division } from '@/lib/divisions';
import { Avatar, fmt } from './league-ui';

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

export { SourceStatRings as StatRings } from "./league-source-modules";
