import type { League, Match, Season } from './model';

/** Chronological seasons, independent of database insertion order. */
export function newestSeasons(seasons: Season[]): Season[] {
  return [...seasons].sort((a, b) => Number(a.demo) - Number(b.demo) || (b.start || '').localeCompare(a.start || '') || b.name.localeCompare(a.name, 'fr', { numeric: true }));
}
export function defaultSeason(seasons: Season[], current = ''): string {
  return current === 'career' || seasons.some(s => s.id === current) ? current : newestSeasons(seasons)[0]?.id ?? '';
}

/** An empty upcoming fixture must not erase the last actual teams. */
export function homePitch(data: League, matches: Match[], now: number) {
  const usable = (m: Match) => m.status !== 'cancelled' && m.participants.some(p => data.players.some(player => player.id === p.playerId));
  const ordered = (ms: Match[]) => [...ms].filter(usable).sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number);
  const upcoming = matches.filter(m => usable(m) && m.status === 'scheduled' && Date.parse(m.date) > now).sort((a, b) => a.date.localeCompare(b.date))[0];
  const match = upcoming ?? ordered(matches.filter(m => m.status === 'finished'))[0] ?? ordered(matches)[0] ?? ordered(data.matches)[0];
  const roster = match ? match.participants.flatMap(p => {
    const player = data.players.find(x => x.id === p.playerId);
    return player ? [{ player, side: p.team }] : [];
  }).sort((a, b) => (a.side === 'A' ? 0 : a.side === 'B' ? 1 : 2) - (b.side === 'A' ? 0 : b.side === 'B' ? 1 : 2)) : data.players.filter(p => !p.archived && !p.demo).slice(0, 10).map(player => ({ player, side: null }));
  return { match, roster };
}
export function matchTabFromQuery(value: string | null) {
  return ['summary', 'teams', 'stats', 'video', 'timeline'].includes(value ?? '') ? value! : 'summary';
}
export function editorStepFromQuery(value: string | null) {
  return ['details', 'players', 'draft', 'result', 'video'].includes(value ?? '') ? value! : 'details';
}

/** Preserve an undated historical action when its empty time is unchanged. */
export function annotationTimestamp(value: string, original?: { timestamp: number | null }): number | null | undefined {
  if (value === '' && original?.timestamp === null) return null;
  if (!/^\d{1,4}:[0-5]\d$/.test(value)) return undefined;
  const [minutes, seconds] = value.split(':').map(Number);
  return minutes * 60 + seconds;
}
