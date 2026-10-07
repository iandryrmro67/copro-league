'use client';
import { useEffect, useReducer, useState } from 'react';
import type { League, Match } from '@/lib/model';
import { teamName } from '@/lib/model';
import { aggregate, balancedDraft } from '@/lib/engine';
import { divisionFor } from '@/lib/divisions';
import { CAPTAIN_PICK_SECONDS, captainDraftReducer, emptyCaptainDraft } from '@/lib/captain-draft';
import { Picker, Avatar } from './league-ui';
import { PlayerCard } from './league-hud';
import { Checkbox } from '@/components/ui/checkbox';
import { Lock, Unlock, Shuffle, Check, ArrowLeftRight, Layers, Scale, Users } from 'lucide-react';

const modes = [
  { id: 'pack', name: 'Cartes', text: 'Chaque joueur se révèle sous forme de carte puis rejoint son équipe.', meta: 'RÉVÉLATION · SUSPENSE' },
  { id: 'balanced', name: 'Équilibré', text: 'Deux équipes dont les sommes d’ELO sont les plus proches possible.', meta: 'AUTOMATIQUE · ÉQUITABLE' },
  { id: 'captains', name: 'Capitaine', text: 'Deux capitaines choisissent à tour de rôle dans le vivier.', meta: 'À TOUR DE RÔLE · STRATÉGIE' },
];

export function Draft({ data, refresh, match: external, onApply }: { data: League; refresh: () => Promise<League>; match?: Match; onApply?: (m: Match) => void }) {
  const [matchId, setMatchId] = useState(external?.id ?? data.matches.find(m => m.status === 'scheduled')?.id ?? '');
  const base = external ?? data.matches.find(m => m.id === matchId);
  const [roster, setRoster] = useState<string[] | null>(null);
  const [mode, setMode] = useState('balanced');
  const [{teams,turn,deadline,now,automaticPlayerId}, dispatchDraft] = useReducer(captainDraftReducer, emptyCaptainDraft);
  const [locks, setLocks] = useState<Record<string, 'A' | 'B'>>({});
  const [reveal, setReveal] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [capA, setCapA] = useState('');
  const [capB, setCapB] = useState('');
  const m: Match = base ? { ...base, participants: roster ? roster.map(id => base.participants.find(p => p.playerId === id) ?? { playerId: id, team: null, stats: {} }) : base.participants } : { id: 'draft-preview', seasonId: '', number: 1, date: '', duration: 60, location: '', status: 'scheduled', scoreA: null, scoreB: null, mvpId: null, level: 1, video: '', events: [], trackedKeys: [], version: 0, participants: (roster ?? []).map(id => ({ playerId: id, team: null, stats: {} })) };
  const allSummaries = aggregate(data.players, data.matches);
  const elos = Object.fromEntries(allSummaries.map(s => [s.player.id, s.elo]));
  const population = aggregate(data.players, data.matches.filter(game => game.seasonId === (m.seasonId || data.seasons.find(s => s.status === 'active')?.id)), data.matches);
  const players = data.players.filter(p => !p.archived && !p.demo && m.participants.some(x => x.playerId === p.id)).sort((a, b) => elos[b.id] - elos[a.id] || a.name.localeCompare(b.name));
  const generated = Object.keys(teams).length > 0;
  const complete = players.length > 1 && players.every(p => teams[p.id]);
  const revealed = mode === 'captains' ? players.filter(p => teams[p.id]) : players.slice(0, reveal).filter(p => teams[p.id]);
  const ready = complete && (mode === 'captains' || reveal === players.length);
  const sum = (side: 'A' | 'B') => revealed.filter(p => teams[p.id] === side).reduce((total, p) => total + elos[p.id], 0);
  const gap = Math.abs(sum('A') - sum('B'));
  const countA = players.filter(p => teams[p.id] === 'A').length;
  const countB = players.filter(p => teams[p.id] === 'B').length;
  const equalTeams = ready && countA === countB;
  const captainSide = turn % 2 === 0 ? 'A' : 'B';
  const currentCard = mode === 'pack' && reveal > 0 ? allSummaries.find(s => s.player.id === players[reveal - 1]?.id) : undefined;

  useEffect(() => {
    if (mode !== 'balanced' || !generated || reveal >= players.length) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setReveal(value => reduced ? players.length : value + 1), reduced ? 0 : 350);
    return () => window.clearTimeout(timer);
  }, [mode, generated, reveal, players.length]);

  const playerIdsKey = JSON.stringify(players.map(p => p.id));
  const secondsLeft = deadline == null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000));
  useEffect(() => {
    if (mode !== 'captains' || deadline === null) return;
    const playerIds = JSON.parse(playerIdsKey) as string[];
    const timer = window.setInterval(() => dispatchDraft({ type: 'tick', playerIds, turn, deadline, now: Date.now(), random: Math.random() }), 250);
    return () => window.clearInterval(timer);
  }, [mode, deadline, turn, playerIdsKey]);

  function reset() { dispatchDraft({type:'reset'}); setReveal(0); setNotice(''); setError(''); }
  function generate() {
    // eslint-disable-next-line react-hooks/purity -- This timestamp is read only by the launch button's click handler, never during render.
    const startedAt = Date.now();
    setError(''); setNotice(''); setReveal(0);
    try {
      if (players.length < 2 || players.length > 20 || players.length % 2) throw Error('Choisissez un nombre pair de 2 à 20 joueurs.');
      if (mode === 'captains') {
        if (!capA || !capB || capA === capB || !players.some(p => p.id === capA) || !players.some(p => p.id === capB)) throw Error('Choisissez deux capitaines différents parmi les participants.');
        dispatchDraft({type:'start',captainA:capA,captainB:capB,playerIds:players.map(p=>p.id),now:startedAt}); return;
      }
      const result = balancedDraft(players, elos, mode === 'balanced' ? locks : {}, mode === 'pack', 'elo');
      dispatchDraft({type:'assign',teams:{ ...Object.fromEntries(result.A.map(id => [id, 'A' as const])), ...Object.fromEntries(result.B.map(id => [id, 'B' as const])) }});
    } catch (e) { dispatchDraft({type:'reset'}); setError((e as Error).message); }
  }
  async function apply() {
    if (!base || !equalTeams) return;
    setBusy(true); setError('');
    try {
      const next = { ...m, participants: m.participants.map(p => ({ ...p, team: teams[p.playerId] ?? null })) };
      if (onApply) onApply(next);
      else {
        const response = await fetch('/api/matches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw Error(result.error ?? 'Enregistrement impossible');
        await refresh();
      }
      setNotice('Équipes validées. La feuille de match est à jour.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <div className="draftroom">
    <div className="draftsteps">{['MODE', 'JOUEURS', 'TIRAGE', 'ÉQUIPES'].map((label, i) => <span key={label} className={(ready ? i === 3 : generated ? i === 2 : players.length ? i === 1 : i === 0) ? 'active' : ''}>{String(i + 1).padStart(2, '0')} · {label}</span>)}</div>
    {!base && <p className="muted">Tirage libre. Pour enregistrer ces équipes, créez un match dans l’administration.</p>}
    {!external && <div className="filterrow"><Picker label="Match à préparer" value={matchId} onChange={value => { setMatchId(value); setRoster(null); setLocks({}); setCapA(''); setCapB(''); reset(); }} options={data.matches.filter(game => game.status === 'scheduled').map(game => ({ value: game.id, label: `Match #${game.number} · ${data.seasons.find(s => s.id === game.seasonId)?.name}` }))}/></div>}
    <div className="sectionhead"><div><span className="eyebrow accent">01 · MODE</span><h2>Comment on tire ?</h2></div></div>
    <div className="draft-modes" role="group" aria-label="Mode de tirage">{modes.map((item, i) => <button type="button" className={'draft-mode ' + (mode === item.id ? 'active' : '')} aria-pressed={mode === item.id} key={item.id} onClick={() => { setMode(item.id); setLocks({}); reset(); }}><span className="draft-mode-number" aria-hidden="true">0{i + 1}</span>{i === 0 ? <Layers className="draft-mode-icon"/> : i === 1 ? <Scale className="draft-mode-icon"/> : <Users className="draft-mode-icon"/>}<strong>{item.name}</strong><p>{item.text}</p><span className="eyebrow">{item.meta}</span></button>)}</div>
    <section className="panel draftselection"><div className="split"><div><span className="eyebrow accent">02 · PARTICIPANTS</span><h2>Qui joue ce soir ?</h2></div><span className="tag">{players.length} sélectionnés</span></div><p className="muted">Sélectionnez les joueurs retenus dans le sondage WhatsApp : un nombre pair, de 2 à 20.</p><div className="participantsgrid">{data.players.filter(p => !p.archived && !p.demo).map(p => <label className="participantchoice" key={p.id}><Checkbox checked={players.some(x => x.id === p.id)} onCheckedChange={checked => { setRoster(checked ? [...players.map(x => x.id), p.id] : players.filter(x => x.id !== p.id).map(x => x.id)); setLocks({}); setCapA(''); setCapB(''); reset(); }}/><Avatar player={p}/><span>{p.name}</span><span className="participant-elo">{elos[p.id]} <small>ELO</small></span></label>)}</div></section>
    <section className="panel"><div className="split"><div><span className="eyebrow accent">03 · TIRAGE</span><h2>{modes.find(item => item.id === mode)?.name}</h2><p className="muted">{players.length} participants · {mode === 'balanced' ? 'Sommes d’ELO les plus proches, sous les verrouillages.' : mode === 'captains' ? 'Choix alternés : A, B, A, B… · 60 secondes par choix. À zéro, un joueur disponible est tiré au sort.' : 'Révélation progressive · équilibre par ELO.'}</p></div><button type="button" className="button primary" onClick={generate} disabled={busy}><Shuffle size={16}/>{generated ? 'Relancer' : 'Lancer le tirage'}</button></div>
      {mode === 'captains' && <div className="formgrid filterrow"><Picker label={'Capitaine ' + teamName(m, 'A')} value={capA} onChange={value => { setCapA(value); reset(); }} options={players.map(p => ({ value: p.id, label: p.name }))}/><Picker label={'Capitaine ' + teamName(m, 'B')} value={capB} onChange={value => { setCapB(value); reset(); }} options={players.map(p => ({ value: p.id, label: p.name }))}/></div>}
      {mode === 'pack' && generated && <div className="draftreveal"><p className="eyebrow">PICK {String(reveal).padStart(2, '0')} / {players.length}</p>{currentCard ? <PlayerCard key={currentCard.player.id} summary={currentCard} division={divisionFor(currentCard.player.id, population)}/> : <button className="packcard" onClick={() => setReveal(1)}><img src="/brand/monogram-bone.png" alt=""/><span>RÉVÉLER LA PREMIÈRE CARTE</span></button>}{reveal > 0 && reveal < players.length && <button className="button primary" onClick={() => setReveal(value => value + 1)}>Révéler la carte suivante →</button>}</div>}
      {mode === 'captains' && generated && !complete && <div className="captainpool"><div className="split captain-turn"><h3>Au tour de {data.players.find(p => p.id === (captainSide === 'A' ? capA : capB))?.name} · {teamName(m, captainSide)}</h3><div className={'captain-clock '+(secondsLeft <= 10 ? 'urgent' : '')} role="timer" aria-label={'Temps restant pour ce choix : '+secondsLeft+' secondes'}><span className="eyebrow">TEMPS RESTANT</span><strong>{String(secondsLeft).padStart(2,'0')}<small> s</small></strong><div className="captain-clock-track" aria-hidden="true"><i style={{width:`${secondsLeft/CAPTAIN_PICK_SECONDS*100}%`}}/></div></div></div><div className="actions">{players.filter(p => !teams[p.id]).map(p => <button className="button" key={p.id} onClick={() => { if(deadline !== null)dispatchDraft({type:'pick',playerId:p.id,playerIds:players.map(x=>x.id),now:Date.now(),turn,deadline}); }}><Avatar player={p}/>{p.name}<small>{elos[p.id]} ELO</small></button>)}</div></div>}
      {mode === 'captains' && automaticPlayerId && <p className="captain-auto" role="status">Temps écoulé : {data.players.find(p=>p.id===automaticPlayerId)?.name} a été tiré au sort pour {teamName(m,teams[automaticPlayerId])}.</p>}
      {generated && <div className="draft-balance"><div><span className="eyebrow">{teamName(m, 'A')} · Σ ELO</span><strong className="accent">{sum('A')}</strong></div><span className="tag">ÉCART {gap}</span><div><span className="eyebrow">{teamName(m, 'B')} · Σ ELO</span><strong>{sum('B')}</strong></div><div className="draft-balance-meter"><i style={{ width: `${sum('A') + sum('B') ? sum('A') / (sum('A') + sum('B')) * 100 : 50}%` }}/></div></div>}
      <div className="draftteams">{(['A', 'B'] as const).map(side => <section key={side}><div className="split"><h3>{teamName(m, side)}</h3><span className="eyebrow">{revealed.filter(p => teams[p.id] === side).length} joueurs</span></div>{revealed.filter(p => teams[p.id] === side).map(p => <div className="draftplayer" key={p.id}><Avatar player={p}/><strong>{p.name}</strong><small>{elos[p.id]} ELO</small>{mode === 'balanced' && ready && <button className="iconbutton" aria-label={(locks[p.id] ? 'Déverrouiller ' : 'Verrouiller ') + p.name} onClick={() => setLocks(current => { const updated = { ...current }; if (updated[p.id]) delete updated[p.id]; else updated[p.id] = side; return updated; })}>{locks[p.id] ? <Lock size={15}/> : <Unlock size={15}/>}</button>}{mode !== 'pack' && ready && <button className="iconbutton" aria-label={'Déplacer ' + p.name} onClick={() => { dispatchDraft({type:'move',playerId:p.id,team:side === 'A' ? 'B' : 'A'}); setLocks(current => { const updated = { ...current }; delete updated[p.id]; return updated; }); }}><ArrowLeftRight size={16}/></button>}</div>)}</section>)}</div>
      {ready && <div className="split draftresult"><p>{equalTeams ? 'Équipes prêtes' : 'Rééquilibrez le nombre de joueurs avant de valider.'} · écart <strong className="accent">{gap} ELO</strong></p>{base && (data.admin || onApply) && <button className="button primary" disabled={busy || !equalTeams} onClick={apply}><Check size={16}/>Valider les équipes</button>}</div>}
      {!generated && <p className="muted filterrow">Choisis tes participants, puis lance le tirage.</p>}
    </section>
    {error && <p role="alert" className="error">{error}</p>}{notice && <p role="status" className="success">{notice}</p>}
  </div>;
}
