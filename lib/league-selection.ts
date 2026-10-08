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

const homePositions = [[356,553],[455,553],[591,501],[651,553],[489,647],[1084,553],[985,553],[849,501],[789,553],[951,647]];
/** One shared visible lineup for the pitch and lockers. Positions never cross teams. */
export function homeLineup(roster: ReturnType<typeof homePitch>['roster'], round = 0) {
  const teams = [roster.filter(p => p.side === 'A').slice(0,5), roster.filter(p => p.side === 'B').slice(0,5)];
  const unassigned = roster.filter(p => p.side == null);
  for (const team of teams) while (team.length < 5 && unassigned.length) team.push(unassigned.shift()!);
  return teams.flatMap((team, side) => team.map((entry, index) => {
    const slot = side * 5 + ((index + round) % team.length + team.length) % team.length;
    const [left, top] = homePositions[slot];
    return { ...entry, fieldSide: side === 0 ? 'A' : 'B', slot, left, top, width: top > 600 ? 68 : top < 520 ? 51 : 57 };
  }));
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
