import test from "node:test";
import assert from "node:assert/strict";
import type { Match, MatchEvent, Player } from "../lib/model.ts";
import {
  actionFamily,
  eventInvolves,
  scoreBreakdown,
  goalProgression,
  teamMetric,
  sortedTeamPlayers,
  eventSequences,
  shotMomentum,
  orderedEvents,
  ratingTone,
} from "../lib/match-presentation.ts";
const event = (
  id: string,
  type = "SHOT",
  team: "A" | "B" = "A",
  timestamp: number | null = 1,
  metadata: Record<string, unknown> = {},
): MatchEvent => ({
  id,
  type,
  team,
  timestamp,
  playerId: team.toLowerCase(),
  relatedPlayerId: null,
  metadata: { schemaVersion: 2, outcome: "GOAL", ...metadata },
});
const match = (events: MatchEvent[] = []): Match => ({
  id: "m",
  seasonId: "s3",
  number: 3,
  date: "",
  duration: 120,
  location: "",
  status: "finished",
  scoreA: 26,
  scoreB: 15,
  mvpId: null,
  level: 3,
  video: "",
  version: 1,
  trackedKeys: [],
  events,
  participants: [
    {
      playerId: "a",
      team: "A",
      stats: {
        goals: 24,
        ownGoals: 1,
        passesCompleted: 50,
        passesAttempted: 100,
      },
    },
    { playerId: "b", team: "B", stats: { goals: 14, ownGoals: 2 } },
  ],
});
test("official goals include opponent own goals without changing personal totals", () => {
  const m = match();
  const before = structuredClone(m);
  assert.deepEqual(scoreBreakdown(m, "A"), {
    official: 26,
    scored: 24,
    opponentOwnGoals: 2,
    accounted: 26,
    complete: true,
  });
  assert.equal(scoreBreakdown(m, "B").accounted, 15);
  assert.deepEqual(m, before);
  m.participants[0].stats.goals = null;
  assert.equal(scoreBreakdown(m, "A").accounted, null);
});
test("team totals preserve absent/partial data and percentages use paired denominators", () => {
  const m = match();
  m.participants.push({
    playerId: "a2",
    team: "A",
    stats: { passesCompleted: 3, passesAttempted: 10, goals: null },
  });
  assert.deepEqual(teamMetric(m, "A", "goals"), {
    value: 24,
    observed: 1,
    total: 2,
  });
  assert.equal(teamMetric(m, "A", "passPct").value, (100 * 53) / 110);
  m.participants[1].stats.shots = 0;
  assert.equal(teamMetric(m, "B", "shotPct").value, null);
  m.participants[2].stats.passesAttempted = null;
  assert.equal(teamMetric(m, "A", "passPct").value, 50);
  assert.equal(teamMetric(m, "A", "highRecoveries").value, null);
  m.participants[0].stats.goalsConceded = 15;
  m.participants[2].stats.goalsConceded = 15;
  assert.equal(teamMetric(m, "A", "goalsConceded").value, 15);
});
test("goal progression flips CSC, is global before filters and does not invent untimed order", () => {
  const m = match([
    event("b", "SHOT", "B", 20),
    event("csc", "OWN_GOAL", "B", 30),
    event("a", "SHOT", "A", 10),
  ]);
  m.scoreA = 2;
  m.scoreB = 1;
  const p = goalProgression(m);
  assert.equal(p.complete, true);
  assert.deepEqual(
    p.goals.map((g) => [g.event.id, g.scoreA, g.scoreB]),
    [
      ["a", 1, 0],
      ["b", 1, 1],
      ["csc", 2, 1],
    ],
  );
  assert.equal(
    p.goals.filter((g) => g.event.playerId === "b").at(-1)?.scoreA,
    2,
  );
  m.events.push(event("unknown", "SHOT", "A", null));
  assert.equal(goalProgression(m).complete, false);
  assert.equal(goalProgression(m).goals.at(-1)?.scoreA, null);
  m.events[0].timestamp = null;
  assert.equal(goalProgression(m).goals[0].scoreA, null);
});
test("same-time actions retain insertion order, absent times sort last and inputs remain unchanged", () => {
  const es = [
    event("u", "PASS", "A", null),
    event("first", "PASS", "A", 10),
    event("second", "PASS", "A", 10),
  ];
  assert.deepEqual(
    orderedEvents(es).map((e) => e.id),
    ["first", "second", "u"],
  );
  assert.equal(es[0].id, "u");
});
test("players stay in their team, sort by published note and unknown notes last", () => {
  const m = match();
  m.participants[0].stats.rating = 6;
  m.participants.push(
    { playerId: "a2", team: "A", stats: { rating: 8 } },
    { playerId: "a3", team: "A", stats: { rating: null } },
  );
  const players = ["a", "a2", "a3", "b"].map(
    (id) => ({ id, name: id }) as Player,
  );
  assert.deepEqual(
    sortedTeamPlayers(m, players, "A").map((p) => p.player.id),
    ["a2", "a", "a3"],
  );
  assert.equal(ratingTone(null), "unknown");
  assert.equal(ratingTone(3.5), "low");
  assert.equal(ratingTone(7.7), "good");
  assert.equal(ratingTone(8.2), "excellent");
});
test("sequences split possession changes, long gaps and goals, retain every event once", () => {
  const es = [
    event("1", "PASS", "A", 1, { sequenceId: "same" }),
    event("2", "PASS", "A", 4, { sequenceId: "same" }),
    event("3", "RECOVERY", "B", 5, { sequenceId: "same" }),
    event("4", "SHOT", "B", 6, { sequenceId: "same" }),
    event("5", "PASS", "B", 7, { sequenceId: "same" }),
    event("6", "PASS", "B", 80, { sequenceId: "same" }),
    event("7", "PASS", "B", null),
  ];
  const sequences = eventSequences(es);
  assert.deepEqual(
    sequences.map((s) => s.events.map((e) => e.id)),
    [["1", "2"], ["3", "4"], ["5"], ["6"], ["7"]],
  );
  assert.deepEqual(
    sequences.flatMap((s) => s.events).map((e) => e.id),
    es.map((e) => e.id),
  );
  const dense = Array.from({ length: 1564 }, (_, i) =>
    event(String(i), "PASS", "A", i),
  );
  assert.equal(eventSequences(dense).flatMap((s) => s.events).length, 1564);
  assert.ok(eventSequences(dense).every((s) => s.events.length <= 30));
});
test("momentum counts shots, deduplicates legacy shot companions and excludes untimed shots/CSC", () => {
  const es = [
    event("s", "SHOT", "A", 0),
    event("own", "OWN_GOAL", "B", 100),
    event("p", "PASS", "A", 100),
    event("u", "SHOT", "A", null),
    { ...event("legacy", "SHOT", "B", 300), metadata: {} },
    { ...event("goal", "GOAL", "B", 300), metadata: {} },
  ];
  const momentum = shotMomentum(match(es));
  assert.equal(momentum.buckets[0].A, 1);
  assert.equal(momentum.buckets[1].B, 1);
  assert.equal(momentum.untimed, 1);
  assert.equal(momentum.total, 3);
});

test("action filters include all involved players and distinguish goals from other shots", () => {
  const pass = event("p", "PASS", "A", 1, {
    outcome: "FAILED",
    opponentPlayerId: "c",
  });
  pass.relatedPlayerId = "b";
  assert.equal(eventInvolves(pass, "a"), true);
  assert.equal(eventInvolves(pass, "b"), true);
  assert.equal(eventInvolves(pass, "c"), true);
  assert.equal(eventInvolves(pass, "other"), false);
  assert.equal(actionFamily(pass), "PASS");
  assert.equal(
    actionFamily(event("s", "SHOT", "A", 2, { outcome: "OFF_TARGET" })),
    "SHOT",
  );
  assert.equal(actionFamily(event("g")), "GOAL");
  assert.equal(actionFamily(event("c", "OWN_GOAL", "B")), "GOAL");
  const m = match([event("g"), event("c", "OWN_GOAL", "B", 3)]);
  const result = goalProgression(m);
  assert.equal(result.complete, false);
  assert.deepEqual(
    result.goals.filter((g) => g.team === "A").map((g) => [g.scoreA, g.scoreB]),
    [
      [1, 0],
      [2, 0],
    ],
  );
});
