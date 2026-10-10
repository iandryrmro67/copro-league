import type { League, Match, Stats } from './model';
import { aggregate, averageRadar, metric, radar, type Summary } from './engine';
import { candidates, percentile } from './recognition';
import { automaticRating, ratingConfig } from './performance';

export const profileDomains = [
  { name: 'Finition', axis: 'Finition', keys: ['goals', 'shots', 'conversion', 'shotsOnTarget'] },
  { name: 'Création', axis: 'Création', keys: ['keyPasses', 'assists', 'secondaryAssists', 'chancesCreated', 'keyPassShotPct'] },
  { name: 'Passes', axis: 'Passe', keys: ['passPct', 'passesAttempted', 'passPressurePct', 'longPassPct', 'crossPct'] },
  { name: 'Progression', axis: 'Percussion', keys: ['lineBreakingPasses', 'receivedLastThird', 'forwardCarries', 'dribblesCompleted', 'dribblePct', 'boxTouches', 'foulsWon'] },
  { name: 'Défense', axis: 'Défense', keys: ['interceptions', 'recoveries', 'defensiveDuelPct', 'successfulTackles', 'tackles', 'blocks'] },
  { name: 'Duels', axis: 'Duels', keys: ['duelsAttempted', 'duelPct', 'offensiveDuelPct', 'aerialPct'] },
  { name: 'Collectif', axis: '', keys: ['appearances', 'ratingStd', 'winRate', 'unmarkedPassPct'] },
];
export function playerDomains(summary: Summary, population: Summary[], minimum: number, matches: Match[]) {
  const axes = radar(summary, population, minimum);
  const metrics = candidates({ players: population.map(p => p.player), matches });
  const collective = metrics.find(p => p.id === summary.player.id)?.values.collective;
  return profileDomains.map(domain => ({ ...domain, value: domain.axis ? axes.find(a => a.name === domain.axis)?.value ?? null : domain.name === 'Collectif' && summary.appearances >= minimum ? collective ?? null : null }));
}
/** League-average player on the seven domains: mean measures scored like any player; Collectif averages the players' scores. */
export function leagueDomainAverages(population: Summary[], minimum: number, matches: Match[]): (number | null)[] {
  const axes = averageRadar(population, minimum);
  const metrics = candidates({ players: population.map(p => p.player), matches });
  const collective = population.filter(p => p.appearances >= minimum).flatMap(p => { const v = metrics.find(m => m.id === p.player.id)?.values.collective; return v == null ? [] : [v]; });
  return profileDomains.map(domain => domain.axis ? axes.find(a => a.name === domain.axis)?.value ?? null : collective.length ? collective.reduce((sum, v) => sum + v, 0) / collective.length : null);
}
export function profileValue(summary: Summary, key: string): number | null {
  if (key === 'ratingStd') {
    const ratings = summary.form.flatMap(f => f.participant.stats.rating == null ? [] : [f.participant.stats.rating]);
    if (ratings.length < 2) return null;
    const mean = ratings.reduce((s, r) => s + r, 0) / ratings.length;
    return Math.sqrt(ratings.reduce((s, r) => s + (r - mean) ** 2, 0) / ratings.length);
  }
  return metric(summary, key, !key.endsWith('Pct') && !['appearances', 'ratingStd', 'rating', 'winRate'].includes(key));
}
export function profilePercentile(summary: Summary, population: Summary[], key: string) {
  const rows = population.filter(s => s.appearances > 0).map(s => profileValue(s, key));
  return rows.filter(v => v != null).length >= 3 ? percentile(profileValue(summary, key), rows, key === 'ratingStd') : null;
}
export function recentRatings(summary: Summary) {
  const average = (rows: typeof summary.form) => { const vs = rows.flatMap(f => f.participant.stats.rating == null ? [] : [f.participant.stats.rating]); return vs.length ? vs.reduce((s, v) => s + v, 0) / vs.length : null; };
  const current = average(summary.form.slice(0, 5)), previous = average(summary.form.slice(5, 10));
  return { current, previous, delta: current != null && previous != null ? current - previous : null };
}

/** Decompose the existing nonlinear rating, including its peak bonus and penalties. */
export function ratingContributions(stats: Stats, peers: Stats[], weights: Record<string, number> = {}) {
  const families = Object.entries(ratingConfig.families).flatMap(([name, config]) => {
    const scores = config.keys.flatMap(key => {
      const value = stats[key], known = peers.flatMap(p => p[key] == null ? [] : [p[key]!]);
      if (value == null || known.length < 3) return [];
      const mean = known.reduce((s, v) => s + v, 0) / known.length;
      return [mean === 0 ? 0 : Math.max(-1, Math.min(1, (value - mean) / Math.max(1, mean)))];
    });
    const weight = weights[name] ?? config.weight;
    return scores.length && weight > 0 ? [{ name, score: scores.reduce((s, v) => s + v, 0) / scores.length, weight }] : [];
  });
  const result = automaticRating(stats, peers, weights);
  if (!families.length || result.value == null) return null;
  const totalWeight = families.reduce((s, f) => s + f.weight, 0), average = families.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight;
  const peak = Math.max(...families.map(f => f.score)), peaks = families.filter(f => f.score === peak).length;
  const values = families.map(f => ({ name: f.name, value: peak > 0 ? 4 * ((f.score === peak ? .8 * peak / peaks : 0) + (average > 0 ? .2 * f.score * f.weight / totalWeight : 0)) : 4 * f.score * f.weight / totalWeight }));
  const penalty = -Math.min(1, (stats.turnovers ?? 0) * ratingConfig.turnoverPenalty);
  const correction = result.value - (6 + values.reduce((s, f) => s + f.value, 0) + penalty);
  return { values, penalty, correction, rating: result.value };
}
export function averageContributions(summary: Summary, league: Pick<League, 'matches' | 'settings'>) {
  const peers = league.matches.filter(m => m.status === 'finished').flatMap(m => m.participants.map(p => p.stats));
  const rows = summary.form.flatMap(f => {
    if (f.participant.stats.rating == null) return [];
    const composition = ratingContributions(f.participant.stats, peers, league.settings.ratingWeights);
    return composition ? [{ ...composition, override: f.participant.stats.rating - composition.rating }] : [];
  });
  if (!rows.length) return null;
  const values = Object.keys(ratingConfig.families).map(name => ({ name, value: rows.some(r => r.values.some(v => v.name === name)) ? rows.reduce((s, r) => s + (r.values.find(v => v.name === name)?.value ?? 0), 0) / rows.length : null }));
  const mean = (key: 'penalty' | 'correction' | 'override') => rows.reduce((s, r) => s + r[key], 0) / rows.length;
  return { values, penalty: mean('penalty'), correction: mean('correction'), override: mean('override'), rating: rows.reduce((s, r) => s + r.rating + r.override, 0) / rows.length, count: rows.length };
}
export function matchDomainHistory(summary: Summary, players: League['players']) {
  return [...summary.form].reverse().map(f => ({ match: f.match, domains: playerDomains(aggregate(players, [f.match]).find(s => s.player.id === summary.player.id)!, aggregate(players, [f.match]), 1, [f.match]) }));
}
