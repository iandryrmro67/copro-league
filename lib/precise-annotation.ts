import type { Match, MatchEvent, AnnotationBuilder } from "./model.ts";
import { actionDefinitions, isV2, type Point, type Scene } from "./actions.ts";
import { beginAnalysis, previousPass } from "./match-analysis.ts";
import type { AnnotationMoment } from "./annotation-controls.ts";
export type CaptureDraft = {
  type: string;
  outcome: string;
  mate: string;
  opponent: string;
  tags: string[];
  participantChosen: boolean;
  detailChosen: boolean;
  precisionChosen?: boolean;
  positionPending?: boolean;
  position?: Point | null;
  positionInput?: { x: string; y: string };
  scene?: Scene;
  endPosition?: Point | null;
  linkedEventId?: string | null;
};
export type CaptureStep =
  "action" | "outcome" | "mate" | "opponent" | "detail" | "precision" | "position" | "ready";
export function captureStep(d: CaptureDraft): CaptureStep {
  if (!d.type) return "action";
  const outcomes =
    d.type === "FOUL"
      ? ["COMMITTED", "SUFFERED"]
      : (actionDefinitions[d.type]?.outcomes ?? []);
  if (outcomes.length && !d.outcome) return "outcome";
  if (
    d.type === "SHOT" &&
    ["OFF_TARGET", "WOODWORK"].includes(d.outcome) &&
    d.precisionChosen === false
  )
    return "precision";
  if (["RECOVERY", "CLEARANCE", "TURNOVER"].includes(d.type) && !d.detailChosen)
    return "detail";
  if (
    !d.participantChosen ||
    (participantRequired(d) && (d.type === "PASS" ? !d.mate : !d.opponent))
  ) {
    const participant = captureParticipant(d);
    if (participant) return participant;
  }
  return d.positionPending ? "position" : "ready";
}
export function captureParticipant(
  d: CaptureDraft,
): "mate" | "opponent" | null {
  if (
    (d.type === "PASS" && d.outcome === "COMPLETED") ||
    (d.type === "SHOT" && d.outcome === "GOAL")
  )
    return "mate";
  if (
    [
      "DRIBBLE",
      "DUEL",
      "TACKLE",
      "FOUL",
      "SAVE",
      "BLOCK",
      "INTERCEPTION",
    ].includes(d.type) ||
    (d.type === "PASS" && d.outcome === "FAILED") ||
    (d.type === "SHOT" && ["BLOCKED", "ON_TARGET"].includes(d.outcome)) ||
    (d.type === "RECOVERY" && d.tags.includes("OPPONENT_ERROR")) ||
    (d.type === "TURNOVER" && d.tags.includes("DISPOSSESSED"))
  )
    return "opponent";
  return null;
}
export function participantRequired(d: CaptureDraft) {
  return (
    (d.type === "PASS" && d.outcome === "COMPLETED") ||
    ["DRIBBLE", "DUEL", "TACKLE", "FOUL"].includes(d.type) ||
    (d.type === "SHOT" && d.outcome === "BLOCKED")
  );
}
// Retain only links whose observations still agree after a correction.
export function reconcileActionLinks(events: MatchEvent[]) {
  return events.map((e) => {
    const id = e.metadata.linkedEventId;
    if (!id) return e;
    const target = events.find((x) => x.id === id);
    const valid =
      target &&
      target.metadata.sequenceId === e.metadata.sequenceId &&
      target.timestamp != null &&
      e.timestamp != null &&
      target.timestamp <= e.timestamp &&
      (e.type === "SHOT"
        ? target.type === "PASS" &&
          target.metadata.outcome === "COMPLETED" &&
          (e.metadata.outcome !== "GOAL" ||
            target.playerId === e.relatedPlayerId) &&
          target.relatedPlayerId === e.playerId &&
          target.metadata.sequenceId === e.metadata.sequenceId &&
          target.timestamp != null &&
          e.timestamp != null &&
          target.timestamp <= e.timestamp
        : ["SAVE", "BLOCK"].includes(e.type)
          ? target.type === "SHOT" &&
            target.playerId === e.metadata.opponentPlayerId &&
            target.metadata.outcome ===
              (e.type === "SAVE" ? "ON_TARGET" : "BLOCKED")
          : e.type === "TURNOVER" &&
            target.playerId === e.playerId &&
            ((target.metadata.tags as string[]) ?? []).includes(
              "POSSESSION_LOST",
            ));
    return valid
      ? e
      : { ...e, metadata: { ...e.metadata, linkedEventId: null } };
  });
}
export function recordPreciseAction(
  match: Match,
  {
    draft: d,
    playerId,
    sequenceId,
    moment,
    editing,
  }: {
    draft: CaptureDraft;
    playerId: string;
    sequenceId: string;
    moment: AnnotationMoment;
    editing?: string | null;
  },
) {
  const p = match.participants.find((p) => p.playerId === playerId),
    definition = actionDefinitions[d.type];
  if (!p?.team) throw Error("Choisissez un joueur affecté à une équipe.");
  if (!definition) throw Error("Action inconnue.");
  const outcomes =
    d.type === "FOUL" ? ["COMMITTED", "SUFFERED"] : definition.outcomes;
  if (outcomes.length && !outcomes.includes(d.outcome))
    throw Error("Choisissez un résultat valide.");
  if (d.tags.some((t) => !definition.tags.includes(t)))
    throw Error("Précision invalide.");

  const mate = match.participants.find((p) => p.playerId === d.mate),
    opponent = match.participants.find((p) => p.playerId === d.opponent);
  if (d.mate && (!mate || mate.team !== p.team || mate.playerId === playerId))
    throw Error("Choisissez un autre partenaire de la même équipe.");
  if (d.opponent && (!opponent?.team || opponent.team === p.team))
    throw Error("Choisissez un adversaire de l’autre équipe.");
  if (d.type === "PASS" && d.outcome === "COMPLETED" && !mate)
    throw Error("Choisissez le receveur.");
  if (participantRequired(d) && d.type !== "PASS" && !opponent)
    throw Error("Choisissez l’adversaire.");
  if (captureStep(d) !== "ready")
    throw Error("Complétez les choix de cette action.");
  if (d.type === "PASS" && d.outcome === "FAILED" && d.tags.includes("ASSIST"))
    throw Error("Une passe ratée ne peut être décisive.");
  if (
    d.positionInput &&
    (d.positionInput.x !== "" || d.positionInput.y !== "") &&
    (d.positionInput.x === "" || d.positionInput.y === "")
  )
    throw Error("Renseigne les deux coordonnées observées.");
  const inputPosition = d.positionInput
    ? d.positionInput.x !== "" && d.positionInput.y !== ""
      ? { x: Number(d.positionInput.x), y: Number(d.positionInput.y) }
      : null
    : undefined;
  for (const point of [d.position, inputPosition, d.endPosition])
    if (
      point &&
      (!Number.isFinite(point.x) ||
        !Number.isFinite(point.y) ||
        point.x < 0 ||
        point.x > 100 ||
        point.y < 0 ||
        point.y > 100)
    )
      throw Error("Coordonnées entre 0 et 100 requises.");
  if (
    !Number.isFinite(moment.timestamp) ||
    moment.timestamp < 0 ||
    moment.timestamp > 86400 ||
    !Number.isFinite(moment.videoTimestamp) ||
    moment.videoTimestamp < 0
  )
    throw Error("Temps de l’action invalide.");
  const old = match.events.find((e) => e.id === editing),
    suffered = d.type === "FOUL" && d.outcome === "SUFFERED";
  const pass =
    d.type === "SHOT" && (!d.outcome || d.outcome !== "GOAL" || !!d.mate)
      ? previousPass(
          match,
          playerId,
          old ? String(old.metadata.sequenceId ?? sequenceId) : sequenceId,
          moment.timestamp,
          editing ?? undefined,
        )
      : null;
  const now = new Date().toISOString();
  const event: MatchEvent = {
    id: editing ?? crypto.randomUUID(),
    playerId: suffered ? d.opponent : playerId,
    team: suffered ? opponent!.team! : p.team,
    type: d.type,
    timestamp: moment.timestamp,
    relatedPlayerId:
      d.type === "PASS" || (d.type === "SHOT" && d.outcome === "GOAL")
        ? d.mate || null
        : null,
    metadata: {
      ...(old && isV2(old) ? old.metadata : {}),
      schemaVersion: 2,
      atomic: true,
      sequenceId: old
        ? String(old.metadata.sequenceId ?? sequenceId)
        : sequenceId,
      outcome: d.type === "FOUL" ? "SIMPLE" : d.outcome || null,
      tags: d.tags,
      opponentPlayerId: suffered ? playerId : d.opponent || null,
      // Opt in only after an explicit new selection; old observations retain their meaning.
      counterpartStats:
        !!d.opponent &&
        ((d.type === "PASS" && d.outcome === "FAILED") ||
          (d.type === "SHOT" && d.outcome === "ON_TARGET") ||
          (d.type === "TURNOVER" && d.tags.includes("DISPOSSESSED")) ||
          ["INTERCEPTION", "SAVE", "BLOCK"].includes(d.type) ||
          (d.type === "RECOVERY" && d.tags.includes("OPPONENT_ERROR"))),
      linkedEventId:
        d.linkedEventId !== undefined
          ? d.linkedEventId
          : pass && (d.outcome !== "GOAL" || pass.playerId === d.mate)
            ? pass.id
            : (old?.metadata.linkedEventId ?? null),
      position:
        d.position !== undefined
          ? d.position
          : (old?.metadata.position ?? null),
      endPosition:
        d.type === "PASS"
          ? d.endPosition !== undefined
            ? d.endPosition
            : (old?.metadata.endPosition ?? null)
          : null,
      ...(d.scene
        ? { scene: d.scene }
        : old?.metadata.scene
          ? { scene: old.metadata.scene }
          : {}),
      videoTimestamp: moment.videoTimestamp,
      createdAt: old?.metadata.createdAt ?? now,
      updatedAt: now,
    },
  };
  let events = editing
    ? match.events.map((e) => (e.id === editing ? event : e))
    : [...match.events, event];
  // Converting an old compound observation must not count its companion rows twice.
  if (old && !isV2(old) && !old.metadata.atomic && old.timestamp != null) {
    const group = [
      ["SHOT", "SHOT_ON_TARGET", "SHOT_OFF_TARGET", "SHOT_BLOCKED", "GOAL"],
      ["PASS_ATTEMPT", "PASS_COMPLETED", "PASS_FAILED"],
      ["DRIBBLE_ATTEMPT", "DRIBBLE_COMPLETED", "DRIBBLE_FAILED"],
      ["DUEL", "DUEL_WON", "DUEL_LOST"],
    ].find((g) => g.includes(old.type));
    if (group)
      events = events.filter(
        (e) =>
          e.id === event.id ||
          e.metadata.atomic ||
          e.playerId !== old.playerId ||
          e.timestamp !== old.timestamp ||
          !group.includes(e.type),
      );
  }
  events = reconcileActionLinks(events);
  // Only identical, explicitly attributed observations can be counterpart rows.
  events = events.map((block) => {
    if (
      block.type !== "BLOCK" ||
      block.metadata.linkedEventId ||
      !block.metadata.opponentPlayerId ||
      block.timestamp == null ||
      (block.id === event.id && d.linkedEventId === null)
    )
      return block;
    const shots = events.filter(
      (shot) =>
        shot.type === "SHOT" &&
        isV2(shot) &&
        shot.metadata.outcome === "BLOCKED" &&
        shot.playerId === block.metadata.opponentPlayerId &&
        shot.metadata.opponentPlayerId === block.playerId &&
        shot.timestamp === block.timestamp &&
        shot.metadata.sequenceId === block.metadata.sequenceId,
    );
    return shots.length === 1
      ? {
          ...block,
          metadata: { ...block.metadata, linkedEventId: shots[0].id },
        }
      : block;
  });
  events = reconcileActionLinks(events);
  const ended =
    d.type === "OWN_GOAL" ||
    (d.type === "PASS" && d.outcome === "FAILED") ||
    d.tags.includes("POSSESSION_LOST") ||
    [
      "TURNOVER",
      "FOUL",
      "SAVE",
      "CLEARANCE",
      "RECOVERY",
      "INTERCEPTION",
    ].includes(d.type) ||
    (d.type === "SHOT" && d.outcome === "GOAL");
  const nextSequence = !editing && ended ? crypto.randomUUID() : sequenceId;
  const next = beginAnalysis({ ...match, events });
  return {
    match: {
      ...next,
      analysis: {
        ...next.analysis!,
        status: "in_progress" as const,
        ranges:
          match.analysis?.status === "validated" ? [] : next.analysis!.ranges,
        session: { ...next.analysis!.session, sequenceId: nextSequence },
      },
    },
    event: events.find((e) => e.id === event.id)!,
    nextActor: nextAnnotationActor(d, playerId),
    sequenceId: nextSequence,
  };
}
/** Older sessions could silently select a different author when opening an event. */
export function restoredCaptureActor(m:Match,builder:AnnotationBuilder):string {
 const event=m.events.find(e=>e.id===builder.editing);
 return event && builder.correctionVersion!==1 ? event.playerId : builder.actor;
}

export function restoreCaptureDraft(
  m: Match,
  builder: AnnotationBuilder,
): CaptureDraft | null {
  const event = m.events.find((e) => e.id === builder.editing);
  if (event && builder.correctionVersion !== 1 && builder.actor !== event.playerId)
    return prepareActionCorrection(m, event, event.playerId).draft;
  const active =
    builder.captureActive ??
    (builder.manual || builder.positionKnown || !!builder.editing);
  if (
    active &&
    actionDefinitions[builder.type] &&
    (!event || isV2(event) || builder.captureActive)
  ) {
    const scenePoint = builder.scene.players[builder.actor];
    const away =
      m.participants.find((p) => p.playerId === builder.actor)?.team === "B";
    const position =
      builder.capturePosition !== undefined
        ? builder.capturePosition
        : builder.positionKnown && scenePoint
          ? away && !builder.captureActive
            ? { x: 100 - scenePoint.x, y: 100 - scenePoint.y }
            : scenePoint
          : null;
    return {
      type: builder.type,
      outcome:
        builder.type === "FOUL" && builder.outcome === "SIMPLE"
          ? "COMMITTED"
          : builder.outcome,
      mate: builder.mate,
      opponent: builder.opponent,
      tags: builder.tags,
      participantChosen: builder.participantChosen ?? !!builder.editing,
      precisionChosen: builder.precisionChosen,
      positionPending: builder.positionPending,
      detailChosen: builder.detailChosen ?? !!builder.editing,
      position,
      positionInput: builder.positionInput,
      scene: builder.scene,
      endPosition: builder.end,
      linkedEventId:
        builder.automaticLink === true
          ? undefined
          : builder.linked || (builder.editing ? null : undefined),
    };
  }
  if (!event || !isV2(event)) return null;
  return {
    type: event.type,
    outcome:
      event.type === "FOUL"
        ? "COMMITTED"
        : String(event.metadata.outcome ?? ""),
    mate: event.relatedPlayerId ?? "",
    opponent: String(event.metadata.opponentPlayerId ?? ""),
    tags: (event.metadata.tags as string[]) ?? [],
    participantChosen: true,
    detailChosen: true,
    position: (event.metadata.position as Point) ?? null,
    endPosition: (event.metadata.endPosition as Point) ?? null,
    linkedEventId: String(event.metadata.linkedEventId ?? "") || null,
  };
}
export function correctHistoricalAction(
  m: Match,
  {
    eventId,
    playerId,
    moment,
  }: { eventId: string; playerId: string; moment: AnnotationMoment | null },
): Match {
  const old = m.events.find((e) => e.id === eventId),
    participant = m.participants.find((p) => p.playerId === playerId);
  if (!old || !participant?.team) throw Error("Action ou joueur introuvable.");
  const changed: MatchEvent = {
    ...old,
    playerId,
    team: participant.team,
    timestamp: moment?.timestamp ?? old.timestamp,
    relatedPlayerId: playerId === old.playerId ? old.relatedPlayerId : null,
    metadata: {
      ...old.metadata,
      ...(moment ? { videoTimestamp: moment.videoTimestamp } : {}),
    },
  };
  const next = beginAnalysis({
    ...m,
    events: reconcileActionLinks(
      m.events.map((e) => (e.id === eventId ? changed : e)),
    ),
  });
  return {
    ...next,
    analysis: {
      ...next.analysis!,
      status: "in_progress",
      ranges: m.analysis?.status === "validated" ? [] : next.analysis!.ranges,
    },
  };
}
export function retargetCapture(d: CaptureDraft): CaptureDraft {
  return {
    ...d,
    mate: "",
    opponent: "",
    participantChosen: false,
    linkedEventId: null,
    position: null,
    positionInput: undefined,
    endPosition: null,
  };
}

/** Only possession actions keep a player selected after recording. */
export function nextAnnotationActor(d:CaptureDraft, author:string):string {
 if(d.type==='PASS')return d.outcome==='COMPLETED'?d.mate:d.opponent;
 if(['DUEL','TACKLE'].includes(d.type))return d.outcome==='LOST'?d.opponent:author;
 if(['RECOVERY','INTERCEPTION'].includes(d.type))return author;
 return '';
}

/** One explicit recipient click creates one observed completed pass. */
export function recordCirculationPass(
  match: Match,
  input: {
    from: string;
    to: string;
    sequenceId: string;
    moment: AnnotationMoment;
  },
) {
  return recordPreciseAction(match, {
    playerId: input.from,
    sequenceId: input.sequenceId,
    moment: input.moment,
    draft: {
      type: "PASS",
      outcome: "COMPLETED",
      mate: input.to,
      opponent: "",
      tags: [],
      participantChosen: true,
      detailChosen: true,
      precisionChosen: true,
    },
  });
}

/** Load the stored event: prior capture selection must never rewrite its author. */
export function prepareActionCorrection(
  m: Match,
  event: MatchEvent,
  preferred: string,
): { actor: string; draft: CaptureDraft | null } {
  const actor = event.playerId;
  if (!m.participants.some(p => p.playerId === actor)) throw Error("Auteur de l’action absent du match.");
  void preferred;
  if (!isV2(event)) return { actor, draft: null };
  const draft: CaptureDraft = {
    type: event.type,
    outcome:
      event.type === "FOUL"
        ? "COMMITTED"
        : String(event.metadata.outcome ?? ""),
    mate: event.relatedPlayerId ?? "",
    opponent: String(event.metadata.opponentPlayerId ?? ""),
    tags: [...((event.metadata.tags as string[]) ?? [])],
    participantChosen: true,
    detailChosen: true,
    position: (event.metadata.position as CaptureDraft["position"]) ?? null,
    endPosition:
      (event.metadata.endPosition as CaptureDraft["endPosition"]) ?? null,
    linkedEventId: String(event.metadata.linkedEventId ?? "") || null,
  };
  return {
    actor,
    draft,
  };
}
