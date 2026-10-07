import type { Match, Player, Stats } from './model.ts';
import { eloHistory, power } from './engine.ts';
import { styleDefinitions } from './performance.ts';

export type DraftSide = 'A' | 'B';
export type Aptitudes = [number, number, number, number];
export type DraftResult = { A: string[]; B: string[]; gap: number; powerA: number; powerB: number };
export type DraftRequest = { players: Player[]; population: Player[]; matches: Match[]; locks: Record<string, DraftSide> };
const mean = (values: number[]) => values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
const bounded = (value: number) => Math.max(0, Math.min(100, value));
const numeric = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Only completed, scored lineups are evidence; never include the match being prepared. */
export function draftHistory(matches: Match[], target?: Pick<Match, 'id' | 'date'>): Match[] {
  return matches.filter(m => m.status === 'finished' && m.id !== target?.id &&
    numeric(m.scoreA) && numeric(m.scoreB) && m.scoreA >= 0 && m.scoreB >= 0 &&
    m.participants.some(p => p.team === 'A') && m.participants.some(p => p.team === 'B') &&
    m.participants.every(p => p.team === 'A' || p.team === 'B') &&
    new Set(m.participants.map(p => p.playerId)).size === m.participants.length &&
    (!target?.date || !m.date || m.date < target.date));
}
export function draftElos(players: Player[], matches: Match[]): Record<string, number> {
  const history = eloHistory(players, matches);
  return Object.fromEntries(players.map(p => [p.id, history[p.id]?.at(-1)?.elo ?? 1000]));
}

/** Seven continuous styles, independent of the public profile's three displayed badges. */
export function draftAptitudes(players: Player[], matches: Match[]): Record<string, Aptitudes> {
  const finished = draftHistory(matches).sort((a, b) => a.date.localeCompare(b.date) || a.number - b.number || a.id.localeCompare(b.id));
  const keys = [...new Set(styleDefinitions.flatMap(s => s.keys))];
  const rows = new Map<string, Stats[]>();
  for (const m of finished) for (const p of m.participants) {
    const list = rows.get(p.playerId) ?? [];
    list.push(p.stats);
    if (list.length > 20) list.shift();
    rows.set(p.playerId, list);
  }
  const observations = players.map(player => {
    const stats = rows.get(player.id) ?? [];
    const metrics = Object.fromEntries(keys.map(key => {
      const seen = stats.map(s => s[key]).filter(numeric);
      return [key, { count: seen.length, value: seen.length >= 3 ? mean(seen) : null }];
    }));
    return { player, metrics };
  });
  const peers = Object.fromEntries(keys.map(key => [key, observations.flatMap(o => {
    const value = o.metrics[key].value;
    return value == null ? [] : [value];
  })]));
  // Same style order as the profile. Unknown preparation stays neutral, never zero.
  const preparation = ['finition', 'creation', 'passe', 'percussion', 'duels', 'defense', 'defense'];
  return Object.fromEntries(observations.map(({ player, metrics }) => {
    const styles = styleDefinitions.map((style, i) => {
      const raw = player.attributes?.[preparation[i]];
      const prior = numeric(raw) ? bounded(raw) : 50;
      return mean(style.keys.map(key => {
        const { count, value } = metrics[key];
        const population = peers[key];
        if (value == null || population.length < 3) return prior;
        const percentile = 100 * (population.filter(n => n < value).length + .5 * population.filter(n => n === value).length) / population.length;
        const confidence = count / (count + 5);
        return confidence * percentile + (1 - confidence) * prior;
      }));
    });
    return [player.id, [Math.max(styles[6], styles[5], .75 * styles[4]), Math.max(styles[1], styles[2]), styles[3], styles[0]] as Aptitudes];
  }));
}

function checkPlayers(players: Player[], equal: boolean) {
  if (players.length < 2 || players.length > 20 || (equal && players.length % 2))
    throw Error(equal ? 'Choisis un nombre pair de joueurs, entre 2 et 20.' : 'Choisis entre 2 et 20 joueurs.');
  if (new Set(players.map(p => p.id)).size !== players.length) throw Error('Un joueur ne peut être sélectionné deux fois.');
}

/** Independent coins, no quota or automatic correction, including empty sides. */
export function randomPackDraft(players: Player[], random: () => number = Math.random): Pick<DraftResult, 'A' | 'B'> {
  checkPlayers(players, false);
  const A: string[] = [], B: string[] = [];
  for (const p of players) (random() < .5 ? A : B).push(p.id);
  return { A, B };
}
export function shuffledIds(players: Player[], random: () => number = Math.random): string[] {
  const ids = players.map(p => p.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

/** Maximise the weakest of four roles, with distinct players. O(team size × 16 × 4). */
export function weakestFunction(skills: Aptitudes[]): number {
  if (skills.length < 4) return 0;
  const dp = new Float64Array(16).fill(-1);
  dp[0] = 100;
  for (const player of skills) {
    // Descending masks ensure one player cannot fill two functions in this step.
    for (let mask = 15; mask > 0; mask--) for (let role = 0; role < 4; role++) {
      if (!(mask & (1 << role))) continue;
      const previous = dp[mask ^ (1 << role)];
      if (previous >= 0) dp[mask] = Math.max(dp[mask], Math.min(previous, player[role]));
    }
  }
  return Math.max(0, dp[15]);
}
export function hybridCost(A: Player[], B: Player[], elos: Record<string, number>, aptitudes: Record<string, Aptitudes>): number {
  const a = mean(A.map(p => power(p, elos[p.id]))), b = mean(B.map(p => power(p, elos[p.id])));
  const level = a + b ? Math.min(1, Math.abs(a - b) / ((a + b) / 2)) : 0;
  const skillsA = A.map(p => aptitudes[p.id] ?? [50, 50, 50, 50] as Aptitudes);
  const skillsB = B.map(p => aptitudes[p.id] ?? [50, 50, 50, 50] as Aptitudes);
  const deficit = 1 - Math.min(weakestFunction(skillsA), weakestFunction(skillsB)) / 100;
  const axes = mean([0, 1, 2, 3].map(r => Math.abs(mean(skillsA.map(s => s[r])) - mean(skillsB.map(s => s[r]))))) / 100;
  return .45 * level + .35 * deficit + .20 * axes;
}

/** Exact exhaustive search; yield in batches for responsive fallback on browsers without workers. */
export function* hybridDraftSearch(players: Player[], elos: Record<string, number>, aptitudes: Record<string, Aptitudes>, locks: Record<string, DraftSide> = {}, random: () => number = Math.random): Generator<void, DraftResult> {
  checkPlayers(players, true);
  const n = players.length / 2;
  const fullMask = (1 << players.length) - 1;
  const powers = players.map(p => power(p, elos[p.id]));
  const skills = players.map(p => aptitudes[p.id] ?? [50, 50, 50, 50] as Aptitudes);
  const total = powers.reduce((s, v) => s + v, 0);
  let required = 0, forbidden = 0;
  players.forEach((p, i) => { if (locks[p.id] === 'A') required |= 1 << i; if (locks[p.id] === 'B') forbidden |= 1 << i; });
  const coverage = new Map<number, number>();
  function weakest(mask: number) {
    let value = coverage.get(mask);
    if (value == null) {
      value = weakestFunction(skills.filter((_, i) => mask & (1 << i)));
      coverage.set(mask, value);
    }
    return value;
  }
  let best = Infinity, bestMask = -1, ties = 0, examined = 0;
  // Enumerate only subsets of the required size using Gosper's combination step.
  for (let mask = (1 << n) - 1; mask <= fullMask;) {
    if ((mask & required) === required && !(mask & forbidden)) {
      const other = fullMask ^ mask;
      let sum = 0;
      const axes = [0, 0, 0, 0];
      for (let i = 0; i < players.length; i++) {
        const inA = !!(mask & (1 << i));
        if (inA) sum += powers[i];
        for (let r = 0; r < 4; r++) axes[r] += (inA ? 1 : -1) * skills[i][r];
      }
      const level = total ? Math.min(1, Math.abs(2 * sum - total) / (total / 2)) : 0;
      const deficit = 1 - Math.min(weakest(mask), weakest(other)) / 100;
      const cost = .45 * level + .35 * deficit + .20 * mean(axes.map(v => Math.abs(v) / n)) / 100;
      if (cost < best - 1e-9) { best = cost; bestMask = mask; ties = 1; }
      else if (Math.abs(cost - best) <= 1e-9 && random() < 1 / ++ties) bestMask = mask;
    }
    if (++examined % 256 === 0) yield;
    const low = mask & -mask, next = mask + low;
    mask = next | (((next ^ mask) >>> 2) / low);
  }
  if (bestMask < 0) throw Error('Ces verrouillages empêchent de former deux équipes avec le même nombre de joueurs.');
  const A = players.filter((_, i) => bestMask & (1 << i)), B = players.filter((_, i) => !(bestMask & (1 << i)));
  const powerA = mean(A.map(p => power(p, elos[p.id]))), powerB = mean(B.map(p => power(p, elos[p.id])));
  return { A: A.map(p => p.id), B: B.map(p => p.id), powerA, powerB, gap: powerA + powerB ? Math.abs(powerA - powerB) / ((powerA + powerB) / 2) * 100 : 0 };
}
export function hybridBalancedDraft(players: Player[], elos: Record<string, number>, aptitudes: Record<string, Aptitudes>, locks: Record<string, DraftSide> = {}, random: () => number = Math.random): DraftResult {
  const search = hybridDraftSearch(players, elos, aptitudes, locks, random);
  let step = search.next();
  while (!step.done) step = search.next();
  return step.value;
}
export async function computeDraft(request: DraftRequest): Promise<DraftResult> {
  const search = hybridDraftSearch(request.players, draftElos(request.population, request.matches), draftAptitudes(request.population, request.matches), request.locks);
  let step = search.next();
  while (!step.done) { await new Promise(resolve => setTimeout(resolve, 0)); step = search.next(); }
  return step.value;
}

export function canApplyDraft(players: Player[], teams: Record<string, DraftSide>, mode: string): boolean {
  if (players.length < 2 || players.length > 20 || new Set(players.map(p => p.id)).size !== players.length || Object.keys(teams).length !== players.length) return false;
  const a = players.filter(p => teams[p.id] === 'A').length, b = players.filter(p => teams[p.id] === 'B').length;
  return a > 0 && b > 0 && a + b === players.length && (mode === 'pack' || a === b);
}

export type PackEstimate = { available: true; A: { win: number; draw: number; lose: number }; B: { win: number; draw: number; lose: number } } | { available: false; reason: string };
export function packEstimate(A: Player[], B: Player[], population: Player[], matches: Match[]): PackEstimate {
  if (!A.length || !B.length) return { available: false, reason: 'Une équipe est vide. Relance le pack pour préparer un match.' };
  if (A.length !== B.length) return { available: false, reason: 'Estimation indisponible pour des équipes de tailles différentes.' };
  const history = draftHistory(matches);
  if (history.length < 20 || [...A, ...B].some(p => history.filter(m => m.participants.some(q => q.playerId === p.id)).length < 5))
    return { available: false, reason: 'Estimation indisponible : historique insuffisant.' };
  const elos = draftElos(population, history);
  const expected = 1 / (1 + 10 ** ((mean(B.map(p => elos[p.id] ?? 1000)) - mean(A.map(p => elos[p.id] ?? 1000))) / 400));
  const draw = Math.min(history.filter(m => m.scoreA === m.scoreB).length / history.length, 2 * Math.min(expected, 1 - expected));
  const win = expected - draw / 2, lose = 1 - expected - draw / 2;
  return { available: true, A: { win: 100 * win, draw: 100 * draw, lose: 100 * lose }, B: { win: 100 * lose, draw: 100 * draw, lose: 100 * win } };
}
