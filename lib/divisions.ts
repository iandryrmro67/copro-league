import type { Summary } from './engine.ts';

export const divisions = [
  { id: 'regional', name: 'Régional', minimum: 0 },
  { id: 'national', name: 'National', minimum: 50 },
  { id: 'ligue2', name: 'Ligue 2', minimum: 80 },
  { id: 'ligue1', name: 'Ligue 1', minimum: 95 },
] as const;
export type Division = typeof divisions[number];

// Midrank percentiles give tied players the same division, without arbitrary ID ordering.
export function divisionFor(playerId: string, population: Summary[]): Division | null {
  const eligible = population.filter(s => s.appearances > 0 && !s.player.archived);
  const player = eligible.find(s => s.player.id === playerId);
  if (!player || eligible.length < 2) return null;
  const lower = eligible.filter(s => s.elo < player.elo).length;
  const equal = eligible.filter(s => s.elo === player.elo).length;
  const percentile = 100 * (lower + equal / 2) / eligible.length;
  return [...divisions].reverse().find(d => percentile >= d.minimum) ?? divisions[0];
}

export function cardRating(rating: number | null | undefined): number | null {
  return rating == null || !Number.isFinite(rating) ? null : Math.round(Math.max(0, Math.min(99, rating * 10)));
}
