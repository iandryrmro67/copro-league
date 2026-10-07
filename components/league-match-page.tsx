"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, MapPin, Play, Trophy } from "lucide-react";
import Link from "next/link";
import type { League, Match, MatchEvent, Player } from "@/lib/model";
import { labels, ratios, statGroups, teamName } from "@/lib/model";
import { publicMatch, coverageText } from "@/lib/match-analysis";
import {
  actionDefinitions,
  actionLabels,
  eventLabel,
  isGoal,
  isOwnGoal,
} from "@/lib/actions";
import { coordinates, defensiveActions, offensiveActions } from "@/lib/events";
import { aggregate } from "@/lib/engine";
import {
  actionFamily,
  bestMetric,
  eventInvolves,
  eventSequences,
  goalProgression,
  matchClock,
  observedShots,
  ratingTone,
  scoreBreakdown,
  shotMomentum,
  sortedTeamPlayers,
  teamMetric,
  type Team,
  type TeamMetric,
  type EventSequence,
} from "@/lib/match-presentation";
import {
  Avatar,
  Calendar,
  Empty,
  StatGrid,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  date,
  fmt,
  time,
} from "./league-ui";
import { RatingExplanation } from "./league-analysis";
import { VideoPlayer, type VideoPlayerHandle } from "./league-video";

type Goal = ReturnType<typeof goalProgression>["goals"][number];
const sides: Team[] = ["A", "B"];
function Note({ value }: { value: number | null | undefined }) {
  return (
    <span
      className={`md-note md-note-${ratingTone(value)}`}
      aria-label={
        value == null ? "Note non renseignée" : `Note ${fmt(value)} sur 10`
      }
    >
      {value == null ? "—" : value.toFixed(1).replace(".", ",")}
    </span>
  );
}
function SectionTitle({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="md-section-title">
      <div>
        <span className="eyebrow">{number}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
function MetricValue({
  metric,
  percent = false,
}: {
  metric: TeamMetric;
  percent?: boolean;
}) {
  const partial = metric.observed > 0 && metric.observed < metric.total;
  return (
    <span
      title={
        partial
          ? `Total partiel : ${metric.observed} joueurs renseignés sur ${metric.total}`
          : metric.value == null
            ? "Non renseigné"
            : undefined
      }
    >
      {fmt(metric.value)}
      {percent && metric.value != null ? " %" : ""}
      {partial && <sup aria-label="total partiel">*</sup>}
    </span>
  );
}
function ScoreDetail({ match, team }: { match: Match; team: Team }) {
  const s = scoreBreakdown(match, team);
  return (
    <span className="md-score-detail">
      {s.complete ? (
        <>
          {s.scored} buts + {s.opponentOwnGoals} CSC adverses
          {s.accounted !== s.official && (
            <span className="md-partial"> · saisie partielle</span>
          )}
        </>
      ) : (
        <>Score officiel · détail des buts incomplet</>
      )}
    </span>
  );
}

export function MatchPage({ data, id }: { data: League; id: string }) {
  const original = data.matches.find((m) => m.id === id);
  const [tab, setTab] = useState("match"),
    [focusedGoal, setFocusedGoal] = useState(""),
    [showVideo, setShowVideo] = useState(false),
    [seek, setSeek] = useState(0);
  const videoRef = useRef<VideoPlayerHandle>(null);
  const videoSection = useRef<HTMLElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (new URLSearchParams(location.search).get("video") === "1") {
        setShowVideo(true);
        setTab("actions");
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const match = useMemo(
    () => (original ? publicMatch(original) : null),
    [original],
  );
  if (!match) return <Empty>Ce match n’existe plus.</Empty>;
  const season = data.seasons.find((s) => s.id === match.seasonId),
    mvp = data.players.find((p) => p.id === match.mvpId),
    mvpParticipant = match.participants.find((p) => p.playerId === match.mvpId);
  function replay(event: MatchEvent) {
    const seconds =
      typeof event.metadata.videoTimestamp === "number"
        ? event.metadata.videoTimestamp
        : event.timestamp;
    if (seconds == null) return;
    setSeek(seconds);
    setShowVideo(true);
    videoRef.current?.seek(seconds);
    requestAnimationFrame(() =>
      videoSection.current?.scrollIntoView({
        block: "start",
        behavior: "auto",
      }),
    );
  }
  return (
    <article className="match-detail">
      <div className="md-breadcrumb">
        <Link href="/matchs">Les matchs</Link>
        <span>/</span>
        <span>
          {season?.name ?? "Saison non renseignée"} · Match #{match.number}
        </span>
        {data.admin && (
          <Link className="md-admin" href={`/admin?match=${id}`}>
            Modifier le match <ArrowRight size={12} />
          </Link>
        )}
      </div>
      <header className="md-header">
        <h1 className="sr-only">
          Match #{match.number} : {teamName(match, "A")} contre{" "}
          {teamName(match, "B")}
        </h1>
        <div className="md-header-meta">
          <span className="eyebrow">
            {date(match.date, true)} · {time(match.date)}
          </span>
          <span className="tag">
            {match.status === "finished"
              ? "Terminé"
              : match.status === "cancelled"
                ? "Annulé"
                : "À venir"}{" "}
            · {match.duration} min
          </span>
        </div>
        <div className="md-scoreboard">
          <div className="md-team md-team-A">
            <span className="md-team-mark">A</span>
            <h2>{teamName(match, "A")}</h2>
            <ScoreDetail match={match} team="A" />
          </div>
          <div
            className="md-final-score"
            aria-label={`Score final : ${match.scoreA ?? "inconnu"} à ${match.scoreB ?? "inconnu"}`}
          >
            <strong>{fmt(match.scoreA, 0)}</strong>
            <span>–</span>
            <strong>{fmt(match.scoreB, 0)}</strong>
            <small>
              {match.status === "finished"
                ? "Score final"
                : "Match #" + match.number}
            </small>
          </div>
          <div className="md-team md-team-B">
            <span className="md-team-mark">B</span>
            <h2>{teamName(match, "B")}</h2>
            <ScoreDetail match={match} team="B" />
          </div>
        </div>
        <div className="md-header-bottom">
          {match.location && (
            <span className="md-location">
              <MapPin size={14} />
              {match.location}
            </span>
          )}
          {mvp && (
            <Link className="md-mvp" href={`/joueurs/${mvp.id}`}>
              <Trophy size={17} />
              <span className="eyebrow">MVP désigné</span>
              <Avatar player={mvp} />
              <strong>{mvp.name}</strong>
              <Note value={mvpParticipant?.stats.rating} />
              <ArrowRight size={14} />
            </Link>
          )}
          {match.status === "scheduled" && <Calendar match={match} />}
        </div>
      </header>
      <Tabs value={tab} onValueChange={setTab} className="md-tabs">
        <TabsList className="md-tab-list" aria-label="Contenu du match">
          <TabsTrigger value="match">Match</TabsTrigger>
          <TabsTrigger value="joueurs">
            Joueurs<span>{match.participants.length}</span>
          </TabsTrigger>
          <TabsTrigger value="actions">
            Actions<span>{match.events.length}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="match">
          <MatchOverview
            match={match}
            data={data}
            onGoal={(id) => {
              setFocusedGoal(id);
              setTab("actions");
            }}
            onPlayers={() => setTab("joueurs")}
          />
        </TabsContent>
        <TabsContent value="joueurs">
          <TeamPlayers match={match} data={data} />
        </TabsContent>
        <TabsContent value="actions">
          {match.video && (
            <section className="md-video" ref={videoSection}>
              <button
                className="button"
                aria-expanded={showVideo}
                onClick={() => setShowVideo((v) => !v)}
              >
                <Play size={14} />
                {showVideo ? "Masquer la vidéo" : "Voir la vidéo du match"}
              </button>
              {showVideo && (
                <VideoPlayer
                  ref={videoRef}
                  src={match.video}
                  initialTime={seek}
                />
              )}
            </section>
          )}
          <MatchActions
            key={match.id}
            match={match}
            players={data.players}
            focusedGoal={focusedGoal}
            onReplay={match.video ? replay : undefined}
          />
        </TabsContent>
      </Tabs>
    </article>
  );
}

function MatchOverview({
  match,
  data,
  onGoal,
  onPlayers,
}: {
  match: Match;
  data: League;
  onGoal: (id: string) => void;
  onPlayers: () => void;
}) {
  const progression = useMemo(() => goalProgression(match), [match]);
  const momentum = useMemo(() => shotMomentum(match), [match]);
  const allPlayers = sides.flatMap((side) =>
    sortedTeamPlayers(match, data.players, side),
  );
  const goals = progression.goals;
  const last = goals.at(-1),
    first = goals[0];
  return (
    <>
      <section className="md-section">
        <SectionTitle
          number="01 / LE FIL DU MATCH"
          title="Comment le match s’est joué"
        >
          <button className="textbutton" onClick={() => onGoal("")}>
            Les {goals.length} buts <ArrowRight size={14} />
          </button>
        </SectionTitle>
        {match.events.length > 0 ? (
          <div className="md-story panel">
            <GoalFrieze match={match} goals={goals} onGoal={onGoal} />
            <div className="md-momentum-title">
              <h3>Momentum</h3>
              <span>Tirs observés · par tranche de 5 min</span>
            </div>
            <div
              className="md-momentum"
              role="img"
              aria-label={`Activité offensive : ${momentum.total - momentum.untimed} tirs avec un temps renseigné, ${momentum.untimed} sans temps.`}
            >
              {momentum.buckets.map((bucket) => {
                const max = Math.max(
                  1,
                  ...momentum.buckets.map((b) => Math.max(b.A, b.B)),
                );
                return (
                  <div
                    className="md-momentum-bin"
                    key={bucket.start}
                    title={`${matchClock(bucket.start)}–${matchClock(bucket.end)} · ${teamName(match, "A")} : ${bucket.A} tirs · ${teamName(match, "B")} : ${bucket.B} tirs`}
                  >
                    <span style={{ height: `${(bucket.A / max) * 46}%` }} />
                    <span style={{ height: `${(bucket.B / max) * 46}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="md-time-scale">
              <span>0′</span>
              <span>{Math.round(momentum.buckets.at(-1)!.end / 120)}′</span>
              <span>{Math.round(momentum.buckets.at(-1)!.end / 60)}′</span>
            </div>
            <p className="md-caption">
              {progression.complete
                ? "Tous les buts du score final sont présents dans la frise."
                : `Buts annotés : ${progression.annotatedA}–${progression.annotatedB}. ${!progression.timed ? "Certains temps manquent ; l’ordre complet ne peut pas être établi." : "La frise ne reconstitue pas encore tout le score officiel."}`}{" "}
              {momentum.untimed > 0 &&
                `${momentum.untimed} tirs sans temps ne figurent pas dans le graphique.`}
            </p>
          </div>
        ) : (
          <Empty>
            {match.status === "finished"
              ? "Aucun but annoté. Le score final reste la référence."
              : "Le déroulement sera disponible après le match."}
          </Empty>
        )}
      </section>
      <section className="md-section">
        <SectionTitle
          number="02 / LES JOUEURS QUI ONT PESÉ"
          title="Les meilleurs de chaque équipe"
        >
          <button className="textbutton" onClick={onPlayers}>
            Tous les joueurs <ArrowRight size={14} />
          </button>
        </SectionTitle>
        <div className="md-highlights">
          {sides.map((side) => {
            const entries = sortedTeamPlayers(match, data.players, side),
              best = entries.find((p) => p.participant.stats.rating != null),
              scorer = bestMetric(entries, "goals"),
              creator = bestMetric(entries, "assists");
            return (
              <div className={`md-highlight md-side-${side}`} key={side}>
                <div className="md-team-heading">
                  <span className="md-team-dot" />
                  <h3>{teamName(match, side)}</h3>
                  <span className="eyebrow">Meilleure note</span>
                </div>
                {best ? (
                  <Link
                    className="md-highlight-player"
                    href={`/joueurs/${best.player.id}`}
                  >
                    <Avatar player={best.player} />
                    <strong>{best.player.name}</strong>
                    <Note value={best.participant.stats.rating} />
                  </Link>
                ) : (
                  <p className="md-caption">Notes non renseignées.</p>
                )}
                <div className="md-highlight-facts">
                  <span>
                    <small>Meilleur buteur</small>
                    <strong>{scorer?.player.name ?? "—"}</strong>
                    <b>{fmt(scorer?.participant.stats.goals)}</b>
                  </span>
                  <span>
                    <small>Meilleur passeur</small>
                    <strong>{creator?.player.name ?? "—"}</strong>
                    <b>{fmt(creator?.participant.stats.assists)}</b>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <MatchStatistics match={match} />
      <section className="md-section">
        <SectionTitle
          number="04 / LES ZONES DE JEU"
          title="Où les actions ont eu lieu"
        />
        <MatchHeatmaps match={match} players={data.players} />
      </section>
      <section className="md-section md-recap">
        <SectionTitle number="05 / LE MATCH EN BREF" title="Le résumé" />
        <div className="panel">
          <p>
            {match.status === "finished" &&
            match.scoreA != null &&
            match.scoreB != null
              ? match.scoreA === match.scoreB
                ? `Match nul, ${match.scoreA}–${match.scoreB}.`
                : `${teamName(match, match.scoreA > match.scoreB ? "A" : "B")} s’impose ${Math.max(match.scoreA, match.scoreB)}–${Math.min(match.scoreA, match.scoreB)}.`
              : "Le résultat final n’est pas encore disponible."}{" "}
            {match.mvpId &&
              `${data.players.find((p) => p.id === match.mvpId)?.name ?? "Le joueur désigné"} a été désigné MVP.`}
          </p>
          {progression.complete && first && last && (
            <div className="md-recap-facts">
              <span>
                <small>Premier but</small>
                <strong>
                  {data.players.find((p) => p.id === first.event.playerId)
                    ?.name ?? "Joueur inconnu"}
                  {first.ownGoal ? " (CSC)" : ""}
                </strong>
                <span>{matchClock(first.event.timestamp)}</span>
              </span>
              <span>
                <small>Dernier but</small>
                <strong>
                  {data.players.find((p) => p.id === last.event.playerId)
                    ?.name ?? "Joueur inconnu"}
                  {last.ownGoal ? " (CSC)" : ""}
                </strong>
                <span>{matchClock(last.event.timestamp)}</span>
              </span>
              <span>
                <small>Actions annotées</small>
                <strong>{fmt(match.events.length, 0)}</strong>
                <span>{allPlayers.length} joueurs</span>
              </span>
            </div>
          )}
          {match.notes && <p className="md-match-notes">{match.notes}</p>}
        </div>
      </section>
    </>
  );
}

function GoalFrieze({
  match,
  goals,
  onGoal,
}: {
  match: Match;
  goals: Goal[];
  onGoal: (id: string) => void;
}) {
  const end = Math.max(
    60,
    match.duration * 60,
    ...goals.map((g) => (g.event.timestamp ?? 0) + 1),
  );
  const bins = 24;
  return (
    <div className="md-frieze">
      <div className="md-frieze-heading">
        <span className="eyebrow">Les buts</span>
        <span className="md-caption">
          Par tranche de {fmt(end / bins / 60)} min · cliquez sur un but
        </span>
      </div>
      {sides.map((side) => (
        <div className={`md-goal-lane md-side-${side}`} key={side}>
          <span className="md-lane-name">
            <i className="md-team-dot" />
            {teamName(match, side)}
          </span>
          <div className="md-goal-track">
            {Array.from({ length: bins }, (_, i) => (
              <div className="md-goal-bin" key={i}>
                {goals
                  .filter(
                    (g) =>
                      g.team === side &&
                      g.event.timestamp != null &&
                      Math.min(
                        bins - 1,
                        Math.floor((g.event.timestamp / end) * bins),
                      ) === i,
                  )
                  .map((g) => (
                    <button
                      key={g.event.id}
                      className={
                        g.ownGoal ? "md-goal-marker md-csc" : "md-goal-marker"
                      }
                      title={`${matchClock(g.event.timestamp)} · ${g.ownGoal ? "CSC" : "But"} · ${g.scoreA == null ? "Score intermédiaire inconnu" : `${g.scoreA}–${g.scoreB}`}`}
                      aria-label={`Voir le ${g.ownGoal ? "CSC" : "but"} à ${matchClock(g.event.timestamp)}${g.scoreA == null ? "" : `, score ${g.scoreA} à ${g.scoreB}`}`}
                      onClick={() => onGoal(g.event.id)}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="md-frieze-scale">
        <span>0′</span>
        <span>{Math.round(end / 240)}′</span>
        <span>{Math.round(end / 120)}′</span>
        <span>{Math.round(end / 80)}′</span>
        <span>{Math.round(end / 60)}′</span>
      </div>
      <div className="md-frieze-legend">
        <span>
          <i className="md-goal-marker" /> But
        </span>
        <span>
          <i className="md-goal-marker md-csc" /> CSC adverse
        </span>
        {goals.some((g) => g.event.timestamp == null) && (
          <button className="textbutton" onClick={() => onGoal("")}>
            Voir aussi les buts sans temps <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

const headlineStats = [
  ["shots", "Tirs"],
  ["shotsOnTarget", "Tirs cadrés"],
  ["passPct", "Passes réussies"],
  ["keyPasses", "Passes clés"],
  ["recoveries", "Récupérations"],
  ["duelPct", "Duels remportés"],
];
function MatchStatistics({ match }: { match: Match }) {
  const pair = (key: string) =>
    sides.map((side) =>
      teamMetric(
        match,
        key === "opponentOwnGoals" ? (side === "A" ? "B" : "A") : side,
        key === "opponentOwnGoals" ? "ownGoals" : key,
      ),
    );
  return (
    <section className="md-section">
      <SectionTitle
        number="03 / LES CHIFFRES DU MATCH"
        title="Les statistiques"
      />
      <div className="md-stat-teams">
        <span className="md-side-A">
          <i className="md-team-dot" />
          {teamName(match, "A")}
        </span>
        <Link href="/glossaire">Comprendre les stats ↗</Link>
        <span className="md-side-B">
          {teamName(match, "B")}
          <i className="md-team-dot" />
        </span>
      </div>
      <div className="md-stat-highlights">
        {headlineStats.map(([key, label]) => {
          const [A, B] = pair(key),
            sum = (A.value ?? 0) + (B.value ?? 0),
            pct = Boolean(ratios[key]);
          return (
            <div className="md-comparison" key={key}>
              <div>
                <strong>
                  <MetricValue metric={A} percent={pct} />
                </strong>
                <span>{label}</span>
                <strong>
                  <MetricValue metric={B} percent={pct} />
                </strong>
              </div>
              <div className="md-comparison-bar">
                <span
                  style={{
                    width: `${sum > 0 ? ((A.value ?? 0) / sum) * 100 : 50}%`,
                  }}
                />
                <span />
              </div>
            </div>
          );
        })}
      </div>
      <div className="md-stat-groups">
        {Object.entries(statGroups).map(([group, fields]) => (
          <section className="md-stat-group" key={group}>
            <h3>{group}</h3>
            {group === "Tir" && (
              <div className="md-stat-row md-official-row">
                <strong>{fmt(match.scoreA, 0)}</strong>
                <span>Score · CSC inclus</span>
                <strong>{fmt(match.scoreB, 0)}</strong>
              </div>
            )}
            {(group === "Tir"
              ? [
                  ["goals", fields.goals],
                  ["opponentOwnGoals", "CSC adverses"],
                  ...Object.entries(fields).filter(([key]) => key !== "goals"),
                ]
              : Object.entries(fields)
            ).map(([key, label]) => {
              const [A, B] = pair(key);
              return (
                <div className="md-stat-row" key={key}>
                  <MetricValue metric={A} />
                  <span>
                    {key === "goals"
                      ? "Buts marqués hors CSC"
                      : key === "ownGoals"
                        ? "CSC commis"
                        : key === "goalsConceded"
                          ? "Buts encaissés par l’équipe"
                          : key === "xgConceded"
                            ? "xG de l’équipe adverse"
                            : label}
                  </span>
                  <MetricValue metric={B} />
                </div>
              );
            })}
            {Object.entries(ratios)
              .filter(([, [n]]) => n in fields)
              .map(([key]) => {
                const [A, B] = pair(key);
                return (
                  <div className="md-stat-row" key={key}>
                    <MetricValue metric={A} percent />
                    <span>{labels[key]}</span>
                    <MetricValue metric={B} percent />
                  </div>
                );
              })}
          </section>
        ))}
      </div>
      <p className="md-caption md-stat-legend">
        — : non renseigné. * : total partiel, certains joueurs ne sont pas
        renseignés. Les CSC sont comptés dans le score de l’adversaire. Les buts
        encaissés sont ceux de l’équipe, sans additionner les joueurs.
      </p>
      {match.analysis && (
        <details className="md-coverage">
          <summary>
            Couverture des statistiques <ChevronDown size={14} />
          </summary>
          <p>{coverageText(match)}</p>
        </details>
      )}
    </section>
  );
}

const compareKeys = [
  "goals",
  "assists",
  "shots",
  "shotsOnTarget",
  "passesCompleted",
  "passPct",
  "keyPasses",
  "dribblesCompleted",
  "duelsWon",
  "tackles",
  "interceptions",
  "recoveries",
  "turnovers",
  "ownGoals",
];
function TeamPlayers({ match, data }: { match: Match; data: League }) {
  const summaries = useMemo(
    () => aggregate(data.players, [match]),
    [data.players, match],
  );
  const stats = new Map(summaries.map((s) => [s.player.id, s.stats]));
  return (
    <section className="md-section">
      <SectionTitle number="LES PERFORMANCES" title="Une équipe, une colonne" />
      <p className="md-caption md-player-intro">
        Triés par note. Le MVP est désigné séparément de la meilleure note.
        Ouvrez un joueur pour voir toutes ses statistiques.
      </p>
      <div className="md-rating-legend">
        <span className="md-note-excellent">8–10 · Excellent</span>
        <span className="md-note-good">7–7,9 · Bon</span>
        <span className="md-note-average">6–6,9 · Moyen</span>
        <span className="md-note-low">&lt; 6 · En difficulté</span>
      </div>
      <div className="md-rosters">
        {sides.map((side) => (
          <section key={side} className={`md-roster md-side-${side}`}>
            <div className="md-team-heading">
              <span className="md-team-dot" />
              <h2>{teamName(match, side)}</h2>
              <strong>
                {fmt(side === "A" ? match.scoreA : match.scoreB, 0)}
              </strong>
            </div>
            {sortedTeamPlayers(match, data.players, side).map(
              ({ player, participant }, i) => (
                <div className="md-player-card" key={player.id}>
                  <details>
                    <summary>
                      <span className="md-player-rank">{i + 1}</span>
                      <Avatar player={player} />
                      <strong>{player.name}</strong>
                      {match.mvpId === player.id && (
                        <span className="md-player-mvp">
                          <Trophy size={12} /> MVP
                        </span>
                      )}
                      <Note value={participant.stats.rating} />
                      <ChevronDown className="md-player-chevron" size={15} />
                    </summary>
                    <div className="md-player-all">
                      <RatingExplanation match={match} playerId={player.id} />
                      {summaries.find((s) => s.player.id === player.id) && (
                        <StatGrid
                          summary={
                            summaries.find((s) => s.player.id === player.id)!
                          }
                        />
                      )}
                      <Link
                        className="textbutton"
                        href={`/joueurs/${player.id}`}
                      >
                        Voir le profil <ArrowRight size={13} />
                      </Link>
                    </div>
                  </details>
                  <div className="md-player-metrics">
                    {compareKeys.map((key) => (
                      <span key={key}>
                        <small>
                          {key === "passPct" ? "Réussite passes" : labels[key]}
                        </small>
                        <strong>
                          {fmt(stats.get(player.id)?.[key])}
                          {key === "passPct" &&
                          stats.get(player.id)?.[key] != null
                            ? " %"
                            : ""}
                        </strong>
                      </span>
                    ))}
                  </div>
                </div>
              ),
            )}
          </section>
        ))}
      </div>
      {match.participants.some((p) => !p.team) && (
        <p className="md-caption">
          {match.participants.filter((p) => !p.team).length} joueurs sans équipe
          attribuée ne figurent pas dans les colonnes.
        </p>
      )}
    </section>
  );
}

function Pitch({
  points,
  team,
  name,
}: {
  points: { x: number; y: number; label: string }[];
  team: Team;
  name: string;
}) {
  const bins = Array.from({ length: 72 }, () => 0);
  for (const p of points)
    bins[
      Math.min(5, Math.floor((p.y / 100) * 6)) * 12 +
        Math.min(11, Math.floor((p.x / 100) * 12))
    ]++;
  const maximum = Math.max(1, ...bins);
  return (
    <div className={`md-heat-team md-side-${team}`}>
      <div className="md-team-heading">
        <span className="md-team-dot" />
        <h3>{name}</h3>
        <span>{points.length} positions</span>
      </div>
      <svg
        viewBox="-1 -1 102 52"
        role="img"
        aria-label={`Heatmap de ${name} : ${points.length} actions positionnées. Les deux équipes attaquent vers la droite.`}
      >
        <rect x="0" y="0" width="100" height="50" fill="var(--carbon)" />
        <g className="md-density">
          {bins.map(
            (count, i) =>
              count > 0 && (
                <rect
                  key={i}
                  x={((i % 12) * 100) / 12}
                  y={(Math.floor(i / 12) * 50) / 6}
                  width={100 / 12}
                  height={50 / 6}
                  opacity={0.15 + (0.65 * count) / maximum}
                >
                  <title>{count} actions dans cette zone</title>
                </rect>
              ),
          )}
        </g>
        <g fill="none" stroke="var(--ash)" strokeWidth=".35">
          <rect width="100" height="50" />
          <path d="M50 0v50" />
          <circle cx="50" cy="25" r="7" />
          <path d="M0 12h15v26H0M100 12H85v26h15M0 19h5v12H0M100 19h-5v12h5" />
        </g>
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y / 2}
            r=".7"
            fill="var(--bone)"
            opacity=".6"
          >
            <title>{p.label}</title>
          </circle>
        ))}
      </svg>
      <div className="md-heat-footer">
        <span>Défense</span>
        <span>Attaque →</span>
      </div>
    </div>
  );
}
function MatchHeatmaps({
  match,
  players,
}: {
  match: Match;
  players: Player[];
}) {
  const [mode, setMode] = useState("all"),
    [player, setPlayer] = useState("");
  const shotIds = useMemo(
    () => new Set(observedShots(match.events).map((e) => e.id)),
    [match.events],
  );
  const filtered = useMemo(
    () =>
      match.events.filter(
        (e) =>
          (!player || e.playerId === player) &&
          (mode === "all" ||
            (mode === "shots" && shotIds.has(e.id)) ||
            (mode === "attack" && offensiveActions.has(e.type)) ||
            (mode === "defense" && defensiveActions.has(e.type))),
      ),
    [match.events, mode, player, shotIds],
  );
  const positions = filtered.flatMap((e) => {
    const p = coordinates(e.metadata);
    return p
      ? [
          {
            ...p,
            team: e.team,
            label: `${matchClock(e.timestamp)} · ${players.find((p) => p.id === e.playerId)?.name ?? "Joueur inconnu"} · ${describeEvent(e)}`,
          },
        ]
      : [];
  });
  return (
    <div className="md-heatmaps">
      <div className="md-filter-row">
        <label>
          Actions
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="all">Toutes les actions</option>
            <option value="shots">Tirs</option>
            <option value="attack">Actions offensives</option>
            <option value="defense">Actions défensives</option>
          </select>
        </label>
        <label>
          Joueur
          <select value={player} onChange={(e) => setPlayer(e.target.value)}>
            <option value="">Tous les joueurs</option>
            {match.participants.map((p) => (
              <option key={p.playerId} value={p.playerId}>
                {players.find((v) => v.id === p.playerId)?.name ??
                  "Joueur inconnu"}{" "}
                · {p.team ? teamName(match, p.team) : "Sans équipe"}
              </option>
            ))}
          </select>
        </label>
      </div>
      {positions.length ? (
        <>
          <div className="md-pitches">
            {sides.map((side) => (
              <Pitch
                key={side}
                points={positions.filter((p) => p.team === side)}
                team={side}
                name={teamName(match, side)}
              />
            ))}
          </div>
          <p className="md-caption">
            {positions.length} positions renseignées sur {filtered.length}{" "}
            actions. Les actions sans position sont exclues. Chaque équipe
            attaque vers la droite ; l’intensité est normalisée par équipe.
          </p>
        </>
      ) : (
        <p className="md-heat-empty">
          Aucune position renseignée pour cette sélection.
        </p>
      )}
    </div>
  );
}

const legacyLabels: Record<string, string> = {
  GOAL: "But",
  SHOT: "Tir",
  SHOT_ON_TARGET: "Tir cadré",
  SHOT_OFF_TARGET: "Tir non cadré",
  SHOT_BLOCKED: "Tir bloqué",
  PASS_ATTEMPT: "Passe tentée",
  PASS_COMPLETED: "Passe réussie",
  PASS_FAILED: "Passe ratée",
  DRIBBLE_ATTEMPT: "Dribble tenté",
  DRIBBLE_COMPLETED: "Dribble réussi",
  DRIBBLE_FAILED: "Dribble raté",
  DRIBBLED_PAST: "Dribble subi",
  DUEL_WON: "Duel gagné",
  DUEL_LOST: "Duel perdu",
  ASSIST: "Passe décisive",
  KEY_PASS: "Passe clé",
  POSSESSION_WON_FINAL_THIRD: "Récupération haute",
  TOUCH_OPPOSITION_BOX: "Touche dans la surface adverse",
};
function describeEvent(event: MatchEvent) {
  return isOwnGoal(event)
    ? "But contre son camp"
    : isGoal(event)
      ? "But"
      : event.metadata.schemaVersion === 2
        ? eventLabel(event)
        : (legacyLabels[event.type] ??
          actionDefinitions[event.type]?.label ??
          "Action");
}
function ActionRow({
  event,
  players,
  match,
  goal,
  focused,
  onReplay,
}: {
  event: MatchEvent;
  players: Player[];
  match: Match;
  goal?: Goal;
  focused?: boolean;
  onReplay?: (e: MatchEvent) => void;
}) {
  const names = new Map(players.map((p) => [p.id, p.name])),
    actor = names.get(event.playerId) ?? "Joueur inconnu";
  const other = event.relatedPlayerId ? names.get(event.relatedPlayerId) : null,
    opponent =
      typeof event.metadata.opponentPlayerId === "string"
        ? names.get(event.metadata.opponentPlayerId)
        : null;
  const tags = Array.isArray(event.metadata.tags)
    ? event.metadata.tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => actionLabels[t])
        .filter(Boolean)
    : [];
  return (
    <div
      id={`md-event-${event.id}`}
      className={`md-action-row md-side-${goal?.team ?? event.team}${goal ? " md-goal-row" : ""}${focused ? " md-action-focused" : ""}`}
    >
      <span className="md-action-time">{matchClock(event.timestamp)}</span>
      <span className="md-action-symbol" aria-hidden="true">
        {goal ? "●" : "·"}
      </span>
      <div>
        <div className="md-action-heading">
          <strong>{actor}</strong>
          <span>{describeEvent(event)}</span>
          {goal && (
            <span className="md-running-score" aria-label="Score après ce but">
              {goal.scoreA == null
                ? "Score inconnu"
                : `${goal.scoreA}–${goal.scoreB}`}
            </span>
          )}
        </div>
        <p>
          {goal?.ownGoal
            ? `CSC de ${teamName(match, event.team)} · but pour ${teamName(match, goal.team)}`
            : teamName(match, goal?.team ?? event.team)}
          {other &&
            ` · ${goal ? "Passe décisive : " : actionFamily(event) === "PASS" ? "Vers : " : "Joueur impliqué : "}${other}`}
          {opponent && ` · Adversaire : ${opponent}`}
          {tags.length > 0 && ` · ${tags.join(" · ")}`}
        </p>
      </div>
      {onReplay && event.timestamp != null && (
        <button
          className="md-replay"
          onClick={() => onReplay(event)}
          aria-label={`Voir l’action à ${matchClock(event.timestamp)} dans la vidéo`}
        >
          <Play size={14} />
        </button>
      )}
    </div>
  );
}
function Sequence({
  sequence,
  events,
  players,
  match,
  goalMap,
  onReplay,
}: {
  sequence: EventSequence;
  events: MatchEvent[];
  players: Player[];
  match: Match;
  goalMap: Map<string, Goal>;
  onReplay?: (e: MatchEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  const passes = sequence.events.filter(
      (e) => actionFamily(e) === "PASS",
    ).length,
    shots = sequence.events.filter(
      (e) => actionFamily(e) === "SHOT" || isGoal(e),
    ).length;
  return (
    <details
      className={`md-sequence md-side-${sequence.team}`}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <span className="md-team-dot" />
        <span className="md-sequence-time">
          {matchClock(sequence.start)}
          {sequence.end !== sequence.start
            ? `–${matchClock(sequence.end)}`
            : ""}
        </span>
        <strong>{teamName(match, sequence.team)}</strong>
        <span className="md-sequence-description">
          {passes > 0
            ? `${passes} ${passes === 1 ? "passe" : "passes"}`
            : "Séquence"}
          {shots > 0 ? ` · ${shots} ${shots === 1 ? "tir" : "tirs"}` : ""}
        </span>
        <span>
          {events.length === sequence.events.length
            ? events.length
            : `${events.length}/${sequence.events.length}`}{" "}
          {events.length === 1 ? "action" : "actions"}
        </span>
        <ChevronDown size={14} />
      </summary>
      {open && (
        <div>
          {events.map((event) => (
            <ActionRow
              key={event.id}
              event={event}
              players={players}
              match={match}
              goal={goalMap.get(event.id)}
              onReplay={onReplay}
            />
          ))}
        </div>
      )}
    </details>
  );
}
function MatchActions({
  match,
  players,
  focusedGoal,
  onReplay,
}: {
  match: Match;
  players: Player[];
  focusedGoal: string;
  onReplay?: (e: MatchEvent) => void;
}) {
  const [view, setView] = useState("goals"),
    [team, setTeam] = useState(""),
    [player, setPlayer] = useState(""),
    [type, setType] = useState(""),
    [goalDetail, setGoalDetail] = useState("all"),
    [limit, setLimit] = useState(40);
  const progression = goalProgression(match);
  const sequences = useMemo(() => eventSequences(match.events), [match.events]);
  const goalMap = new Map(progression.goals.map((g) => [g.event.id, g]));
  useEffect(() => {
    if (focusedGoal) {
      document
        .getElementById(`md-event-${focusedGoal}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [focusedGoal]);
  const matches = (e: MatchEvent) =>
    (!team || (goalMap.get(e.id)?.team ?? e.team) === team) &&
    eventInvolves(e, player) &&
    (!type || actionFamily(e) === type) &&
    (goalDetail === "all" ||
      (goalDetail === "unassisted" &&
        isGoal(e) &&
        !isOwnGoal(e) &&
        !e.relatedPlayerId) ||
      (goalDetail === "own" && isOwnGoal(e)));
  const filteredGoals = progression.goals.filter((g) => matches(g.event));
  const filteredSequences = sequences
    .map((s) => ({ sequence: s, events: s.events.filter(matches) }))
    .filter((s) => s.events.length > 0);
  const count =
    view === "goals"
      ? filteredGoals.length
      : filteredSequences.reduce((n, s) => n + s.events.length, 0);
  const familyLabels: Record<string, string> = {
    GOAL: "Buts et CSC",
    PASS: "Passes",
    SHOT: "Tirs hors buts",
    DRIBBLE: "Dribbles",
    DUEL: "Duels",
    TACKLE: "Tacles",
    RECOVERY: "Récupérations",
    INTERCEPTION: "Interceptions",
    SAVE: "Arrêts",
    BLOCK: "Tirs bloqués",
    CLEARANCE: "Dégagements",
    TURNOVER: "Pertes de balle",
    FOUL: "Fautes",
    TOUCH: "Touches",
  };
  const families = [...new Set(match.events.map(actionFamily))];
  function reset() {
    setTeam("");
    setPlayer("");
    setType("");
    setGoalDetail("all");
    setLimit(40);
  }
  return (
    <section className="md-section md-actions">
      <SectionTitle
        number="LE DÉTAIL DU MATCH"
        title={
          view === "goals" ? "Les buts, dans l’ordre" : "Les séquences de jeu"
        }
      />
      <div className="md-action-toolbar">
        <div
          className="md-view-switch"
          role="group"
          aria-label="Affichage des actions"
        >
          <button
            aria-pressed={view === "goals"}
            onClick={() => {
              setView("goals");
              setType("");
              setLimit(40);
            }}
          >
            Buts <span>{progression.goals.length}</span>
          </button>
          <button
            aria-pressed={view === "all"}
            onClick={() => {
              setView("all");
              setType("");
              setGoalDetail("all");
              setLimit(40);
            }}
          >
            Toutes les actions <span>{match.events.length}</span>
          </button>
        </div>
        <p className="md-caption">
          {view === "goals"
            ? "Le score évolue à chaque but. Les CSC bénéficient à l’adversaire."
            : "Les actions sont regroupées en passages de jeu. Ouvrez une séquence pour voir les détails."}
        </p>
      </div>
      <div className="md-filter-row md-action-filters">
        <label>
          Équipe
          <select
            value={team}
            onChange={(e) => {
              setTeam(e.target.value);
              setLimit(40);
            }}
          >
            <option value="">Les deux équipes</option>
            {sides.map((s) => (
              <option key={s} value={s}>
                {teamName(match, s)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Joueur impliqué
          <select
            value={player}
            onChange={(e) => {
              setPlayer(e.target.value);
              setLimit(40);
            }}
          >
            <option value="">Tous les joueurs</option>
            {sides.map((side) => (
              <optgroup key={side} label={teamName(match, side)}>
                {sortedTeamPlayers(match, players, side).map(({ player }) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label>
          Type d’action
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setView(
                e.target.value === "GOAL" ||
                  (!e.target.value && view === "goals")
                  ? "goals"
                  : "all",
              );
              setGoalDetail("all");
              setLimit(40);
            }}
          >
            <option value="">
              {view === "goals" ? "Tous les buts" : "Tous les types"}
            </option>
            {families.map((f) => (
              <option key={f} value={f}>
                {familyLabels[f] ??
                  actionDefinitions[f]?.label ??
                  legacyLabels[f] ??
                  "Autres actions"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Précision
          <select
            value={goalDetail}
            onChange={(e) => {
              setGoalDetail(e.target.value);
              if (e.target.value !== "all") {
                setView("goals");
                setType("");
              }
              setLimit(40);
            }}
          >
            <option value="all">Toutes les précisions</option>
            <option value="unassisted">Buts sans passe décisive</option>
            <option value="own">CSC uniquement</option>
          </select>
        </label>
      </div>
      <div className="md-filter-result">
        <span>
          {count}{" "}
          {view === "goals"
            ? count === 1
              ? "but"
              : "buts"
            : count === 1
              ? "action"
              : "actions"}
          {view === "all" ? ` · ${filteredSequences.length} séquences` : ""}
        </span>
        {(team || player || type || goalDetail !== "all") && (
          <button className="textbutton" onClick={reset}>
            Effacer les filtres
          </button>
        )}
      </div>
      {!progression.complete && view === "goals" && (
        <p className="md-partial md-caption">
          {progression.timed
            ? "Score intermédiaire des buts annotés ; le score officiel reste celui affiché en haut."
            : "Temps manquants : les scores intermédiaires ne peuvent pas être reconstitués."}
        </p>
      )}
      {count === 0 ? (
        <Empty>Aucune action pour ces filtres.</Empty>
      ) : view === "goals" ? (
        <div className="md-goal-list">
          {filteredGoals.map((goal) => (
            <ActionRow
              key={goal.event.id}
              event={goal.event}
              players={players}
              match={match}
              goal={goal}
              focused={goal.event.id === focusedGoal}
              onReplay={onReplay}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="md-sequences">
            {filteredSequences.slice(0, limit).map((s) => (
              <Sequence
                key={s.sequence.id}
                {...s}
                players={players}
                match={match}
                goalMap={goalMap}
                onReplay={onReplay}
              />
            ))}
          </div>
          {limit < filteredSequences.length && (
            <button
              className="button wide"
              onClick={() => setLimit((n) => n + 40)}
            >
              Afficher les séquences suivantes (
              {filteredSequences.length - limit} restantes)
            </button>
          )}
        </>
      )}
    </section>
  );
}
