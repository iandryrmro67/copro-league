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
import { useState } from "react";
import type { League, Match, MatchEvent } from "@/lib/model";
import { teamName } from "@/lib/model";
import {
  actionDefinitions as definitions,
  actionLabels,
  isV2,
} from "@/lib/actions";
import {
  captureStep,
  captureParticipant,
  participantRequired,
  type CaptureDraft,
} from "@/lib/precise-annotation";
const groups = [
  {
    label: "Avec le ballon",
    types: ["PASS", "SHOT", "DRIBBLE", "TOUCH", "TURNOVER", "OWN_GOAL"],
  },
  {
    label: "Défendre & récupérer",
    types: ["DUEL", "TACKLE", "INTERCEPTION", "RECOVERY", "BLOCK", "CLEARANCE"],
  },
  { label: "Fautes & gardien", types: ["FOUL", "SAVE"] },
];
const icons: Record<string, typeof Target> = {
  OWN_GOAL: CircleDot,
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
  d.type === "SHOT" && d.outcome === "GOAL"
    ? "Sans passe décisive"
    : d.type === "PASS" && d.outcome === "FAILED"
      ? "Aucun / intercepteur non identifié"
      : d.type === "SHOT" && d.outcome === "ON_TARGET"
        ? "Gardien non identifié"
        : "Joueur non identifié";
type Props = {
  match: Match;
  data: League;
  actor: string;
  draft: CaptureDraft | null;
  editing: MatchEvent | null;
  busy?: boolean;
  chainTeam: "A" | "B" | null;
  onChain: (team: "A" | "B") => void;
  onFailedChain: () => void;
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
  chainTeam,
  onChain,
  onFailedChain,
  onPlayer,
  onStart,
  onDraft,
  onCancel,
  onSaveEdit,
}: Props) {
  const [playersOpen, setPlayersOpen] = useState(false),
    [actionsOpen, setActionsOpen] = useState(false);
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
  const participant = d ? captureParticipant(d) : null;
  const showMate =
    !!d && participant === "mate" && (step === "mate" || !!editing);
  const showOpponent =
    !!d && participant === "opponent" && (step === "opponent" || !!editing);
  const fieldLabel =
    d?.type === "PASS"
      ? d.outcome === "FAILED"
        ? "Qui intercepte la passe ?"
        : "À qui la passe était-elle destinée ?"
      : d?.type === "SHOT"
        ? d.outcome === "GOAL"
          ? "Qui a fait la passe décisive ?"
          : d.outcome === "ON_TARGET"
            ? "Quel gardien arrête le tir ?"
            : "Qui a bloqué le tir ?"
        : d?.type === "SAVE" || d?.type === "BLOCK"
          ? "Qui a tiré ?"
          : d?.type === "INTERCEPTION"
            ? "De quel adversaire vient la passe ?"
            : d?.type === "TURNOVER"
              ? "Qui récupère le ballon ?"
              : d?.type === "RECOVERY"
                ? "Quel adversaire a perdu le ballon ?"
                : "Quel adversaire est impliqué ?";
  const counterpartHint =
    d?.type === "PASS" && d.outcome === "FAILED"
      ? "Le joueur choisi reçoit une interception et une récupération."
      : d?.type === "SHOT" && d.outcome === "ON_TARGET"
        ? "Le gardien choisi reçoit un arrêt."
        : d?.type === "TURNOVER" && d.tags.includes("DISPOSSESSED")
          ? "Le joueur choisi reçoit une récupération."
          : d?.type === "INTERCEPTION"
            ? "Le passeur choisi reçoit une passe tentée et ratée."
            : d?.type === "SAVE"
              ? "Le tireur choisi reçoit un tir cadré."
              : d?.type === "BLOCK"
                ? "Le tireur choisi reçoit un tir bloqué."
                : d?.type === "RECOVERY" && d.tags.includes("OPPONENT_ERROR")
                  ? "Le joueur choisi reçoit une perte de balle."
                  : "";
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
        precisionChosen: false,
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
      </div>
      {d && (
        <div className="capture-compact-actions">
          <button
            type="button"
            className="textbutton"
            onClick={() => setPlayersOpen((v) => !v)}
          >
            Changer le joueur
          </button>
          <button
            type="button"
            className="textbutton"
            onClick={() => setActionsOpen((v) => !v)}
          >
            Changer d’action
          </button>
        </div>
      )}
      {!d && !editing && (
        <div className="chain-switches" aria-label="Passes en chaîne">
          {(["A", "B"] as const).map((team) => (
            <button
              type="button"
              key={team}
              className={"button " + (chainTeam === team ? "primary" : "")}
              aria-pressed={chainTeam === team}
              disabled={busy}
              onClick={() => onChain(team)}
            >
              {chainTeam === team ? "Terminer la chaîne" : "Passes en chaîne"} ·{" "}
              {teamName(m, team)}
            </button>
          ))}
        </div>
      )}
      {chainTeam && (
        <p className="chain-guide">
          {actor
            ? `${name(actor)} a le ballon. Clique sur le prochain receveur : une passe réussie est enregistrée.`
            : "Choisis d’abord le joueur qui a le ballon."}
          <button
            type="button"
            className="button"
            disabled={!actor || busy}
            onClick={onFailedChain}
          >
            Passe ratée
          </button>
        </p>
      )}
      {(!d || playersOpen) && (
        <>
          <div className="capture-step">
            <span>1</span>
            <h4>Choisir le joueur ciblé</h4>
            {actor && (
              <strong className="capture-selected">{name(actor)}</strong>
            )}
          </div>
          <div className="capture-teams">
            {(["A", "B"] as const)
              .filter((team) => !chainTeam || chainTeam === team)
              .map((team) => (
                <div
                  key={team}
                  className={"capture-team team-" + team.toLowerCase()}
                >
                  <div className="capture-team-label">
                    <span>{team}</span>
                    {teamName(m, team)}
                  </div>
                  <div className="capture-player-grid">
                    {m.participants
                      .filter((p) => p.team === team)
                      .map((p) => {
                        const player = data.players.find(
                            (x) => x.id === p.playerId,
                          ),
                          active = actor === p.playerId;
                        return (
                          <button
                            type="button"
                            key={p.playerId}
                            aria-label={
                              (chainTeam && actor && actor !== p.playerId
                                ? "Passe vers "
                                : "Choisir ") + name(p.playerId)
                            }
                            aria-pressed={active}
                            disabled={busy}
                            className={
                              "capture-player-button " +
                              (active ? "active" : "")
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
        </>
      )}
      {(!d || actionsOpen) && (
        <>
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
                        onClick={() => {
                          setActionsOpen(false);
                          setPlayersOpen(false);
                          onStart(type);
                        }}
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
        </>
      )}
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
          {d &&
            (["PASS", "SHOT", "DRIBBLE", "DUEL", "TACKLE"].includes(d.type) ||
              (editing && definitions[d.type].tags.length > 0)) && (
              <div className="capture-immediate-tags">
                <strong>Précisions · facultatives</strong>
                <div className="precise-choice-buttons">
                  {definitions[d.type].tags
                    .filter(
                      (tag) =>
                        editing ||
                        !["KEY_PASS", "ASSIST", "POSSESSION_LOST"].includes(
                          tag,
                        ),
                    )
                    .map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        className={
                          "button " + (d.tags.includes(tag) ? "primary" : "")
                        }
                        aria-pressed={d.tags.includes(tag)}
                        disabled={busy}
                        onClick={() => {
                          const exclusive = [
                            "RIGHT_FOOT",
                            "LEFT_FOOT",
                            "HEADER",
                          ].includes(tag)
                            ? ["RIGHT_FOOT", "LEFT_FOOT", "HEADER"]
                            : ["PENALTY", "FREE_KICK"].includes(tag)
                              ? ["PENALTY", "FREE_KICK"]
                              : [];
                          onDraft({
                            ...d,
                            tags: d.tags.includes(tag)
                              ? d.tags.filter((t) => t !== tag)
                              : [
                                  ...d.tags.filter(
                                    (t) => !exclusive.includes(t),
                                  ),
                                  tag,
                                ],
                          });
                        }}
                      >
                        {actionLabels[tag]}
                      </button>
                    ))}
                </div>
              </div>
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
                          opponent: "",
                          linkedEventId: undefined,
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
                        opponent: "",
                        linkedEventId: undefined,
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
              {counterpartHint && (
                <p className="capture-help">{counterpartHint}</p>
              )}
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
          {!editing && step === "precision" && d && (
            <button
              type="button"
              className="button primary"
              disabled={busy}
              onClick={() => onDraft({ ...d, precisionChosen: true })}
            >
              Enregistrer le tir
            </button>
          )}
          {!editing && (
            <p className="precise-next">
              {step === "outcome"
                ? "Choisis le résultat pour continuer."
                : step === "detail"
                  ? "Choisis une précision pour enregistrer."
                  : step === "precision"
                    ? "Ajoute les précisions utiles puis enregistre le tir."
                    : "Ce dernier choix enregistre l’action dans le brouillon."}{" "}
              {d?.type === "PASS" && d.outcome === "COMPLETED"
                ? "Le receveur sera sélectionné pour la suite."
                : "Le joueur ciblé reste sélectionné."}
            </p>
          )}
          {editing && d && (
            <details className="precise-extra">
              <summary>Position et action liée · facultatives</summary>
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
