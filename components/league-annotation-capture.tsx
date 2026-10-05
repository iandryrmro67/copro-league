"use client";
import {
  ArrowRight,
  Check,
  CircleDot,
  CornerUpRight,
  Footprints,
  Hand,
  MoveRight,
  Shield,
  ShieldCheck,
  Swords,
  Target,
  Waypoints,
  X,
} from "lucide-react";
import { AnnotationTimeControl } from "./annotation-time-control";
import type { League, Match, MatchEvent } from "@/lib/model";
import { teamName } from "@/lib/model";
import {
  actionDefinitions as definitions,
  actionLabels,
  isV2,
} from "@/lib/actions";
import {
  captureStep,
  participantRequired,
  type CaptureDraft,
} from "@/lib/precise-annotation";
const groups = [
  {
    label: "Avec le ballon",
    types: ["PASS", "SHOT", "DRIBBLE", "TOUCH", "TURNOVER"],
  },
  {
    label: "Défendre & récupérer",
    types: ["DUEL", "TACKLE", "INTERCEPTION", "RECOVERY", "BLOCK", "CLEARANCE"],
  },
  { label: "Fautes & gardien", types: ["FOUL", "SAVE"] },
];
const icons: Record<string, typeof Target> = {
  PASS: MoveRight,
  SHOT: Target,
  DRIBBLE: Footprints,
  TOUCH: CircleDot,
  TURNOVER: X,
  DUEL: Swords,
  TACKLE: Shield,
  INTERCEPTION: Waypoints,
  RECOVERY: ShieldCheck,
  BLOCK: Shield,
  CLEARANCE: CornerUpRight,
  FOUL: Hand,
  SAVE: Hand,
};
const prompts: Record<string, string> = {
  PASS: "Quel est le résultat de la passe ?",
  SHOT: "Comment se termine le tir ?",
  DRIBBLE: "Le joueur a-t-il passé son adversaire ?",
  DUEL: "Le joueur ciblé gagne-t-il le duel ?",
  TACKLE: "Comment se termine le tacle ?",
  FOUL: "Le joueur commet-il ou subit-il la faute ?",
  SAVE: "Que fait le gardien après l’arrêt ?",
};
const emptyLabel = (d: CaptureDraft) =>
  d.type === "SHOT"
    ? "Sans passe décisive"
    : d.type === "PASS"
      ? "Destinataire non identifié"
      : "Joueur non identifié";
type Props = {
  match: Match;
  data: League;
  actor: string;
  draft: CaptureDraft | null;
  editing: MatchEvent | null;
  busy?: boolean;
  time: string;
  manualTime: boolean;
  onTimeChange: (value: string) => void;
  onFollowVideo?: () => void;
  onPlayer: (id: string) => void;
  onStart: (type: string) => void;
  onDraft: (draft: CaptureDraft) => void;
  onCancel: () => void;
  onSaveEdit: () => void;
};
export function AnnotationCapture({
  match: m,
  data,
  actor,
  draft: d,
  editing,
  busy,
  time,
  manualTime,
  onTimeChange,
  onFollowVideo,
  onPlayer,
  onStart,
  onDraft,
  onCancel,
  onSaveEdit,
}: Props) {
  const name = (id: string) =>
    data.players.find((p) => p.id === id)?.name ?? id;
  const side = m.participants.find((p) => p.playerId === actor)?.team;
  const step = d ? captureStep(d) : "action",
    legacy = !!editing && !isV2(editing) && !d;
  const outcomes =
    d?.type === "FOUL"
      ? ["COMMITTED", "SUFFERED"]
      : (definitions[d?.type ?? ""]?.outcomes ?? []);
  const resultLabel = (value: string) =>
    value === "COMMITTED"
      ? "Commise"
      : value === "SUFFERED"
        ? "Subie"
        : (actionLabels[value] ?? value);
  const showOutcome =
    !!d && outcomes.length > 0 && (step === "outcome" || !!editing);
  const showMate =
    !!d &&
    (step === "mate" ||
      (!!editing &&
        (d.type === "PASS" || (d.type === "SHOT" && d.outcome === "GOAL"))));
  const showOpponent =
    !!d &&
    (step === "opponent" ||
      (!!editing &&
        ([
          "DRIBBLE",
          "DUEL",
          "TACKLE",
          "FOUL",
          "SAVE",
          "BLOCK",
          "INTERCEPTION",
        ].includes(d.type) ||
          (d.type === "SHOT" && d.outcome === "BLOCKED") ||
          (d.type === "TURNOVER" && d.tags.includes("DISPOSSESSED")))));
  const fieldLabel =
    d?.type === "PASS"
      ? "À qui la passe était-elle destinée ?"
      : d?.type === "SHOT"
        ? "Qui a fait la passe décisive ?"
        : d?.type === "SAVE" || d?.type === "BLOCK"
          ? "Qui a tiré ?"
          : d?.type === "INTERCEPTION"
            ? "De quel adversaire vient le ballon ?"
            : "Quel adversaire est impliqué ?";
  const incompletePosition =
    !!d?.positionInput &&
    (d.positionInput.x !== "" || d.positionInput.y !== "") &&
    (d.positionInput.x === "" || d.positionInput.y === "");
  function coordinate(axis: "x" | "y", value: string) {
    if (!d) return;
    const input = {
      x: d.positionInput?.x ?? String(d.position?.x ?? ""),
      y: d.positionInput?.y ?? String(d.position?.y ?? ""),
      [axis]: value,
    };
    const x = Number(input.x),
      y = Number(input.y),
      valid =
        input.x !== "" &&
        input.y !== "" &&
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        x >= 0 &&
        x <= 100 &&
        y >= 0 &&
        y <= 100;
    onDraft({ ...d, positionInput: input, position: valid ? { x, y } : null });
  }
  function selectResult(outcome: string) {
    if (d)
      onDraft({
        ...d,
        outcome,
        mate: "",
        opponent: "",
        participantChosen: false,
        linkedEventId: undefined,
      });
  }
  return (
    <section
      className="annotation-capture precise-capture"
      aria-label="Saisir une action précise"
    >
      <div className="capture-heading">
        <div>
          <span className="studio-label">SAISIE PRÉCISE</span>
          <h3>{editing ? "Corriger l’action" : "Noter une action"}</h3>
        </div>
        <AnnotationTimeControl
          label={
            d || editing
              ? "Temps figé · action en cours"
              : manualTime
                ? "Temps du match"
                : "Temps du match · vidéo"
          }
          value={time}
          duration={m.duration}
          disabled={busy}
          onChange={onTimeChange}
          onFollowVideo={onFollowVideo}
        />
      </div>
      <div className="capture-step">
        <span>1</span>
        <h4>Choisir le joueur ciblé</h4>
        {actor && <strong className="capture-selected">{name(actor)}</strong>}
      </div>
      <div className="capture-teams">
        {(["A", "B"] as const).map((team) => (
          <div key={team} className={"capture-team team-" + team.toLowerCase()}>
            <div className="capture-team-label">
              <span>{team}</span>
              {teamName(m, team)}
            </div>
            <div className="capture-player-grid">
              {m.participants
                .filter((p) => p.team === team)
                .map((p) => {
                  const player = data.players.find((x) => x.id === p.playerId),
                    active = actor === p.playerId;
                  return (
                    <button
                      type="button"
                      key={p.playerId}
                      aria-label={"Choisir " + name(p.playerId)}
                      aria-pressed={active}
                      disabled={busy}
                      className={
                        "capture-player-button " + (active ? "active" : "")
                      }
                      onClick={() => onPlayer(p.playerId)}
                    >
                      <span className="capture-avatar">
                        {player?.photo ? (
                          <img
                            src={player.photo}
                            width={40}
                            height={40}
                            loading="lazy"
                            alt=""
                          />
                        ) : (
                          name(p.playerId).slice(0, 2).toUpperCase()
                        )}
                      </span>
                      <span>{name(p.playerId)}</span>
                      {active && <Check size={14} aria-hidden="true" />}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
      <div className="capture-step">
        <span>2</span>
        <h4>Choisir l’action</h4>
        <small>
          {actor ? "Pour " + name(actor) : "Sélectionne d’abord un joueur"}
        </small>
      </div>
      <div className="precise-action-groups">
        {groups.map((group) => (
          <div className="precise-action-group" key={group.label}>
            <span className="studio-label">{group.label}</span>
            <div className="capture-action-grid">
              {group.types.map((type) => {
                const Icon = icons[type];
                return (
                  <button
                    type="button"
                    key={type}
                    aria-pressed={d?.type === type}
                    disabled={busy || !side}
                    className={
                      "capture-action " + (d?.type === type ? "active" : "")
                    }
                    onClick={() => onStart(type)}
                  >
                    <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                    <span>{definitions[type].label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {(d || legacy) && (
        <div className="precise-question" aria-label="Préciser l’action">
          <div className="precise-question-header">
            <div>
              <span className="studio-label">
                {editing ? "CORRECTION" : "3 · COMPLÉTER L’ACTION"}
              </span>
              <h4>
                {name(actor)}
                <ArrowRight size={18} aria-hidden="true" />
                {d ? definitions[d.type]?.label : "Action historique"}
                {d?.outcome && (
                  <button
                    type="button"
                    className="tag"
                    aria-label="Changer le résultat"
                    title="Changer le résultat"
                    onClick={() =>
                      onDraft({ ...d, outcome: "", participantChosen: false })
                    }
                  >
                    {resultLabel(d.outcome)} ↶
                  </button>
                )}
              </h4>
            </div>
            <button type="button" className="textbutton" onClick={onCancel}>
              <X size={14} aria-hidden="true" />
              Annuler la saisie
            </button>
          </div>
          {legacy && (
            <p>
              Cette action historique garde ses données. Tu peux corriger le
              joueur et le temps, ou choisir une action pour la convertir.
            </p>
          )}
          {showOutcome && (
            <div className="precise-choice">
              <strong>{prompts[d!.type]}</strong>
              <div className="precise-choice-buttons">
                {outcomes.map((value) => (
                  <button
                    type="button"
                    className={
                      "button " + (d!.outcome === value ? "primary" : "")
                    }
                    aria-pressed={d!.outcome === value}
                    disabled={busy}
                    key={value}
                    onClick={() => selectResult(value)}
                  >
                    {resultLabel(value)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {d &&
            (step === "detail" ||
              (!!editing &&
                ["RECOVERY", "CLEARANCE", "TURNOVER"].includes(d.type))) && (
              <div className="precise-choice">
                <strong>
                  {d.type === "RECOVERY"
                    ? "Comment le ballon est-il récupéré ?"
                    : d.type === "CLEARANCE"
                      ? "Comment le joueur dégage-t-il ?"
                      : "Comment le ballon est-il perdu ?"}
                </strong>
                <div className="precise-choice-buttons">
                  {definitions[d.type].tags.map((tag) => (
                    <button
                      type="button"
                      disabled={busy}
                      aria-pressed={d.tags.includes(tag)}
                      className={
                        "button " + (d.tags.includes(tag) ? "primary" : "")
                      }
                      key={tag}
                      onClick={() =>
                        onDraft({
                          ...d,
                          tags: [tag],
                          detailChosen: true,
                          participantChosen: false,
                        })
                      }
                    >
                      {actionLabels[tag]}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={busy}
                    className="button"
                    onClick={() =>
                      onDraft({
                        ...d,
                        tags: [],
                        detailChosen: true,
                        participantChosen: false,
                      })
                    }
                  >
                    Sans précision
                  </button>
                </div>
              </div>
            )}
          {(showMate || showOpponent) && d && (
            <div className="precise-choice">
              <strong>{fieldLabel}</strong>
              <p className="capture-help">
                {showMate ? teamName(m, side ?? "A") : "Équipe adverse"} ·{" "}
                {participantRequired(d)
                  ? "Choisis le joueur impliqué."
                  : "Choisis le joueur, ou indique qu’il n’est pas identifié."}
              </p>
              <div className="precise-choice-buttons precise-candidates">
                {m.participants
                  .filter((p) =>
                    showMate
                      ? p.team === side && p.playerId !== actor
                      : p.team && p.team !== side,
                  )
                  .map((p) => (
                    <button
                      type="button"
                      className={
                        "button " +
                        ((showMate ? d.mate : d.opponent) === p.playerId
                          ? "primary"
                          : "")
                      }
                      disabled={busy}
                      key={p.playerId}
                      onClick={() =>
                        onDraft({
                          ...d,
                          [showMate ? "mate" : "opponent"]: p.playerId,
                          participantChosen: true,
                        })
                      }
                    >
                      {name(p.playerId)}
                    </button>
                  ))}
                {!participantRequired(d) && (
                  <button
                    type="button"
                    className="button"
                    disabled={busy}
                    onClick={() =>
                      onDraft({
                        ...d,
                        mate: "",
                        opponent: "",
                        participantChosen: true,
                        linkedEventId: null,
                      })
                    }
                  >
                    {emptyLabel(d)}
                  </button>
                )}
              </div>
            </div>
          )}
          {!editing && (
            <p className="precise-next">
              {step === "outcome"
                ? "Choisis le résultat pour continuer."
                : step === "detail"
                  ? "Choisis une précision pour enregistrer."
                  : "Ce dernier choix enregistre l’action dans le brouillon."}{" "}
              Le joueur ciblé reste sélectionné.
            </p>
          )}
          {editing && d && (
            <details className="precise-extra">
              <summary>
                Précisions facultatives · tags, position et action liée
              </summary>
              <div className="precise-choice-buttons">
                {definitions[d.type].tags.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    disabled={busy}
                    aria-pressed={d.tags.includes(tag)}
                    className={
                      "button " + (d.tags.includes(tag) ? "primary" : "")
                    }
                    onClick={() =>
                      onDraft({
                        ...d,
                        tags: d.tags.includes(tag)
                          ? d.tags.filter((t) => t !== tag)
                          : [...d.tags, tag],
                      })
                    }
                  >
                    {actionLabels[tag]}
                  </button>
                ))}
              </div>
              <div className="precise-position-board">
                <div className="split">
                  <strong>Position observée</strong>
                  <button
                    type="button"
                    className="textbutton"
                    onClick={() =>
                      onDraft({
                        ...d,
                        position: null,
                        positionInput: undefined,
                        endPosition: null,
                      })
                    }
                  >
                    Effacer
                  </button>
                </div>
                <div
                  className="precise-pitch"
                  role="img"
                  aria-label="Terrain pour placer la position observée, attaque vers la droite"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onDraft({
                      ...d,
                      positionInput: undefined,
                      position: {
                        x: Math.round(
                          ((e.clientX - rect.left) / rect.width) * 100,
                        ),
                        y: Math.round(
                          ((e.clientY - rect.top) / rect.height) * 100,
                        ),
                      },
                    });
                  }}
                >
                  <span className="precise-pitch-circle" />
                  <span className="precise-pitch-box left" />
                  <span className="precise-pitch-box right" />
                  {d.position && (
                    <span
                      className="precise-pitch-dot"
                      style={{
                        left: d.position.x + "%",
                        top: d.position.y + "%",
                      }}
                    >
                      {name(actor).slice(0, 2)}
                    </span>
                  )}
                  <span className="precise-pitch-direction">But adverse →</span>
                </div>
              </div>
              <div className="precise-position">
                <label>
                  Position X (vers le but adverse)
                  <input
                    aria-label="Position X observée"
                    type="number"
                    min="0"
                    max="100"
                    value={d.positionInput?.x ?? d.position?.x ?? ""}
                    onChange={(e) => coordinate("x", e.target.value)}
                  />
                </label>
                <label>
                  Position Y (gauche → droite)
                  <input
                    aria-label="Position Y observée"
                    type="number"
                    min="0"
                    max="100"
                    value={d.positionInput?.y ?? d.position?.y ?? ""}
                    onChange={(e) => coordinate("y", e.target.value)}
                  />
                </label>
              </div>
              <p className="capture-help">
                {incompletePosition
                  ? "Renseigne X et Y pour enregistrer une position observée. "
                  : ""}
                Coordonnées de 0 à 100. À renseigner uniquement si la position
                est observée.
              </p>
              {["SHOT", "SAVE", "BLOCK", "TURNOVER"].includes(d.type) && (
                <label>
                  Action liée
                  <select
                    aria-label="Action liée"
                    value={d.linkedEventId ?? ""}
                    onChange={(e) =>
                      onDraft({ ...d, linkedEventId: e.target.value || null })
                    }
                  >
                    <option value="">Aucune</option>
                    {m.events
                      .filter(
                        (e) =>
                          e.id !== editing.id &&
                          (d.type === "SHOT"
                            ? e.type === "PASS" &&
                              e.relatedPlayerId === actor &&
                              e.metadata.outcome === "COMPLETED" &&
                              e.metadata.sequenceId ===
                                editing.metadata.sequenceId &&
                              e.timestamp != null &&
                              e.timestamp <= (editing.timestamp ?? 0) &&
                              !m.events.some(
                                (shot) =>
                                  shot.id !== editing.id &&
                                  shot.metadata.linkedEventId === e.id,
                              ) &&
                              (!d.mate || e.playerId === d.mate)
                            : d.type === "TURNOVER"
                              ? e.playerId === actor &&
                                ((e.metadata.tags as string[]) ?? []).includes(
                                  "POSSESSION_LOST",
                                )
                              : e.type === "SHOT" &&
                                e.playerId === d.opponent &&
                                e.metadata.outcome ===
                                  (d.type === "SAVE"
                                    ? "ON_TARGET"
                                    : "BLOCKED")),
                      )
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.timestamp == null
                            ? "—"
                            : Math.floor(e.timestamp / 60) +
                              ":" +
                              String(e.timestamp % 60).padStart(2, "0")}{" "}
                          · {name(e.playerId)} ·{" "}
                          {definitions[e.type]?.label ?? e.type}
                        </option>
                      ))}
                  </select>
                </label>
              )}
            </details>
          )}
          {editing && (
            <button
              type="button"
              className="button primary"
              disabled={busy || incompletePosition || (!!d && step !== "ready")}
              onClick={onSaveEdit}
            >
              Enregistrer la correction
            </button>
          )}
        </div>
      )}
    </section>
  );
}
