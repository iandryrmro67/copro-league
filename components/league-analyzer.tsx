"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Save,
  SlidersHorizontal,
} from "lucide-react";
import type { League, Match, MatchEvent } from "@/lib/model";
import {
  analysisCounts,
  beginAnalysis,
  annotatedScore,
} from "@/lib/match-analysis";
import { actionDefinitions, eventLabel } from "@/lib/actions";
import { youtubeId } from "@/lib/engine";
import { AnnotationTimeControl } from "./annotation-time-control";
import { parseActionTime } from "@/lib/annotation-time";
import { AnnotationCapture } from "./league-annotation-capture";
import {
  VideoPlayer,
  VideoSource,
  type VideoPlayerHandle,
  type VideoStatus,
} from "./league-video";
import { EventTimeline } from "./league-event-timeline";
import {
  annotationMoment,
  restoreAnnotation,
  reviewRanges,
  eventVideoTime,
  type ActionFilters,
  type AnnotationMoment,
} from "@/lib/annotation-controls";
import {
  captureStep,
  restoreCaptureDraft,
  restoredCaptureActor,
  retargetCapture,
  correctHistoricalAction,
  recordPreciseAction,
  recordCirculationPass,
  prepareActionCorrection,
  reconcileActionLinks,
  type CaptureDraft,
} from "@/lib/precise-annotation";
const clock = (s: number | null) =>
  s == null
    ? ""
    : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const blank = (type: string): CaptureDraft => ({
  type,
  outcome: "",
  mate: "",
  opponent: "",
  tags: [],
  participantChosen: false,
  detailChosen: false,
  precisionChosen: false,
});
export function Analyzer({
  match: m,
  data,
  onChange,
  onSave,
  busy,
}: {
  match: Match;
  data: League;
  onChange: (m: Match) => void;
  onSave?: (m: Match) => void;
  busy?: boolean;
}) {
  const saved = m.analysis?.session.builder;
  const restoredActor = saved ? restoredCaptureActor(m, saved) : "";
  const recoveredCorrection = !!saved?.editing && restoredActor !== saved.actor;
  const storedCorrection = recoveredCorrection ? m.events.find(e=>e.id===saved?.editing) : undefined;
  const [actor, setActor] = useState(restoredActor),
    [stamp, setStamp] = useState(storedCorrection ? clock(storedCorrection.timestamp) : saved?.stamp ?? "00:00"),
    [manual, setManual] = useState(saved?.manual ?? false);
  const [editing, setEditing] = useState<string | null>(saved?.editing ?? null);
  const [draft, setDraft] = useState<CaptureDraft | null>(() =>
    saved ? restoreCaptureDraft(m, saved) : null,
  );
  const [sequence, setSequence] = useState(
      m.analysis?.session.sequenceId ?? crypto.randomUUID(),
    ),
    [playhead, setPlayhead] = useState(m.analysis?.session.videoTime ?? 0);
  const [hidden, setHidden] = useState(saved?.videoHidden ?? false),
    [status, setStatus] = useState<VideoStatus>("loading"),
    [videoEpoch, setVideoEpoch] = useState(0);
  const [localVideo, setLocalVideo] = useState(""),
    [localName, setLocalName] = useState(""),
    [focus, setFocus] = useState(false),
    [fullscreen, setFullscreen] = useState(false),
    [fullscreenExpanded, setFullscreenExpanded] = useState(false),
    [theatre, setTheatre] = useState(false),
    [filters, setFilters] = useState<ActionFilters>({});
  const [past, setPast] = useState<Match[]>([]),
    [future, setFuture] = useState<Match[]>([]),
    [message, setMessage] = useState(recoveredCorrection ? "Ancienne correction rechargée depuis l’action enregistrée. Vérifie les choix avant de sauvegarder." : ""),
    [lastId, setLastId] = useState<string | null>(null);
  const [positionCapture, setPositionCapture] = useState(false);
  const [chainTeam, setChainTeam] = useState<"A" | "B" | null>(null);
  const resumePlayback = useRef(false);
  const video = useRef<VideoPlayerHandle>(null),
    root = useRef<HTMLDivElement>(null),
    frozen = useRef<AnnotationMoment | null>(
      saved?.captureActive &&
        saved.captureVideoTime != null &&
        /^\d{1,4}:[0-5]\d$/.test(saved.stamp)
        ? {
            timestamp:
              Number(saved.stamp.split(":")[0]) * 60 +
              Number(saved.stamp.split(":")[1]),
            videoTimestamp: saved.captureVideoTime,
          }
        : null,
    ),
    committed = useRef(false);
  const fullWorkspace = fullscreen || fullscreenExpanded;
  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === document.documentElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  async function toggleWorkspaceFullscreen() {
    if (fullWorkspace) {
      setFullscreenExpanded(false);
      if (document.fullscreenElement) await document.exitFullscreen();
      return;
    }
    setFullscreenExpanded(true);
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* The full-window editor remains usable when native fullscreen is unavailable. */
    }
  }
  const offset = m.analysis?.session.offset ?? 0,
    src = localVideo || m.video,
    showVideo = !!src && !hidden && status !== "error",
    useVideo = showVideo && status === "ready" && !manual && !editing && !draft;
  const edited = m.events.find((e) => e.id === editing) ?? null,
    name = (id: string) => data.players.find((p) => p.id === id)?.name ?? id;
  // Only observations and coverage affect the counters.
  const counts = useMemo(
    () => analysisCounts(m),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.events, m.participants, m.analysis?.completeKeys],
  );
  const score = annotatedScore(m);
  useEffect(
    () => () => {
      if (localVideo) URL.revokeObjectURL(localVideo);
    },
    [localVideo],
  );
  useEffect(() => {
    if (!m.analysis) return;
    const builder = {
      actor,
      mate: draft?.mate ?? "",
      opponent: draft?.opponent ?? "",
      type: draft?.type ?? "SHOT",
      outcome: draft?.outcome ?? "",
      tags: draft?.tags ?? [],
      stamp,
      manual,
      editing,
      linked: draft?.linkedEventId ?? "",
      automaticLink: draft?.linkedEventId === undefined,
      positionKnown: !!draft?.position,
      quick: false,
      view: "builder",
      scene: draft?.scene ?? { players: {}, ball: null },
      capturePosition: draft?.position ?? null,
      positionInput: draft?.positionInput,
      end: draft?.endPosition ?? null,
      captureActive: !!draft,
      participantChosen: draft?.participantChosen ?? false,
      detailChosen: draft?.detailChosen ?? false,
      precisionChosen: draft?.precisionChosen,
      positionPending: draft?.positionPending,
      correctionVersion: editing ? 1 : undefined,
      videoHidden: hidden,
      captureVideoTime:
        frozen.current?.timestamp ===
        Number(stamp.split(":")[0]) * 60 + Number(stamp.split(":")[1])
          ? frozen.current?.videoTimestamp
          : undefined,
    };
    if (JSON.stringify(builder) !== JSON.stringify(m.analysis.session.builder))
      onChange({
        ...m,
        analysis: {
          ...m.analysis,
          session: { ...m.analysis.session, sequenceId: sequence, builder },
        },
      });
  }, [m, onChange, actor, stamp, manual, editing, draft, sequence, hidden]);
  useEffect(() => {
    if (draft?.type)
      root.current
        ?.querySelector(".precise-question")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    else if (lastId && !chainTeam)
      root.current
        ?.querySelector(".precise-action-groups")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [draft?.type, editing, lastId, chainTeam]);
  function changeActionTime(value: string) {
    if (busy) return;
    setStamp(value);
    setManual(true);
    frozen.current = null;
    const seconds = parseActionTime(value);
    if (seconds != null && showVideo && status === "ready")
      video.current?.seek(Math.max(0, seconds + offset));
  }
  function moment(): AnnotationMoment {
    const value = annotationMoment({
      videoTime: video.current?.time() ?? playhead,
      offset,
      stamp,
      useVideo,
    });
    if (!useVideo && frozen.current?.timestamp === value.timestamp)
      return frozen.current;
    return value;
  }
  function remember(next: Match) {
    setPast((p) => [...p.slice(-49), structuredClone(m)]);
    setFuture([]);
    onChange(next);
  }
  function cancel() {
    if (resumePlayback.current && showVideo && !editing) video.current?.play();
    resumePlayback.current = false;
    setDraft(null);
    setEditing(null);
    setManual(false);
    frozen.current = null;
    committed.current = false;
  }
  function undo() {
    const prev = past.at(-1);
    if (!prev) return;
    setFuture((f) => [...f, structuredClone(m)]);
    setPast((p) => p.slice(0, -1));
    onChange(restoreAnnotation(m, prev));
    setSequence(prev.analysis?.session.sequenceId ?? sequence);
    setActor(prev.analysis?.session.builder?.actor ?? actor);
    setChainTeam(null);
    cancel();
    setLastId(null);
    setMessage("Dernière modification annulée.");
  }
  function redo() {
    const next = future.at(-1);
    if (!next) return;
    setPast((p) => [...p, structuredClone(m)]);
    setFuture((f) => f.slice(0, -1));
    onChange(restoreAnnotation(m, next));
    setSequence(next.analysis?.session.sequenceId ?? sequence);
    setChainTeam(null);
    cancel();
    setMessage("Modification rétablie.");
  }
  function commit(value: CaptureDraft, marked?: AnnotationMoment) {
    if (busy || committed.current) return;
    try {
      const result = recordPreciseAction(m, {
        draft: value,
        playerId: actor,
        sequenceId: sequence,
        moment: marked ?? moment(),
        editing,
      });
      committed.current = true;
      if (resumePlayback.current && showVideo && !editing)
        video.current?.play();
      resumePlayback.current = false;
      remember(result.match);
      setSequence(result.sequenceId);
      setActor(result.nextActor);
      setDraft(null);
      setEditing(null);
      setManual(false);
      setStamp(clock(result.event.timestamp));
      if (!showVideo)
        setPlayhead(result.event.metadata.videoTimestamp as number);
      frozen.current = null;
      setLastId(result.event.id);
      setMessage(
        `${clock(result.event.timestamp)} · ${name(actor)} · ${value.type === "FOUL" && value.outcome === "SUFFERED" ? "Faute subie" : eventLabel(result.event)}${value.mate ? " → " + name(value.mate) : ""}${value.opponent ? " · " + name(value.opponent) : ""} · ${editing ? "corrigée" : "ajoutée"} au brouillon.`,
      );
    } catch (error) {
      setMessage((error as Error).message);
    }
  }
  function openLocalVideo(file: File) {
    if (!/\.(mp4|mov|webm)$/i.test(file.name)) {
      setMessage("Choisis une vidéo MP4, MOV ou WebM.");
      return;
    }
    setStatus("loading");
    setHidden(false);
    setManual(false);
    setLocalVideo(URL.createObjectURL(file));
    setLocalName(file.name);
    setMessage(
      "Vidéo ouverte sur cet appareil. Aucune compression ni envoi nécessaire.",
    );
  }
  function start(type: string, initial: Partial<CaptureDraft> = {}) {
    if (busy) return;
    setChainTeam(null);
    if (!m.participants.some((p) => p.playerId === actor && p.team)) {
      setMessage("Choisis d’abord le joueur ciblé.");
      return;
    }
    try {
      const marked = moment();
      frozen.current = marked;
      if (!draft && !editing)
        resumePlayback.current = showVideo && !!video.current?.isPlaying();
      video.current?.pause();
      setStamp(clock(marked.timestamp));
      setManual(true);
      committed.current = false;
      setMessage("");
      const next = { ...blank(type), positionPending: positionCapture, ...initial };
      setDraft(next);
      if (!editing && captureStep(next) === "ready") commit(next, marked);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }
  function update(value: CaptureDraft) {
    setDraft(value);
    if (!editing && captureStep(value) === "ready") commit(value);
  }
  function toggleChain(team: "A" | "B") {
    if (busy || draft || editing) return;
    setChainTeam(chainTeam === team ? null : team);
    if (m.participants.find((p) => p.playerId === actor)?.team !== team)
      setActor("");
    committed.current = false;
  }
  function choosePlayer(id: string) {
    if (busy) return;
    if (actor === id) {
      setActor("");
      if (draft || editing) cancel();
      setMessage("");
      return;
    }
    if (chainTeam) {
      const target = m.participants.find((p) => p.playerId === id);
      if (target?.team !== chainTeam) {
        setChainTeam(null);
        setActor(id);
        return;
      }
      if (!actor || actor === id) {
        setActor(id);
        return;
      }
      try {
        const result = recordCirculationPass(m, {
          from: actor,
          to: id,
          sequenceId: sequence,
          moment: moment(),
        });
        remember(result.match);
        setActor(result.nextActor);
        setSequence(result.sequenceId);
        setLastId(result.event.id);
        setStamp(clock(result.event.timestamp));
        if (!showVideo)
          setPlayhead(result.event.metadata.videoTimestamp as number);
        setMessage(
          `${name(actor)} → ${name(id)} · passe ajoutée. ${name(id)} a le ballon.`,
        );
        frozen.current = null;
        committed.current = false;
      } catch (e) {
        setMessage((e as Error).message);
      }
      return;
    }
    setActor(id);
    setMessage("");
    if (draft && !editing) {
      cancel();
    }
    if (editing && draft) setDraft(retargetCapture(draft));
    committed.current = false;
  }
  function edit(e: MatchEvent) {
    setChainTeam(null);
    video.current?.pause();
    frozen.current = null;
    const seconds = eventVideoTime(e, offset);
    if (seconds != null) {
      video.current?.seek(seconds);
      frozen.current = { timestamp: e.timestamp!, videoTimestamp: seconds };
    }
    const correction = prepareActionCorrection(m, e, actor);
    setActor(correction.actor);
    setEditing(e.id);
    setStamp(clock(e.timestamp));
    setManual(true);
    committed.current = false;
    setMessage("");
    setDraft(correction.draft);
    root.current
      ?.querySelector(".precise-capture")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function saveEdit() {
    if (draft) {
      commit(draft);
      return;
    }
    if (!edited || busy) return;
    try {
      const marked = edited.timestamp == null && stamp === "" ? null : moment();
      remember(
        correctHistoricalAction(m, {
          eventId: edited.id,
          playerId: actor,
          moment: marked,
        }),
      );
      cancel();
      setMessage("Action historique corrigée dans le brouillon.");
    } catch (error) {
      setMessage((error as Error).message);
    }
  }
  function remove(id: string) {
    if (busy) return;
    remember(
      beginAnalysis({
        ...m,
        events: reconcileActionLinks(m.events.filter((e) => e.id !== id)),
      }),
    );
    if (editing === id) cancel();
    setMessage("Action supprimée. Tu peux annuler cette modification.");
  }
  function review(events: MatchEvent[]) {
    if (!src || status !== "ready") {
      setMessage("Ajoute une vidéo lisible pour revoir l’extrait.");
      return;
    }
    setHidden(false);
    if (
      !video.current?.review(
        reviewRanges(
          events,
          offset,
          4,
          3,
          video.current?.duration() || Infinity,
        ),
      )
    )
      setMessage("Cet extrait ne peut pas être lu.");
    root.current
      ?.querySelector(".precise-media")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function newSequence() {
    cancel();
    const id = crypto.randomUUID();
    setSequence(id);
    const next = beginAnalysis(m);
    onChange({
      ...next,
      analysis: {
        ...next.analysis!,
        session: { ...next.analysis!.session, sequenceId: id },
      },
    });
    setMessage(
      "Nouvelle possession. Les prochaines actions ne seront pas liées à la précédente.",
    );
  }
  function hideVideo() {
    resumePlayback.current = false;
    video.current?.pause();
    if (!draft && !editing && !manual)
      setStamp(
        clock(Math.max(0, (video.current?.time() ?? playhead) - offset)),
      );
    setHidden(true);
    setManual(false);
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        busy ||
        root.current?.closest('[data-state="inactive"]') ||
        (!root.current?.contains(document.activeElement) &&
          document.activeElement !== document.body)
      )
        return;
      if (e.key === "Escape" && fullWorkspace && !document.fullscreenElement) {
        setFullscreenExpanded(false);
        return;
      }
      const target = e.target as HTMLElement;
      if (
        e.defaultPrevented ||
        target.closest("input,textarea,select,button") ||
        target.isContentEditable
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (e.key === "Escape") {
        cancel();
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        if (showVideo) video.current?.toggle();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        if (showVideo)
          video.current?.step(
            (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 5 : 1),
          );
        return;
      }
      const action = Object.keys(actionDefinitions).find(
        (k) => actionDefinitions[k].shortcut === e.key.toLowerCase(),
      );
      if (action) {
        e.preventDefault();
        start(action);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  const youtube = youtubeId(m.video);
  return (
    <div
      ref={root}
      className={
        "analyzer sequence-workspace precise-workspace " +
        (focus ? "seq-focus " : "") +
        (fullWorkspace ? "workspace-fullscreen " : "") +
        (showVideo ? "has-video " : "") +
        (theatre && showVideo ? "video-theatre" : "")
      }
    >
      <header className="annotation-header">
        <div className="annotation-title">
          <h2>Analyse du match</h2>
          <div className="annotation-context">
            <span>Match {String(m.number).padStart(2, "0")}</span>
            <span>
              Score officiel{" "}
              <strong>
                {m.scoreA ?? "—"} – {m.scoreB ?? "—"}
              </strong>
            </span>
            <span>
              Buts annotés{" "}
              <strong>
                {score.A} – {score.B}
              </strong>
            </span>
          </div>
        </div>
        <div className="annotation-history">
          <button
            type="button"
            aria-label="Annuler la dernière action"
            disabled={busy || !past.length}
            onClick={undo}
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            aria-label="Refaire la dernière action"
            disabled={busy || !future.length}
            onClick={redo}
          >
            <RotateCw size={16} />
          </button>
        </div>
        <div className="annotation-header-actions">
          <span className="tag">Brouillon · {m.events.length} actions</span>
          <button
            type="button"
            className="button"
            onClick={() =>
              fullWorkspace
                ? void toggleWorkspaceFullscreen()
                : setFocus(!focus)
            }
          >
            {focus || fullWorkspace ? (
              <Minimize2 size={15} />
            ) : (
              <Maximize2 size={15} />
            )}{" "}
            {fullWorkspace
              ? "Quitter le plein écran"
              : focus
                ? "Réduire"
                : "Agrandir"}
          </button>
          {(focus || fullWorkspace) && onSave && (
            <button
              type="button"
              className="button primary"
              disabled={busy}
              onClick={() => onSave(m)}
            >
              <Save size={15} />
              Enregistrer
            </button>
          )}
        </div>
      </header>
      <div className="annotation-livebar">
        <div className="livebar-player">
          <span className="studio-label">
            {chainTeam ? "PASSES EN CHAÎNE" : "JOUEUR CIBLÉ"}
          </span>
          <strong>
            {actor ? name(actor) : "Choisis le porteur du ballon"}
          </strong>
        </div>
        <AnnotationTimeControl
          label={
            draft || editing
              ? "Temps figé · action en cours"
              : useVideo
                ? "Temps du match · vidéo"
                : "Temps du match"
          }
          value={useVideo ? clock(Math.max(0, playhead - offset)) : stamp}
          duration={m.duration}
          disabled={busy}
          onChange={changeActionTime}
          onFollowVideo={
            showVideo && status === "ready" && manual && !draft && !editing
              ? () => setManual(false)
              : undefined
          }
        />
      </div>
      <div className="annotation-desk">
        <section className="precise-media" aria-label="Vidéo du match">
          <label className="video-local-primary">
            <strong>{localName || "Ouvrir ma vidéo"}</strong>
            <span>
              Depuis cet ordinateur · sans limite de taille imposée · aucun
              envoi
            </span>
            <input
              aria-label="Ouvrir une vidéo locale"
              type="file"
              accept=".mp4,.mov,.webm"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) openLocalVideo(file);
                e.target.value = "";
              }}
            />
            <small>
              Après rechargement, sélectionne le fichier à nouveau. Tes
              annotations restent sauvegardées.
            </small>
          </label>

          <div className="precise-video-heading">
            <div>
              <span className="studio-label">VIDÉO</span>
              <strong>
                {showVideo
                  ? "Regarder et annoter"
                  : !src
                    ? "Annoter sans vidéo"
                    : status === "error"
                      ? "Vidéo indisponible · saisie manuelle"
                      : "Vidéo masquée · saisie manuelle"}
              </strong>
            </div>
            {showVideo ? (
              <button type="button" className="button" onClick={hideVideo}>
                <EyeOff size={16} />
                Masquer la vidéo / annoter sans vidéo
              </button>
            ) : (
              src && (
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setHidden(false);
                    setManual(false);
                    if (status === "error") {
                      setStatus("loading");
                      setVideoEpoch((v) => v + 1);
                    }
                  }}
                >
                  <Eye size={16} />
                  {status === "error"
                    ? "Réessayer la vidéo"
                    : "Afficher la vidéo"}
                </button>
              )
            )}
          </div>
          {!!src && (
            <div className="precise-player" hidden={!showVideo}>
              <VideoPlayer
                key={src + "-" + videoEpoch}
                annotation
                onFullscreen={() => void toggleWorkspaceFullscreen()}
                fullscreenActive={fullWorkspace}
                theatre={theatre}
                onTheatre={() => setTheatre((value) => !value)}
                ref={video}
                src={src}
                initialTime={m.analysis?.session.videoTime ?? 0}
                onStatus={setStatus}
                onTime={(seconds) => {
                  setPlayhead(seconds);
                  if (!manual && !editing && !draft && showVideo)
                    setStamp(clock(Math.max(0, seconds - offset)));
                  if (
                    m.analysis &&
                    !busy &&
                    Math.floor(seconds) !==
                      Math.floor(m.analysis.session.videoTime)
                  )
                    onChange({
                      ...m,
                      analysis: {
                        ...m.analysis,
                        session: { ...m.analysis.session, videoTime: seconds },
                      },
                    });
                }}
              />
            </div>
          )}
          {!showVideo && (
            <p className="precise-video-note">
              {status === "error"
                ? "Le lecteur ne fonctionne pas. Tu peux continuer à noter les actions. "
                : "Choisis le joueur puis l’action ci-dessous. "}
              Le temps du match reste accessible dans la barre de saisie.
              {youtube && (
                <>
                  {" "}
                  <a
                    href={"https://www.youtube.com/watch?v=" + youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ouvrir sur YouTube ↗
                  </a>
                </>
              )}
            </p>
          )}
        </section>
        <AnnotationCapture
          match={m}
          data={data}
          actor={actor}
          draft={draft}
          editing={edited}
          busy={busy}
          positionCapture={positionCapture}
          onPositionCapture={setPositionCapture}
          chainTeam={chainTeam}
          onChain={toggleChain}
          onFailedChain={() => start("PASS", { outcome: "FAILED" })}
          onPlayer={choosePlayer}
          onStart={start}
          onDraft={update}
          onCancel={cancel}
          onSaveEdit={saveEdit}
        />
      </div>
      {message && (
        <div className="precise-feedback" role="status">
          <span>{message}</span>
          {past.length > 0 && (
            <button
              type="button"
              className="textbutton"
              onClick={undo}
              disabled={busy}
            >
              Annuler
            </button>
          )}
          {lastId && m.events.some((e) => e.id === lastId) && (
            <button
              type="button"
              className="textbutton"
              onClick={() => edit(m.events.find((e) => e.id === lastId)!)}
            >
              Modifier / préciser
            </button>
          )}
        </div>
      )}
      <EventTimeline
        match={m}
        data={data}
        time={
          useVideo
            ? Math.max(0, playhead - offset)
            : (parseActionTime(stamp) ?? Math.max(0, playhead - offset))
        }
        selected={editing}
        filters={filters}
        onFilters={setFilters}
        canReview={!!src && status === "ready"}
        onSeek={(seconds) => changeActionTime(clock(seconds))}
        onSelect={edit}
        onReview={review}
        onRemove={remove}
      />
      <div className="annotation-settings">
        <details className="seq-video-source">
          <summary>
            <SlidersHorizontal size={14} />
            {src
              ? "Source vidéo et synchronisation"
              : "Ajouter une vidéo · facultatif"}
          </summary>
          <VideoSource
            value={m.video}
            onChange={(video) => {
              setStatus("loading");
              setHidden(false);
              setManual(false);
              onChange({ ...m, video });
            }}
            onLocal={openLocalVideo}
          />
          {localVideo && (
            <div className="local-video-status">
              <span>Fichier local · {localName}</span>
              <button
                type="button"
                className="textbutton"
                onClick={() => {
                  setLocalVideo("");
                  setLocalName("");
                  setStatus("loading");
                }}
              >
                Utiliser la vidéo enregistrée
              </button>
            </div>
          )}
          <label>
            Début du match dans la vidéo (secondes)
            <input
              aria-label="Décalage vidéo / match"
              type="number"
              value={offset}
              onChange={(e) => {
                if (m.analysis)
                  onChange({
                    ...m,
                    analysis: {
                      ...m.analysis,
                      session: {
                        ...m.analysis.session,
                        offset: Number(e.target.value) || 0,
                      },
                    },
                  });
              }}
            />
          </label>
          <p className="muted">
            Sur YouTube dans un autre onglet, le temps est manuel. Avec le
            lecteur du site, il se fige au clic sur l’action.
          </p>
        </details>
        <details>
          <summary>Possessions et raccourcis</summary>
          <button
            type="button"
            className="button"
            onClick={newSequence}
            disabled={busy}
          >
            Nouvelle possession
          </button>
          <p className="muted">
            À utiliser après une interruption ou quand l’équipe change. Les
            buts, pertes, fautes, arrêts et récupérations terminent aussi la
            possession.
          </p>
          <p className="muted">
            Espace : lecture / pause · Flèches : ±1 s · Maj + flèche : ±5 s · P
            S D U T I R F : choisir une action · Échap : annuler la saisie ·
            Cmd/Ctrl Z : annuler.
          </p>
        </details>
        <details className="draft-counters">
          <summary>Statistiques du brouillon</summary>
          <div className="review-table">
            <table>
              <thead>
                <tr>
                  <th>Joueur</th>
                  <th>Buts</th>
                  <th>Passes décisives</th>
                  <th>Tirs</th>
                  <th>Passes</th>
                  <th>Pertes</th>
                  <th>CSC</th>
                  <th>Interceptions</th>
                  <th>Récupérations</th>
                  <th>Arrêts</th>
                  <th>Tirs bloqués</th>
                </tr>
              </thead>
              <tbody>
                {counts.participants.map((p) => (
                  <tr key={p.playerId}>
                    <td>{name(p.playerId)}</td>
                    {(
                      [
                        ["GOAL", "goals"],
                        ["ASSIST", "assists"],
                        ["SHOT", "shots"],
                        ["PASS", "passesAttempted"],
                        ["TURNOVER", "turnovers"],
                        ["OWN_GOAL", "ownGoals"],
                        ["INTERCEPTION", "interceptions"],
                        ["RECOVERY", "recoveries"],
                        ["SAVE", "saves"],
                        ["BLOCK", "blocks"],
                      ] as const
                    ).map(([kind, key]) => (
                      <td key={kind}>
                        <button
                          type="button"
                          className="stat-jump"
                          onClick={() =>
                            setFilters({ player: p.playerId, type: kind })
                          }
                        >
                          {kind === "PASS"
                            ? `${p.stats.passesCompleted ?? 0} / ${p.stats.passesAttempted ?? 0}`
                            : (p.stats[key] ?? 0)}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            Ces compteurs concernent le brouillon. Valide les catégories et
            publie dans l’onglet « Vérifier et publier ».
          </p>
        </details>
      </div>
    </div>
  );
}
