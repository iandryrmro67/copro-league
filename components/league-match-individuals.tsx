'use client';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { Match } from '@/lib/model';
import { teamName } from '@/lib/model';
import type { Summary } from '@/lib/engine';
import { Heatmaps, RatingExplanation } from './league-analysis';
import { Empty, fmt } from './league-ui';
import { SourceIndividualHero, SourceMatchRadar, SourceStatsTiles } from './league-source-modules';

export function MatchIndividuals({ match, summaries, seasonSummaries, selected, onSelect }: { match: Match; summaries: Summary[]; seasonSummaries: Summary[]; selected: string; onSelect: (id: string) => void }) {
  const rows = summaries.filter(s => match.participants.some(p => p.playerId === s.player.id)).sort((a, b) => (b.stats.rating ?? -1) - (a.stats.rating ?? -1));
  const summary = rows.find(s => s.player.id === selected) ?? rows[0];
  if (!summary) return <Empty>Les statistiques individuelles apparaîtront après l’ajout des participants.</Empty>;
  return <section className="ds-individual"><div className="lay"><aside className="rail"><h5>JOUEURS<span>PAR NOTE</span></h5>{rows.map((s, i) => {
    const side = match.participants.find(p => p.playerId === s.player.id)?.team, color = side === 'B' ? '#E9ECE6' : '#8BE36B';
    return <button type="button" className="rw" aria-pressed={summary.player.id === s.player.id} key={s.player.id} style={{ '--tk': color, color } as CSSProperties} onClick={() => onSelect(s.player.id)}><span className="nb">{String(i + 1).padStart(2, '0')}</span><div className="cd" style={{ borderColor: color }}>{s.player.name.slice(0, 2).toUpperCase()}</div><div><b style={{ color: '#E9ECE6' }}>{s.player.name}</b><small>{teamName(match, side ?? '')}</small></div><em>{fmt(s.stats.rating, 1)}</em><div className="mb"><i style={{ width: `${Math.min(100, Math.max(0, (s.stats.rating ?? 0) * 10))}%`, color }}/></div></button>;
  })}</aside><div><SourceIndividualHero summary={summary} match={match} population={rows} seasonSummary={seasonSummaries.find(s => s.player.id === summary.player.id)}/><div className="r2"><SourceMatchRadar summary={summary} population={rows}/><Heatmaps matches={[match]} playerId={summary.player.id} playerName={summary.player.name}/></div><SourceStatsTiles summary={summary} population={rows}/><RatingExplanation match={match} playerId={summary.player.id}/><Link className="button filterrow" href={'/joueurs/' + summary.player.id}>Voir le profil de {summary.player.name}</Link></div></div></section>;
}
