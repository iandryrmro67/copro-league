'use client';
import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import type { Match, Player } from '@/lib/model';
import { teamName } from '@/lib/model';
import { Calendar, Empty, date, time } from './league-ui';
import { ArrowRight } from 'lucide-react';

// Board 45 · Liste des matchs A · Billets. The sample data and the
// "Je suis partant" button are not used: line-ups come from the WhatsApp poll.
const FULL_SQUAD = 10;
const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');
const day = (v: string) => v ? new Date(v).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit' }) : '—';
const month = (v: string) => v ? new Date(v).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', month: 'short' }).toUpperCase() : '';
const ticketDate = (v: string) => v ? new Date(v).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase() : 'DATE À PRÉCISER';

// A minute clock shared by the countdowns; null during server rendering.
const subscribeClock = (notify: () => void) => { const timer = window.setInterval(notify, 30000); return () => window.clearInterval(timer); };
const minuteNow = () => Math.floor(Date.now() / 60000) * 60000;
function Countdown({ match: m }: { match: Match }) {
  const now = useSyncExternalStore(subscribeClock, minuteNow, () => null);
  const left = now == null ? null : Math.max(0, Date.parse(m.date) - now), minutes = left == null ? null : Math.floor(left / 60000);
  const parts: [string, string][] = minutes == null ? [['—', 'Jours'], ['—', 'Heures'], ['—', 'Min']] : [[pad(Math.floor(minutes / 1440)), 'Jours'], [pad(Math.floor(minutes / 60) % 24), 'Heures'], [pad(minutes % 60), 'Min']];
  return <div><span className="ticket-label muted">Coup d’envoi dans</span><div className="ticket-countdown">{parts.map(([value, label]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}</div></div>;
}

function NextTicket({ match: m }: { match: Match }) {
  const count = m.participants.length, drafted = count > 0 && m.participants.every(p => p.team);
  const status = count >= FULL_SQUAD ? drafted ? 'Composition complète' : 'Équipes à tirer' : `${FULL_SQUAD - count} place${FULL_SQUAD - count > 1 ? 's' : ''} à confirmer`;
  return <article className="match-ticket next">
    <span className="ticket-ghost" aria-hidden="true">#{m.number}</span>
    <div className="ticket-main">
      <div className="ticket-meta"><span className="ticket-live" aria-hidden="true"/><span className="ticket-label">Prochain match · #{m.number}</span><span className="ticket-label muted">{ticketDate(m.date)} · {time(m.date)}</span></div>
      <h3 className="ticket-teams"><span>{teamName(m, 'A')}</span><small>VS</small><span className="muted">{teamName(m, 'B')}</span></h3>
      <div className="ticket-squad"><div aria-hidden="true">{Array.from({ length: Math.max(FULL_SQUAD, count) }, (_, i) => <i key={i} className={i < count ? 'on' : ''}/>)}</div><span className="ticket-label muted">{count} / {FULL_SQUAD} joueurs · {status}</span></div>
    </div>
    <div className="ticket-stub">
      <Countdown match={m}/>
      <div className="ticket-actions"><Link className="button primary" href={'/matchs/' + m.id}>Voir le match <ArrowRight size={16}/></Link><Calendar match={m}/></div>
    </div>
  </article>;
}

function TicketRow({ match: m, players, now }: { match: Match; players: Player[]; now: number }) {
  const finished = m.status === 'finished', mvp = players.find(p => p.id === m.mvpId);
  const aWins = finished && (m.scoreA ?? 0) > (m.scoreB ?? 0), bWins = finished && (m.scoreB ?? 0) > (m.scoreA ?? 0);
  const state = finished ? 'Terminé' : m.status === 'cancelled' ? 'Annulé' : Date.parse(m.date) < now ? 'Résultat en attente' : 'À venir';
  return <Link className="match-ticket row" href={'/matchs/' + m.id}>
    <div className="ticket-day"><b>{day(m.date)}</b><span>{month(m.date)}</span></div>
    <div className="ticket-main">
      <span className="ticket-label muted">Match #{m.number} · {state}</span>
      <div className="ticket-score"><strong className={bWins ? 'muted' : ''}>{teamName(m, 'A')}</strong>{finished ? <><b className={aWins ? 'accent' : 'muted'}>{m.scoreA ?? '—'}</b><i aria-label="à"/><b className={bWins ? 'accent' : 'muted'}>{m.scoreB ?? '—'}</b></> : <small>VS</small>}<strong className={aWins ? 'muted' : ''}>{teamName(m, 'B')}</strong></div>
    </div>
    <div className="ticket-stub"><span className="ticket-label muted">{finished ? 'MVP' : time(m.date)}</span><strong>{finished ? mvp?.name ?? 'Non attribué' : date(m.date)}</strong><span className="ticket-link">Voir le match ↗</span></div>
  </Link>;
}

export function MatchTickets({ matches, players, tab }: { matches: Match[]; players: Player[]; tab: string }) {
  const [now] = useState(() => Date.now());
  const scheduled = matches.filter(m => m.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date));
  const next = scheduled.find(m => Date.parse(m.date) > now);
  const others = scheduled.filter(m => m !== next);
  const finished = matches.filter(m => m.status === 'finished').sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number);
  const cancelled = matches.filter(m => m.status === 'cancelled').sort((a, b) => b.date.localeCompare(a.date));
  const showUpcoming = tab !== 'finished', showFinished = tab !== 'scheduled';
  const empty = !(showUpcoming && scheduled.length) && !(showFinished && finished.length) && !(tab === 'all' && cancelled.length);
  return <div className="match-tickets">
    {showUpcoming && next && <section><span className="ticket-label">Prochain match</span><NextTicket match={next}/></section>}
    {showUpcoming && others.length > 0 && <section><span className="ticket-label">Autres rendez-vous · {others.length}</span>{others.map(m => <TicketRow match={m} players={players} now={now} key={m.id}/>)}</section>}
    {showFinished && finished.length > 0 && <section><span className="ticket-label">Matchs terminés · {finished.length}</span>{finished.map(m => <TicketRow match={m} players={players} now={now} key={m.id}/>)}</section>}
    {tab === 'all' && cancelled.length > 0 && <section><span className="ticket-label muted">Annulés · {cancelled.length}</span>{cancelled.map(m => <TicketRow match={m} players={players} now={now} key={m.id}/>)}</section>}
    {empty && <Empty>Aucun match sur cette période.</Empty>}
  </div>;
}
