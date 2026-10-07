import type { Match, MatchEvent, Player, Participant } from "./model.ts";
import { ratios } from "./model.ts";
import { isGoal, isOwnGoal, scoringTeam } from "./actions.ts";
export type Team = "A" | "B";
export type TeamMetric = {
  value: number | null;
  observed: number;
  total: number;
};
/** Unknown is distinct from zero; partial totals carry their observed sample. */
export function teamMetric(match: Match, team: Team, key: string): TeamMetric {
  const participants = match.participants.filter((p) => p.team === team),
    total = participants.length;
  if (key === "goalsConceded")
    return {
      value: team === "A" ? match.scoreB : match.scoreA,
      observed: total,
      total,
    };
  if (key === "xgConceded")
    return teamMetric(match, team === "A" ? "B" : "A", "xg");
  const pair = ratios[key];
  const observed = participants.filter((p) =>
    pair
      ? pair.every(
          (k) => typeof p.stats[k] === "number" && Number.isFinite(p.stats[k]),
        )
      : typeof p.stats[key] === "number" && Number.isFinite(p.stats[key]),
  );
  let value: number | null = null;
  if (observed.length) {
    if (pair) {
      const n = observed.reduce((v, p) => v + p.stats[pair[0]]!, 0),
        d = observed.reduce((v, p) => v + p.stats[pair[1]]!, 0);
      value = d > 0 ? (100 * n) / d : null;
    } else value = observed.reduce((v, p) => v + p.stats[key]!, 0);
  }
  return { value, observed: observed.length, total };
}
export function scoreBreakdown(match: Match, team: Team) {
  const goals = teamMetric(match, team, "goals"),
    own = teamMetric(match, team === "A" ? "B" : "A", "ownGoals");
  const complete =
    goals.total > 0 &&
    own.total > 0 &&
    goals.observed === goals.total &&
    own.observed === own.total;
  return {
    official: team === "A" ? match.scoreA : match.scoreB,
    scored: goals.value,
    opponentOwnGoals: own.value,
    accounted: complete ? goals.value! + own.value! : null,
    complete,
  };
}
export function orderedEvents(events: MatchEvent[]) {
  return [...events].sort(
    (a, b) => (a.timestamp ?? Infinity) - (b.timestamp ?? Infinity),
  );
}
export function goalProgression(match: Match) {
  const goals = orderedEvents(match.events).filter(isGoal);
  let A = 0,
    B = 0;
  const timed = goals.every(
    (e) => e.timestamp != null && Number.isFinite(e.timestamp),
  );
  const rows = goals.map((event) => {
    if (scoringTeam(event) === "A") A++;
    else B++;
    return {
      event,
      team: scoringTeam(event),
      ownGoal: isOwnGoal(event),
      scoreA: timed ? A : null,
      scoreB: timed ? B : null,
    };
  });
  return {
    goals: rows,
    complete:
      timed &&
      match.scoreA != null &&
      match.scoreB != null &&
      A === match.scoreA &&
      B === match.scoreB,
    annotatedA: A,
    annotatedB: B,
    timed,
  };
}
export function sortedTeamPlayers(match: Match, players: Player[], team: Team) {
  const byId = new Map(players.map((p) => [p.id, p]));
  return match.participants
    .filter((p) => p.team === team)
    .flatMap((participant) => {
      const player = byId.get(participant.playerId);
      return player ? [{ player, participant }] : [];
    })
    .sort(
      (a, b) =>
        (b.participant.stats.rating ?? -Infinity) -
          (a.participant.stats.rating ?? -Infinity) ||
        a.player.name.localeCompare(b.player.name, "fr"),
    );
}
export function ratingTone(value: number | null | undefined) {
  return value == null
    ? "unknown"
    : value >= 8
      ? "excellent"
      : value >= 7
        ? "good"
        : value >= 6
          ? "average"
          : "low";
}
export type EventSequence = {
  id: string;
  team: Team;
  start: number | null;
  end: number | null;
  events: MatchEvent[];
};
/** Contiguous passages, never merge separate runs sharing a historic sequence ID. */
export function eventSequences(events: MatchEvent[]): EventSequence[] {
  const out: EventSequence[] = [];
  for (const event of orderedEvents(events)) {
    const current = out.at(-1),
      previous = current?.events.at(-1);
    const split =
      !current ||
      !previous ||
      current.team !== event.team ||
      current.events.length >= 30 ||
      isGoal(previous) ||
      event.timestamp == null ||
      previous.timestamp == null ||
      event.timestamp - previous.timestamp > 30 ||
      event.metadata.sequenceId !== previous.metadata.sequenceId;
    if (split)
      out.push({
        id: event.id,
        team: event.team,
        start: event.timestamp,
        end: event.timestamp,
        events: [event],
      });
    else {
      current.events.push(event);
      current.end = event.timestamp;
    }
  }
  return out;
}
const shotTypes = new Set([
  "SHOT",
  "GOAL",
  "SHOT_ON_TARGET",
  "SHOT_OFF_TARGET",
  "SHOT_BLOCKED",
]);
export function observedShots(events: MatchEvent[]) {
  const companions = new Set(
    events
      .filter(
        (e) =>
          !e.metadata.schemaVersion &&
          e.timestamp != null &&
          e.type !== "SHOT" &&
          shotTypes.has(e.type),
      )
      .map((e) => `${e.playerId}:${e.timestamp}`),
  );
  return events.filter(
    (e) =>
      shotTypes.has(e.type) &&
      !(
        e.type === "SHOT" &&
        !e.metadata.schemaVersion &&
        e.timestamp != null &&
        companions.has(`${e.playerId}:${e.timestamp}`)
      ),
  );
}
export function shotMomentum(match: Match) {
  const shots = observedShots(match.events),
    timed = shots.filter(
      (e) => e.timestamp != null && Number.isFinite(e.timestamp),
    );
  const end = Math.max(
    60,
    match.duration * 60,
    ...timed.map((e) => e.timestamp! + 1),
  );
  const buckets = Array.from({ length: Math.ceil(end / 300) }, (_, i) => ({
    start: i * 300,
    end: Math.min((i + 1) * 300, end),
    A: 0,
    B: 0,
  }));
  for (const shot of timed) {
    if (shot.timestamp! >= 0)
      buckets[Math.floor(shot.timestamp! / 300)][shot.team]++;
  }
  return { buckets, total: shots.length, untimed: shots.length - timed.length };
}
export function actionFamily(event: MatchEvent) {
  if (isGoal(event)) return "GOAL";
  if (
    event.type.startsWith("PASS") ||
    ["ASSIST", "KEY_PASS", "CROSS"].includes(event.type)
  )
    return "PASS";
  if (event.type.startsWith("SHOT")) return "SHOT";
  if (event.type.startsWith("DRIBBLE") && event.type !== "DRIBBLED_PAST")
    return "DRIBBLE";
  if (event.type.startsWith("DUEL")) return "DUEL";
  return event.type;
}
export function eventInvolves(event: MatchEvent, playerId: string) {
  return (
    !playerId ||
    event.playerId === playerId ||
    event.relatedPlayerId === playerId ||
    event.metadata.opponentPlayerId === playerId ||
    event.metadata.recovererPlayerId === playerId
  );
}
export function matchClock(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "Temps inconnu";
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}
export function bestMetric(
  players: { player: Player; participant: Participant }[],
  key: string,
) {
  return [...players]
    .filter((p) => p.participant.stats[key] != null)
    .sort(
      (a, b) =>
        b.participant.stats[key]! - a.participant.stats[key]! ||
        a.player.name.localeCompare(b.player.name, "fr"),
    )[0];
}
