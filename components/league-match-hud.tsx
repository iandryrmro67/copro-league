'use client';
import { useState, type CSSProperties } from 'react';
import { metric, type Summary } from '@/lib/engine';
import { labels } from '@/lib/model';
import { Empty, Picker, fmt } from './league-ui';

export function MatchPerformances({ summaries, seasonSummaries, onSelect }: { summaries: Summary[]; seasonSummaries: Summary[]; onSelect: (id: string) => void }) {
  const [stat, setStat] = useState('rating');
  const ordered = summaries.filter(s => s.appearances && metric(s, stat) != null).sort((a, b) => metric(b, stat)! - metric(a, stat)!);
  function rank(s: Summary) { return ordered.filter(other => metric(other, stat)! > metric(s, stat)!).length + 1; }
  function tile(s: Summary, index: number) {
    const value = metric(s, stat);
    const season = seasonSummaries.find(row => row.player.id === s.player.id);
    const average = season ? metric(season, stat, true) : null;
    const delta = value != null && average != null ? value - average : null;
    const place = String(rank(s)).padStart(2, '0');
    const medal = index === 1 ? { '--mc': '#AEB8B2', '--mt': 'rgba(174,184,178,.16)', '--mg': 'rgba(174,184,178,.30)', '--sd': '0s' } : { '--mc': '#C07F45', '--mt': 'rgba(192,127,69,.18)', '--mg': 'rgba(192,127,69,.34)', '--sd': '1.2s' };
    return <button type="button" className={'tl pn kpop ' + (index === 0 ? 'l1' : index < 3 ? 'sp' : '')} key={s.player.id} onClick={() => onSelect(s.player.id)} style={{ '--i': index === 0 ? 0 : .5 + (index - 1) * .35, ...(index > 0 && index < 3 ? medal : {}) } as CSSProperties}>{index < 3 && <div className="gh">{place}</div>}<div className="rk">{place}{index === 0 ? ' · EN TÊTE' : index === 1 ? ' · ARGENT' : index === 2 ? ' · BRONZE' : ''}</div><div className="nm">{s.player.name}</div><span className={'up ' + (delta != null && delta < 0 ? 'dn' : '')}>{delta == null ? 'Moyenne non observée' : `${delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : '■ '}${fmt(delta, 2)} vs moy.`}</span><div className="vv">{fmt(value, stat === 'rating' ? 2 : 0)}</div><div className="lb">{labels[stat]} DU MATCH</div></button>;
  }
  return <section className="ds-rank"><div className="sectionhead"><h2>Les performances</h2><Picker label="Statistique du podium" value={stat} onChange={setStat} options={['rating', 'goals', 'assists', 'defensiveActions', 'recoveries'].map(key => ({ value: key, label: labels[key] }))}/></div>{ordered.length ? <div className="bento">{ordered.map(tile)}</div> : <Empty>Aucune donnée observée pour cette statistique.</Empty>}</section>;
}
