import test from "node:test";
import assert from "node:assert/strict";
import {
  captureStep,
  recordPreciseAction,
  type CaptureDraft,
} from "../lib/precise-annotation.ts";
import { beginAnalysis, analysisCounts } from "../lib/match-analysis.ts";
import { matchSchema } from "../lib/validation.ts";
import type { Match } from "../lib/model.ts";
const fixture = (): Match =>
  beginAnalysis({
    id: "m",
    seasonId: "s",
    number: 1,
    date: "",
    duration: 60,
    location: "",
    status: "finished",
    scoreA: 8,
    scoreB: 6,
    mvpId: null,
    level: 3,
    video: "",
    version: 1,
    trackedKeys: [],
    participants: [
      { playerId: "a", team: "A", stats: { goals: 8 } },
      { playerId: "b", team: "A", stats: {} },
      { playerId: "c", team: "B", stats: { goals: 6 } },
    ],
    events: [],
  });
const draft = (patch: Partial<CaptureDraft> = {}): CaptureDraft => ({
  type: "PASS",
  outcome: "",
  mate: "",
  opponent: "",
  tags: [],
  participantChosen: false,
  detailChosen: false,
  ...patch,
});
const input = (value: CaptureDraft) => ({
  draft: value,
  playerId: "a",
  sequenceId: "seq",
  moment: { timestamp: 20, videoTimestamp: 50.8 },
});
// Catch premature writes before an explicit outcome or participant selection.
test("the pass flow waits for result and recipient before becoming recordable", () => {
  assert.equal(captureStep(draft()), "outcome");
  assert.equal(captureStep(draft({ outcome: "COMPLETED" })), "mate");
  assert.equal(
    captureStep(
      draft({ outcome: "COMPLETED", mate: "b", participantChosen: true }),
    ),
    "ready",
  );
  assert.equal(captureStep(draft({ outcome: "FAILED" })), "opponent");
  assert.equal(
    captureStep(draft({ outcome: "FAILED", participantChosen: true })),
    "ready",
  );
  assert.throws(
    () =>
      recordPreciseAction(fixture(), input(draft({ outcome: "COMPLETED" }))),
    /receveur|complét/i,
  );
});
test("a precise pass stays atomic and keeps the targeted player", () => {
  const result = recordPreciseAction(
    fixture(),
    input(draft({ outcome: "COMPLETED", mate: "b", participantChosen: true })),
  );
  assert.equal(result.match.events.length, 1);
  assert.equal(result.nextActor, "a");
  assert.equal(result.event.relatedPlayerId, "b");
  assert.equal(result.event.metadata.videoTimestamp, 50.8);
  assert.equal(
    analysisCounts(result.match).participants[0].stats.passesCompleted,
    1,
  );
  assert.equal(result.match.participants[0].stats.goals, 8);
  assert.equal(result.match.scoreA, 8);
  assert.equal(matchSchema.safeParse(result.match).success, true);
  for (const mate of ["a", "c", "missing"])
    assert.throws(
      () =>
        recordPreciseAction(
          fixture(),
          input(draft({ outcome: "COMPLETED", mate, participantChosen: true })),
        ),
      /partenaire/i,
    );
});
test("blocked shots and duels require an opposing player, ordinary shots do not", () => {
  assert.equal(
    captureStep(draft({ type: "SHOT", outcome: "BLOCKED" })),
    "opponent",
  );
  assert.equal(
    captureStep(draft({ type: "SHOT", outcome: "OFF_TARGET" })),
    "ready",
  );
  assert.equal(
    captureStep(draft({ type: "DUEL", outcome: "WON" })),
    "opponent",
  );
  for (const opponent of ["a", "b", "missing", ""])
    assert.throws(
      () =>
        recordPreciseAction(
          fixture(),
          input(
            draft({
              type: "DUEL",
              outcome: "WON",
              opponent,
              participantChosen: true,
            }),
          ),
        ),
      /adversaire/i,
    );
  const result = recordPreciseAction(
    fixture(),
    input(
      draft({
        type: "DUEL",
        outcome: "LOST",
        opponent: "c",
        participantChosen: true,
      }),
    ),
  );
  const counts = analysisCounts(result.match).participants;
  assert.equal(counts[0].stats.duelsWon ?? 0, 0);
  assert.equal(counts[2].stats.duelsWon, 1);
});
test("a suffered foul attributes the offence to the opponent and keeps the victim targeted", () => {
  const result = recordPreciseAction(
    fixture(),
    input(
      draft({
        type: "FOUL",
        outcome: "SUFFERED",
        opponent: "c",
        participantChosen: true,
      }),
    ),
  );
  assert.equal(result.nextActor, "a");
  assert.equal(result.event.playerId, "c");
  assert.equal(result.event.team, "B");
  assert.equal(result.event.metadata.opponentPlayerId, "a");
  assert.equal(result.event.metadata.outcome, "SIMPLE");
  assert.equal(analysisCounts(result.match).participants[0].stats.foulsWon, 1);
  assert.equal(analysisCounts(result.match).participants[2].stats.fouls, 1);
  assert.equal(matchSchema.safeParse(result.match).success, true);
});
test("action specific detail choices never invent a player or a position", () => {
  assert.equal(captureStep(draft({ type: "CLEARANCE" })), "detail");
  assert.equal(
    captureStep(
      draft({ type: "CLEARANCE", tags: ["HEADER"], detailChosen: true }),
    ),
    "ready",
  );
  const result = recordPreciseAction(
    fixture(),
    input(draft({ type: "CLEARANCE", tags: ["HEADER"], detailChosen: true })),
  );
  assert.equal(result.event.metadata.position, null);
  assert.equal(result.event.metadata.opponentPlayerId, null);
  assert.notEqual(result.sequenceId, "seq");
  assert.equal(matchSchema.safeParse(result.match).success, true);
  assert.throws(
    () =>
      recordPreciseAction(
        fixture(),
        input(
          draft({
            type: "PASS",
            outcome: "BAD",
            mate: "b",
            participantChosen: true,
          }),
        ),
      ),
    /résultat/i,
  );
});
test("an explicit unassisted goal does not silently credit the previous passer", () => {
  const pass = recordPreciseAction(
    fixture(),
    input(draft({ outcome: "COMPLETED", mate: "b", participantChosen: true })),
  );
  const goal = recordPreciseAction(pass.match, {
    ...input(draft({ type: "SHOT", outcome: "GOAL", participantChosen: true })),
    playerId: "b",
    moment: { timestamp: 25, videoTimestamp: 55 },
  });
  assert.equal(goal.event.relatedPlayerId, null);
  assert.equal(goal.event.metadata.linkedEventId, null);
  assert.equal(
    analysisCounts(goal.match).participants[0].stats.assists ?? 0,
    0,
  );
});
test("editing preserves id, timestamps and optional observation metadata without duplicate counts", () => {
  const first = recordPreciseAction(
    fixture(),
    input(draft({ outcome: "COMPLETED", mate: "b", participantChosen: true })),
  );
  first.event.metadata.position = { x: 72, y: 40 };
  first.event.metadata.scene = { players: { a: { x: 72, y: 40 } }, ball: null };
  const changed = recordPreciseAction(first.match, {
    ...input(draft({ outcome: "FAILED", participantChosen: true })),
    editing: first.event.id,
  });
  assert.equal(changed.match.events.length, 1);
  assert.equal(changed.event.id, first.event.id);
  assert.equal(changed.event.metadata.videoTimestamp, 50.8);
  assert.deepEqual(changed.event.metadata.position, { x: 72, y: 40 });
  assert.equal(
    analysisCounts(changed.match).participants[0].stats.passesCompleted ?? 0,
    0,
  );
  assert.equal(
    analysisCounts(changed.match).participants[0].stats.passesAttempted,
    1,
  );
  assert.equal(matchSchema.safeParse(changed.match).success, true);
});
test("a selected assister links the compatible pass and correcting it removes the stale link", () => {
  const pass = recordPreciseAction(
    fixture(),
    input(draft({ outcome: "COMPLETED", mate: "b", participantChosen: true })),
  );
  const goal = recordPreciseAction(pass.match, {
    ...input(
      draft({
        type: "SHOT",
        outcome: "GOAL",
        mate: "a",
        participantChosen: true,
      }),
    ),
    playerId: "b",
    moment: { timestamp: 25, videoTimestamp: 55 },
  });
  assert.equal(goal.event.metadata.linkedEventId, pass.event.id);
  assert.equal(analysisCounts(goal.match).participants[0].stats.assists, 1);
  const corrected = recordPreciseAction(goal.match, {
    ...input(draft({ outcome: "FAILED", participantChosen: true })),
    editing: pass.event.id,
  });
  assert.equal(
    corrected.match.events.find((e) => e.id === goal.event.id)?.metadata
      .linkedEventId,
    null,
  );
});
test("invalid observed coordinates and excessive clocks cannot enter the draft", () => {
  for (const position of [
    { x: 101, y: 50 },
    { x: 50, y: -1 },
    { x: NaN, y: 20 },
  ])
    assert.throws(
      () =>
        recordPreciseAction(
          fixture(),
          input(draft({ type: "TOUCH", position })),
        ),
      /coordonnées/i,
    );
  assert.throws(
    () =>
      recordPreciseAction(fixture(), {
        ...input(draft({ type: "TOUCH" })),
        moment: { timestamp: 86401, videoTimestamp: 86401 },
      }),
    /temps/i,
  );
});

// Recovery must preserve an unfinished observation rather than reload the stored event.
test("restoring old and new builders preserves corrections and automatic linking intent", async () => {
  const { restoreCaptureDraft } = await import("../lib/precise-annotation.ts");
  const m = fixture();
  const builder = {
    actor: "a",
    mate: "b",
    opponent: "",
    type: "PASS",
    outcome: "FAILED",
    tags: ["LONG_PASS"],
    stamp: "0:20",
    manual: true,
    editing: null,
    linked: "",
    positionKnown: true,
    quick: false,
    view: "builder",
    scene: { players: { a: { x: 72, y: 40 } }, ball: null },
    end: null,
  };
  const restored = restoreCaptureDraft(m, builder);
  assert.equal(restored?.outcome, "FAILED");
  assert.deepEqual(restored?.tags, ["LONG_PASS"]);
  assert.deepEqual(restored?.position, { x: 72, y: 40 });
  const recoveredGoal = restoreCaptureDraft(m, {
    ...builder,
    type: "SHOT",
    outcome: "GOAL",
    mate: "b",
    captureActive: true,
    positionKnown: false,
  });
  assert.equal(recoveredGoal?.linkedEventId, undefined);
  const pass = recordPreciseAction(
    m,
    input(draft({ outcome: "COMPLETED", mate: "b", participantChosen: true })),
  );
  const savedCorrection = { ...builder, editing: pass.event.id };
  assert.equal(
    restoreCaptureDraft(pass.match, savedCorrection)?.outcome,
    "FAILED",
  );
  const bRelative = restoreCaptureDraft(m, {
    ...builder,
    actor: "c",
    scene: { players: { c: { x: 20, y: 80 } }, ball: null },
  });
  assert.deepEqual(bRelative?.position, { x: 80, y: 20 });
});
test("no-op correction preserves existing observation provenance", () => {
  const first = recordPreciseAction(fixture(), input(draft({ type: "TOUCH" })));
  first.event.metadata.observationSource = "video analysed manually";
  const result = recordPreciseAction(first.match, {
    ...input(draft({ type: "TOUCH" })),
    editing: first.event.id,
  });
  assert.equal(
    result.event.metadata.observationSource,
    "video analysed manually",
  );
});
test("an incomplete coordinate pair cannot become an observed position", () => {
  assert.throws(
    () =>
      recordPreciseAction(
        fixture(),
        input({
          ...draft({ type: "TOUCH" }),
          positionInput: { x: "90", y: "" },
        }),
      ),
    /coordonnées/i,
  );
});
test("the blocked shot and its defender counterpart share one block credit in either order", () => {
  const shot = input(
    draft({
      type: "SHOT",
      outcome: "BLOCKED",
      opponent: "c",
      participantChosen: true,
    }),
  );
  const block = {
    ...input(draft({ type: "BLOCK", opponent: "a", participantChosen: true })),
    playerId: "c",
  };
  for (const pair of [
    [shot, block],
    [block, shot],
  ]) {
    const first = recordPreciseAction(fixture(), pair[0]);
    const second = recordPreciseAction(first.match, pair[1]);
    assert.equal(second.match.events.length, 2);
    assert.equal(analysisCounts(second.match).participants[2].stats.blocks, 1);
    assert.equal(matchSchema.safeParse(second.match).success, true);
  }
  const first = recordPreciseAction(fixture(), shot);
  const separate = recordPreciseAction(first.match, {
    ...block,
    moment: { timestamp: 21, videoTimestamp: 51 },
  });
  assert.equal(analysisCounts(separate.match).participants[2].stats.blocks, 2);
});
test("correcting the actor of a historical event preserves an unknown timestamp", async () => {
  const { correctHistoricalAction } =
    await import("../lib/precise-annotation.ts");
  const m = fixture();
  m.events = [
    {
      id: "old",
      playerId: "a",
      team: "A",
      type: "GOAL",
      timestamp: null,
      relatedPlayerId: null,
      metadata: { observationSource: "old sheet" },
    },
  ];
  const result = correctHistoricalAction(m, {
    eventId: "old",
    playerId: "b",
    moment: null,
  });
  assert.equal(result.events[0].playerId, "b");
  assert.equal(result.events[0].timestamp, null);
  assert.equal(result.events[0].metadata.observationSource, "old sheet");
  assert.equal(result.events[0].metadata.videoTimestamp, undefined);
  assert.equal(result.participants[0].stats.goals, 8);
  assert.equal(matchSchema.safeParse(result).success, true);
});
test("restored participant-choice flags cannot skip a required missing player", () => {
  assert.equal(
    captureStep(
      draft({ type: "SHOT", outcome: "BLOCKED", participantChosen: true }),
    ),
    "opponent",
  );
  assert.equal(
    captureStep(draft({ outcome: "COMPLETED", participantChosen: true })),
    "mate",
  );
});
test("counterpart linking respects possessions and replaces an incompatible old shooter link", () => {
  const shot = input(
    draft({
      type: "SHOT",
      outcome: "BLOCKED",
      opponent: "c",
      participantChosen: true,
    }),
  );
  const a = recordPreciseAction(fixture(), shot);
  const second = recordPreciseAction(a.match, { ...shot, playerId: "b" });
  const block = recordPreciseAction(second.match, {
    ...input(draft({ type: "BLOCK", opponent: "a", participantChosen: true })),
    playerId: "c",
  });
  const corrected = recordPreciseAction(block.match, {
    ...input(draft({ type: "BLOCK", opponent: "b", participantChosen: true })),
    playerId: "c",
    editing: block.event.id,
  });
  assert.equal(corrected.event.metadata.linkedEventId, second.event.id);
  assert.equal(analysisCounts(corrected.match).participants[2].stats.blocks, 2);
  const otherPossession = recordPreciseAction(a.match, {
    ...input(draft({ type: "BLOCK", opponent: "a", participantChosen: true })),
    playerId: "c",
    sequenceId: "different",
  });
  assert.equal(otherPossession.event.metadata.linkedEventId, null);
});
test("pending edits preserve automatic versus explicitly cleared links after restoration", async () => {
  const { restoreCaptureDraft } = await import("../lib/precise-annotation.ts");
  const m = fixture(),
    first = recordPreciseAction(
      m,
      input(draft({ type: "SHOT", outcome: "OFF_TARGET" })),
    );
  const builder = {
    actor: "a",
    mate: "",
    opponent: "",
    type: "SHOT",
    outcome: "GOAL",
    tags: [],
    stamp: "0:20",
    manual: true,
    editing: first.event.id,
    linked: "",
    positionKnown: false,
    quick: false,
    view: "builder",
    scene: { players: {}, ball: null },
    end: null,
    captureActive: true,
    automaticLink: true,
  };
  assert.equal(
    restoreCaptureDraft(first.match, builder)?.linkedEventId,
    undefined,
  );
  assert.equal(
    restoreCaptureDraft(first.match, { ...builder, automaticLink: false })
      ?.linkedEventId,
    null,
  );
});
test("retargeting an action cannot carry observed coordinates from the old player", async () => {
  const { retargetCapture } = await import("../lib/precise-annotation.ts");
  const changed = retargetCapture({
    ...draft({ type: "TOUCH", position: { x: 70, y: 20 } }),
    positionInput: { x: "70", y: "20" },
  });
  assert.equal(changed.position, null);
  assert.equal(changed.positionInput, undefined);
});

test("failed passes credit the selected interceptor without changing historical observations", () => {
  const result = recordPreciseAction(
    fixture(),
    input(draft({ outcome: "FAILED", opponent: "c", participantChosen: true })),
  );
  const counts = analysisCounts(result.match).participants;
  assert.equal(counts[0].stats.passesAttempted, 1);
  assert.equal(counts[0].stats.passesCompleted ?? 0, 0);
  assert.equal(counts[2].stats.interceptions, 1);
  assert.equal(counts[2].stats.recoveries, 1);
  assert.equal(counts[2].stats.highRecoveries ?? 0, 0);
  assert.equal(result.match.events.length, 1);
  assert.notEqual(result.sequenceId, "seq");
  assert.equal(matchSchema.safeParse(result.match).success, true);
  const unknown = recordPreciseAction(result.match, {
    ...input(draft({ outcome: "FAILED", participantChosen: true })),
    editing: result.event.id,
  });
  assert.equal(
    analysisCounts(unknown.match).participants[2].stats.interceptions ?? 0,
    0,
  );
  const historical = structuredClone(result.match);
  delete historical.events[0].metadata.counterpartStats;
  assert.equal(
    analysisCounts(historical).participants[2].stats.interceptions ?? 0,
    0,
  );
});
test("a saved shot and dispossession credit only their explicitly selected opponent", () => {
  assert.equal(
    captureStep(draft({ type: "SHOT", outcome: "ON_TARGET" })),
    "opponent",
  );
  for (const patch of [
    { type: "SHOT", outcome: "ON_TARGET", tags: [] },
    { type: "TURNOVER", outcome: "", tags: ["DISPOSSESSED"] },
  ]) {
    const result = recordPreciseAction(
      fixture(),
      input(
        draft({
          ...patch,
          opponent: "c",
          participantChosen: true,
          detailChosen: true,
        }),
      ),
    );
    const stats = analysisCounts(result.match).participants[2].stats;
    assert.equal(stats[patch.type === "SHOT" ? "saves" : "recoveries"], 1);
    assert.equal(matchSchema.safeParse(result.match).success, true);
  }
});
test("counterpart observations at the same instant do not double count and corrections restore independent credit", () => {
  for (const [attack, defence, key] of [
    [
      { type: "PASS", outcome: "FAILED" },
      { type: "INTERCEPTION" },
      "interceptions",
    ],
    [
      { type: "SHOT", outcome: "ON_TARGET" },
      { type: "SAVE", outcome: "SAVED_HELD" },
      "saves",
    ],
    [
      { type: "TURNOVER", tags: ["DISPOSSESSED"] },
      { type: "RECOVERY", tags: ["OPPONENT_ERROR"] },
      "recoveries",
    ],
  ] as const) {
    const a = input(
      draft({
        ...attack,
        tags: [...("tags" in attack ? attack.tags : [])],
        opponent: "c",
        participantChosen: true,
        detailChosen: true,
      }),
    );
    const b = {
      ...input(
        draft({
          ...defence,
          tags: [...("tags" in defence ? defence.tags : [])],
          opponent: "a",
          participantChosen: true,
          detailChosen: true,
        }),
      ),
      playerId: "c",
    };
    for (const pair of [
      [a, b],
      [b, a],
    ]) {
      const first = recordPreciseAction(fixture(), pair[0]);
      const second = recordPreciseAction(first.match, {
        ...pair[1],
        sequenceId: first.sequenceId,
      });
      assert.equal(analysisCounts(second.match).participants[2].stats[key], 1);
      const actorStats = analysisCounts(second.match).participants[0].stats;
      assert.equal(actorStats[key === "interceptions" ? "passesAttempted" : key === "saves" ? "shots" : "turnovers"], 1);
      if (key === "interceptions")
        assert.equal(
          analysisCounts(second.match).participants[2].stats.recoveries,
          1,
        );
      const moved = recordPreciseAction(second.match, {
        ...pair[1],
        editing: second.event.id,
        moment: { timestamp: 21, videoTimestamp: 51 },
      });
      assert.equal(analysisCounts(moved.match).participants[2].stats[key], 2);
      assert.equal(matchSchema.safeParse(second.match).success, true);
    }
  }
});

test("defensive entry also credits the known passer, shooter or dispossessed player", () => {
  for (const [patch, keys] of [
    [{ type: "INTERCEPTION" }, ["passesAttempted"]],
    [{ type: "SAVE", outcome: "SAVED_HELD" }, ["shots", "shotsOnTarget"]],
    [{ type: "BLOCK" }, ["shots"]],
    [{ type: "RECOVERY", tags: ["OPPONENT_ERROR"] }, ["turnovers"]],
  ] as const) {
    const result = recordPreciseAction(fixture(), {
      ...input(
        draft({
          ...patch,
          tags: [...("tags" in patch ? patch.tags : [])],
          opponent: "a",
          participantChosen: true,
          detailChosen: true,
        }),
      ),
      playerId: "c",
    });
    const stats = analysisCounts(result.match).participants[0].stats;
    for (const key of keys) assert.equal(stats[key], 1);
    if (patch.type === "INTERCEPTION") assert.equal(stats.passesCompleted, 0);
    if (patch.type === "BLOCK") assert.equal(stats.shotsOnTarget, 0);
    assert.equal(matchSchema.safeParse(result.match).success, true);
  }
});
test("an automatic recovery cannot imply a high recovery from the passer position", async () => {
  const { reviewAnalysis } = await import("../lib/match-analysis.ts");
  const result = recordPreciseAction(
    fixture(),
    input(
      draft({
        outcome: "FAILED",
        opponent: "c",
        participantChosen: true,
        position: { x: 10, y: 50 },
      }),
    ),
  );
  result.match.analysis!.completeKeys = ["highRecoveries"];
  assert.equal(
    analysisCounts(result.match).participants[2].stats.highRecoveries ?? 0,
    0,
  );
  assert.ok(
    reviewAnalysis(result.match).some(
      (i) =>
        i.code === "position" && i.blocking && i.eventId === result.event.id,
    ),
  );
});


test("publishing credits both players while an unfinished correction preserves the published result", async () => {
  const {publishAnalysis, publicMatch}=await import("../lib/match-analysis.ts");
  const result=recordPreciseAction(fixture(), input(draft({outcome:"FAILED",opponent:"c",participantChosen:true})));
  result.match.analysis!.completeKeys=["passesAttempted","passesCompleted","interceptions","recoveries"];
  result.match.analysis!.ranges=[{start:0,end:3600}];
  const published=publishAnalysis(result.match);
  assert.equal(published.participants[0].stats.passesAttempted,1);
  assert.equal(published.participants[2].stats.interceptions,1);
  assert.equal(published.participants[2].stats.recoveries,1);
  const correction=recordPreciseAction(published,{...input(draft({outcome:"FAILED",participantChosen:true})),editing:result.event.id});
  assert.equal(analysisCounts(correction.match).participants[2].stats.interceptions ?? 0,0);
  assert.equal(publicMatch(correction.match).participants[2].stats.interceptions,1);
  assert.equal(publicMatch(correction.match).events[0].metadata.opponentPlayerId,"c");
});
