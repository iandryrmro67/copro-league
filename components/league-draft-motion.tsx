'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Match, Player } from '@/lib/model';
import type { Summary } from '@/lib/engine';
import { teamName } from '@/lib/model';
import { cardRating } from '@/lib/divisions';
import { fmt } from './league-ui';
import { childNodes, hudTemplates, SourceTemplate, sourceAt, type SourceNode } from './hud-source-template';

export function SourceStage({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null), [scale, setScale] = useState(1);
  useEffect(() => {
    const observer = new ResizeObserver(entries => setScale(entries[0].contentRect.width / width));
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [width]);
  return <div ref={ref} className="source-stage-shell" style={{ aspectRatio: `${width}/${height}` }}><div style={{ width, height, transform: `scale(${scale})`, transformOrigin: '0 0' }}>{children}</div></div>;
}
const initials = (p: Player) => p.name.slice(0, 2).toUpperCase();
const nodes = (name: 'balancedStage' | 'captainStage', cls: string) => childNodes(hudTemplates[name]).filter(n => n.attrs.class === cls);

export function PackMotion({ summary, match, side, completed, pick, total, active, onComplete }: { summary?: Summary; match: Match; side?: 'A' | 'B'; completed: Summary[]; pick: number; total: number; active: boolean; onComplete: () => void }) {
  const stats = ['goals', 'assists', 'tackles', 'interceptions', 'duelsWon', 'saves'];
  const front = sourceAt(hudTemplates.pack, '5.0.0.1.0');
  const frontNodes = childNodes(front);
  const slots: Record<string, ReactNode> = {
    '0': <>DRAFT · <b>PICK {String(pick).padStart(2, '0')}</b> / {total} · {teamName(match, side ?? 'A').toUpperCase()}</>,
    '3': completed.slice(-4).map((s, i) => <div className="sl" key={s.player.id} style={{ left: i * 100 }}><b>{fmt(cardRating(s.stats.rating), 0)}</b><i>{initials(s.player)}</i></div>),
  };
  // The back, face, portrait, label, title and sub-stat nodes are the original card nodes.
  const back = sourceAt(hudTemplates.pack, '5.0.0.0.0');
  childNodes(back).forEach((n, i) => { if (n.tag === 'div' && n.children.some(c => typeof c === 'string' && c === 'LM')) slots[`5.0.0.0.0.${i}`] = summary ? initials(summary.player) : ''; });
  frontNodes.forEach((n, i) => {
    const text = n.children.filter(c => typeof c === 'string').join('');
    if (n.attrs.class === 'rat') slots[`5.0.0.1.0.${i}`] = <span>{fmt(cardRating(summary?.stats.rating), 0)}</span>;
    else if (text === 'LM') slots[`5.0.0.1.0.${i}`] = summary?.player.photo ? <img src={summary.player.photo} alt=""/> : summary ? initials(summary.player) : '';
    else if (text === 'LÉO MARTIN') slots[`5.0.0.1.0.${i}`] = summary?.player.name.toUpperCase();
    else if (text === 'ACTIONS DÉFENSIVES' || text === 'ACTIONS\nDÉFENSIVES') slots[`5.0.0.1.0.${i}`] = 'RATING';
    if (n.attrs.style?.includes('grid-template-columns:repeat(3')) {
      childNodes(n).forEach((cell, j) => {
        childNodes(cell).forEach((part, k) => { if (part.attrs.class?.startsWith('n')) slots[`5.0.0.1.0.${i}.${j}.${k}`] = fmt(summary?.stats[stats[j]], 0); });
      });
    }
  });
  // In the export the six stats use a positioned six-column block rather than a grid.
  const props: Record<string, Record<string, unknown>> = { '': { className: `t3 ${active ? 'playing' : 'settled'}`, 'aria-label': summary ? `Révélation de ${summary.player.name}` : 'Cartes révélées', style: { '--card-drop-x': side === 'B' ? '200px' : '-200px' } }, '5': { onAnimationEnd: (e: React.AnimationEvent) => { if (e.target === e.currentTarget) onComplete(); } } };
  function bind(n: SourceNode, path: string) {
    childNodes(n).forEach((child, i) => {
      const p = `${path}.${i}`, cls = child.attrs.class ?? '';
      if (/^n[0-5]$/.test(cls)) { slots[p] = fmt(summary?.stats[stats[Number(cls[1])]], 0); props[p] = { className: 'source-card-number' }; }
      if (cls === 'rat') { props[p] = { className: 'source-card-rating',style:{position:'static'} }; slots[p] = fmt(cardRating(summary?.stats.rating), 0); }
      const text = child.children.filter(c => typeof c === 'string').join('').trim();
      if (text.replace(/\s/g,'') === 'ACTIONSDÉFENSIVES') slots[p] = 'RATING';
      if (text === 'LM') slots[p] = summary ? initials(summary.player) : '';
      if (text === 'LÉO MARTIN') slots[p] = summary?.player.name.toUpperCase() ?? '';
      const bar = child.attrs.style?.match(/animation:dm_br([0-5])/);
      if (bar) props[p] = { style: { '--stat-scale': Math.min(1, (summary?.stats[stats[Number(bar[1])]] ?? 0) / 100) } }; 
      if (child.children.some(c => typeof c === 'string' && c.replace(/\s/g, '') === 'ACTIONSDÉFENSIVES')) slots[p] = 'RATING';
      bind(child, p);
    });
  }
  bind(hudTemplates.pack, '');
  // Paths start at the root, without a leading dot.
  for (const map of [slots, props]) for (const key of Object.keys(map)) if (key.startsWith('.')) { map[key.slice(1)] = map[key]; delete map[key]; }
  return <div className="ds-draft-motion"><SourceStage width={1440} height={900}><SourceTemplate name="pack" slots={slots} props={props}/></SourceStage></div>;
}

export function DistributionMotion({ match, players, teams, elos, revealed, mode, captains, seconds, currentSide, ready, onPick }: { match: Match; players: Player[]; teams: Record<string, 'A' | 'B'>; elos: Record<string, number>; revealed: number; mode: 'balanced' | 'captains'; captains: [string, string]; seconds: number; currentSide: 'A' | 'B'; ready: boolean; onPick: (id: string) => void }) {
  const balanced = mode === 'balanced', name = balanced ? 'balancedStage' : 'captainStage';
  const roots = childNodes(hudTemplates[name]), chip = nodes(name, 'chp')[balanced ? 0 : 2];
  const done = balanced ? players.slice(0, revealed) : players.filter(p => teams[p.id]);
  const sum = (side: 'A' | 'B') => done.filter(p => teams[p.id] === side).reduce((n, p) => n + elos[p.id], 0);
  const gap = Math.abs(sum('A') - sum('B')), height = balanced ? Math.max(850, 180 + players.length * 66) : Math.max(590, 250 + Math.ceil(players.length / 2) * 70);
  const angle = Math.max(-11, Math.min(11, (sum('B') - sum('A')) / Math.max(1, sum('A') + sum('B')) * 22));
  const assignedIds = Object.keys(teams);
  const cards = players.map((p, i) => {
    const side = teams[p.id], assigned = !!side, captain = captains.includes(p.id);
    const row = side ? assignedIds.filter(id => teams[id] === side).indexOf(p.id) : 0;
    const fromX = balanced ? 490 : i % 2 ? 666 : 354, fromY = balanced ? 96 + i * 66 : 150 + Math.floor(i / 2) * 70;
    const targetX = balanced ? side === 'A' ? 24 : 956 : side === 'A' ? 24 : 996;
    const targetY = balanced ? 96 + row * 66 : 130 + row * 66;
    const style = { width: balanced ? 340 : 300, '--tc': side === 'B' ? '#E9ECE6' : '#8BE36B', '--from-x': `${fromX}px`, '--from-y': `${fromY}px`, '--to-x': `${targetX}px`, '--to-y': `${targetY}px`, transform: `translate(${assigned ? targetX : fromX}px,${assigned ? targetY : fromY}px)`, animation: balanced ? `dm_assign 1.2s linear ${1.4 + i * 1.5}s both` : assigned && !captain ? 'dm_captain_pick 1.1s linear both' : 'none' } as CSSProperties;
    const card = <SourceTemplate node={chip} slots={{ '0': initials(p), '1': p.name, '2': elos[p.id] }} props={{ '': { className: `chp ${captain ? 'source-captain' : ''}`, style } }}/>;
    return !balanced && !assigned ? <button type="button" className="source-pick-target" style={{ left: fromX, top: fromY, width: 300, height: 58 }} key={p.id} onClick={() => onPick(p.id)} aria-label={`Choisir ${p.name}`}><SourceTemplate node={chip} slots={{ '0': initials(p), '1': p.name, '2': elos[p.id] }} props={{ '': { style: { width: 300, transform: 'none', animation: 'none', '--tc': '#8E978C' } } }}/></button> : <div key={p.id}>{card}{captain && <span className="source-captain-marker" style={{ left: targetX + 254, top: targetY + 18 }}>C</span>}</div>;
  });
  const beam = roots.at(-1)!;
  return <div className="ds-draft-motion"><SourceStage width={1320} height={height}><SourceTemplate name={name} props={{ '': { style: { width: 1320, height } } }} slots={{ '': <>
    <SourceTemplate node={roots[0]} slots={{ '': <>{teamName(match, 'A')} {balanced && <small>Σ ELO</small>}</> }}/><SourceTemplate node={roots[1]} slots={{ '': <>{balanced && <small>Σ ELO</small>} {teamName(match, 'B')}</> }}/><SourceTemplate node={roots[2]} slots={{ '': balanced ? 'CLASSEMENT ELO' : `VIVIER · ${players.filter(p => !teams[p.id]).length} JOUEURS` }}/>
    {players.map((p, i) => <div key={p.id} className="slot" style={{ left: balanced ? 490 : i % 2 ? 666 : 354, top: balanced ? 96 + i * 66 : 150 + Math.floor(i / 2) * 70, width: balanced ? 340 : 300, height: 58 }}/>)}{cards}
    {balanced ? <><div className="stk source-sum" style={{ left: 24, top: height - 78, color: '#8BE36B' }}>{sum('A')}</div><div className="stk source-sum" style={{ right: 24, top: height - 78, color: '#E9ECE6' }}>{sum('B')}</div><div className="stk source-gap" style={{ top: height - 78 }}>{gap}</div><SourceTemplate node={beam} props={{ '': { style: { top: height - 92 } }, '1': { style: { animation: 'none', transform: `rotate(${angle}deg)`, transition: 'transform .6s ease-in-out' } } }}/></> : <div className="source-captain-turn" role="timer">{ready ? 'Équipes prêtes' : <>AU TOUR DE {players.find(p => p.id === captains[currentSide === 'A' ? 0 : 1])?.name.toUpperCase()} · {teamName(match, currentSide).toUpperCase()}<strong>{String(seconds).padStart(2, '0')} s</strong></>}</div>}
  </> }}/></SourceStage></div>;
}
