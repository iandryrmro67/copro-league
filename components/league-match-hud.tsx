'use client';
import { useState } from 'react';
import { metric, type Summary } from '@/lib/engine';
import { labels } from '@/lib/model';
import { Avatar, Empty, Picker, fmt } from './league-ui';

export function MatchPerformances({ summaries, seasonSummaries, onSelect }: { summaries: Summary[]; seasonSummaries: Summary[]; onSelect: (id: string) => void }) {
  const [stat, setStat] = useState('rating');
  const ordered = summaries.filter(s => s.appearances && metric(s, stat) != null).sort((a, b) => metric(b, stat)! - metric(a, stat)!);
  function rank(s: Summary) { return ordered.filter(other => metric(other, stat)! > metric(s, stat)!).length + 1; }
  function tile(s: Summary, index: number) {
    const value = metric(s, stat);
    const season = seasonSummaries.find(row => row.player.id === s.player.id);
    const average = season ? metric(season, stat, true) : null;
    const delta = value != null && average != null ? value - average : null;
    return <button type="button" className={'match-performance-tile place-' + rank(s)} key={s.player.id} onClick={() => onSelect(s.player.id)}><span className="eyebrow">{String(rank(s)).padStart(2, '0')} · {index < 3 ? 'PODIUM' : 'PERFORMANCE'}</span><Avatar player={s.player} large/><h3>{s.player.name}</h3><strong className="performance-value">{fmt(value, stat === 'rating' ? 2 : 0)}</strong><span className="eyebrow">{labels[stat]} DU MATCH</span><small className={delta != null && delta < 0 ? 'negative' : 'accent'}>{delta == null ? 'Moyenne non observée' : `${delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : '■ '}${fmt(delta, 2)} vs moy. de saison`}</small></button>;
  }
  return <section><div className="sectionhead"><h2>Les performances</h2><Picker label="Statistique du podium" value={stat} onChange={setStat} options={['rating', 'goals', 'assists', 'defensiveActions', 'recoveries'].map(key => ({ value: key, label: labels[key] }))}/></div>{ordered.length ? <><div className="match-podium">{ordered.slice(0, 3).map(tile)}</div><div className="match-rest">{ordered.slice(3).map((s, i) => tile(s, i + 3))}</div></> : <Empty>Aucune donnée observée pour cette statistique.</Empty>}</section>;
}
