"use client";
import { CardCarousel } from "./animations/CardCarousel";
import { useState, useMemo, useRef, useEffect } from "react";
import type { League, Match } from "@/lib/model";
import { teamName } from "@/lib/model";
import { power } from "@/lib/engine";
import { draftHistory, draftElos, randomPackDraft, shuffledIds, computeDraft, canApplyDraft, packEstimate, type DraftRequest, type DraftResult } from "@/lib/draft";
import { Picker, Avatar, Empty, fmt } from "./league-ui";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, Unlock, Shuffle, Check, ArrowLeftRight } from "lucide-react";
export function Draft(props: {
  data: League;
  refresh: () => Promise<League>;
  match?: Match;
  onApply?: (m: Match) => void;
}) {
  return <DraftSession key={props.match?.id ?? "standalone"} {...props} />;
}
function DraftSession({
  data,
  refresh,
  match: external,
  onApply,
}: {
  data: League;
  refresh: () => Promise<League>;
  match?: Match;
  onApply?: (m: Match) => void;
}) {
  const [matchId, setMatchId] = useState(
    external?.id ??
      data.matches.find((m) => m.status === "scheduled")?.id ??
      "",
  );
  const base = external ?? data.matches.find((m) => m.id === matchId);
  const [roster, setRoster] = useState<string[] | null>(null);
  const m: Match = base
    ? {
        ...base,
        participants: roster
          ? roster.map(
              (id) =>
                base.participants.find((p) => p.playerId === id) ?? {
                  playerId: id,
                  team: null,
                  stats: {},
                },
            )
          : base.participants,
      }
    : {
        id: "draft-preview",
        seasonId: "",
        number: 1,
        date: "",
        duration: 60,
        location: "",
        status: "scheduled",
        scoreA: null,
        scoreB: null,
        mvpId: null,
        level: 1,
        video: "",
        events: [],
        trackedKeys: [],
        version: 0,
        participants: (roster ?? []).map((id) => ({
          playerId: id,
          team: null,
          stats: {},
        })),
      };
  const [mode, setMode] = useState("balanced"),
    [teams, setTeams] = useState<Record<string, "A" | "B">>({}),
    [locks, setLocks] = useState<Record<string, "A" | "B">>({}),
    [reveal, setReveal] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [capA, setCapA] = useState(""),
    [capB, setCapB] = useState(""),
    [turn, setTurn] = useState(0),
    [drawing, setDrawing] = useState(false),
    [revealOrder, setRevealOrder] = useState<string[]>([]),
    [swapPlayer, setSwapPlayer] = useState<string | null>(null),
    [automatic, setAutomatic] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; workerRef.current?.terminate(); }, []);
  const players = data.players.filter(
    (p) =>
      !p.archived &&
      !p.demo &&
      m?.participants.some((x) => x.playerId === p.id),
  );
  const history = useMemo(() => draftHistory(data.matches, external ?? data.matches.find(match => match.id === matchId)), [data.matches, external, matchId]);
  const elos = useMemo(() => draftElos(data.players, history), [data.players, history]);
  const visibleIds = new Set(revealOrder.slice(0, reveal));
  const fullyRevealed = mode !== "pack" || reveal === players.length;
  const validTeams = canApplyDraft(players, teams, mode);
  const estimate = mode === "pack" && fullyRevealed && Object.keys(teams).length
    ? packEstimate(players.filter(p => teams[p.id] === "A"), players.filter(p => teams[p.id] === "B"), data.players, history)
    : null;
  const ready =
    players.length > 1 && Object.keys(teams).length === players.length;
  const score = (side: "A" | "B") => {
    const ps = players.filter((p) => teams[p.id] === side);
    return ps.length
      ? ps.reduce((s, p) => s + power(p, elos[p.id]), 0) / ps.length
      : 0;
  };
  const gap =
    score("A") + score("B")
      ? (Math.abs(score("A") - score("B")) / ((score("A") + score("B")) / 2)) *
        100
      : 0;
  function resetDraw() {
    generation.current++;
    workerRef.current?.terminate();
    workerRef.current = null;
    setDrawing(false);
    setAutomatic(false);
    setRevealOrder([]);
    setSwapPlayer(null);
    setTeams({});
    setLocks({});
    setReveal(0);
    setCapA("");
    setCapB("");
    setTurn(0);
    setError("");
  }
  function finishDraw() {
    resetDraw();
    setRoster([]);
  }
  function chooseParticipant(id: string, checked: boolean) {
    if (busy || drawing) return;
    if (players.some((p) => p.id === id) === checked) return;
    setRoster(
      checked
        ? [...new Set([...players.map((p) => p.id), id])]
        : players.filter((p) => p.id !== id).map((p) => p.id),
    );
    resetDraw();
    setNotice("");
  }
  async function generate() {
    if (busy || drawing) return;
    setError("");
    setNotice("");
    const run = ++generation.current;
    try {
      if (mode === "pack" && players.length !== 10)
        throw Error("Choisis exactement 10 joueurs pour un pack à 5 contre 5.");
      if (players.length < 2 || players.length > 20 || players.length % 2)
        throw Error("Choisis un nombre pair de joueurs, entre 2 et 20.");
      if (mode === "captains") {
        if (!capA || !capB || capA === capB || !players.some(p => p.id === capA) || !players.some(p => p.id === capB))
          throw Error("Choisis deux capitaines différents.");
        setTeams({ [capA]: "A", [capB]: "B" });
        setTurn(0);
        return;
      }
      let d: Pick<DraftResult, "A" | "B">;
      if (mode === "pack") {
        d = randomPackDraft(players);
        setRevealOrder(shuffledIds(players));
      } else {
        setDrawing(true);
        const request: DraftRequest = { players, population: data.players.filter(p => !p.demo), matches: history, locks };
        if (typeof Worker === "undefined") d = await computeDraft(request);
        else d = await new Promise<DraftResult>((resolve, reject) => {
          let worker: Worker;
          try { worker = new Worker(new URL("../lib/draft.worker.ts", import.meta.url), { type: "module" }); }
          catch { void computeDraft(request).then(resolve, reject); return; }
          workerRef.current = worker;
          worker.onmessage = (event: MessageEvent<{ result?: DraftResult; error?: string }>) => {
            worker.terminate();
            workerRef.current = null;
            if (event.data.result) resolve(event.data.result);
            else reject(Error(event.data.error ?? "Le tirage a échoué. Réessaie."));
          };
          worker.onerror = () => {
            worker.terminate();
            workerRef.current = null;
            void computeDraft(request).then(resolve, reject);
          };
          worker.postMessage(request);
        });
      }
      if (run !== generation.current) return;
      setSwapPlayer(null);
      setTeams({
        ...Object.fromEntries(d.A.map(id => [id, "A" as const])),
        ...Object.fromEntries(d.B.map(id => [id, "B" as const])),
      });
      setAutomatic(mode === "balanced");
      setReveal(mode === "pack" ? 0 : players.length);
    } catch (e) {
      if (run === generation.current) setError(e instanceof Error ? e.message : "Le tirage a échoué. Réessaie.");
    } finally {
      if (run === generation.current) setDrawing(false);
    }
  }
  async function apply() {
    if (!base || busy || drawing) return;
    if (!validTeams || !fullyRevealed) {
      setError(mode === "pack" ? "Le pack doit être complet, avec 5 joueurs dans chaque équipe." : "Le tirage doit être complet, avec le même nombre de joueurs dans chaque équipe.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = {
        ...m,
        participants: m.participants.map((p) => ({
          ...p,
          team: teams[p.playerId] ?? null,
        })),
      };
      if (onApply) {
        onApply(next);
        finishDraw();
        setNotice(
          "Équipes ajoutées au brouillon du match. Le draft est prêt pour un nouveau tirage.",
        );
      } else {
        const r = await fetch("/api/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        const d = (await r.json()) as { error?: string; url: string };
        if (!r.ok) throw Error(d.error ?? "Enregistrement impossible");
        finishDraw();
        setNotice(
          "Équipes enregistrées sur la feuille de match. Tu peux lancer un nouveau draft.",
        );
        try {
          await refresh();
        } catch {
          setError(
            "Équipes enregistrées, mais l’actualisation a échoué. Recharge la page avant de valider un autre tirage.",
          );
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset className="draftroom draft-controls" disabled={busy || drawing}>
      {!base && (
        <p className="muted">
          Tu es en tirage libre. Pour enregistrer ces équipes, crée un match dans l’admin.
        </p>
      )}
      {!external && (
        <div className="filterrow">
          <Picker
            label="Match à préparer"
            value={matchId}
            onChange={(v) => {
              setMatchId(v);
              setRoster(null);
              resetDraw();
              setNotice("");
            }}
            options={data.matches
              .filter((m) => m.status === "scheduled")
              .map((m) => ({
                value: m.id,
                label: `Match #${m.number} · ${data.seasons.find((s) => s.id === m.seasonId)?.name}`,
              }))}
          />
        </div>
      )}
      {!m ? (
        <Empty>
          Crée un match et choisis les participants pour lancer le draft.
        </Empty>
      ) : (
        <>
          <section className="panel draftselection">
            <h2>Qui joue ?</h2>
            <p className="muted">
              {mode === "pack" ? "Choisis exactement 10 participants pour jouer à 5 contre 5." : "Choisis un nombre pair de participants parmi les joueurs actifs."}
            </p>
            <CardCarousel
              items={data.players.filter((p) => !p.archived && !p.demo)}
              selectedIds={players.map((p) => p.id)}
              getLabel={(p) => p.name}
              onSelect={(p) => chooseParticipant(p.id, true)}
              onReturn={(p) => chooseParticipant(p.id, false)}
              renderItem={(p) => (
                <div className="carousel-player">
                  <span className="eyebrow">DRAFT / PARTICIPANT</span>
                  <Avatar player={p} large />
                  <h2>{p.name}</h2>
                  <span className="tag">
                    {players.some((x) => x.id === p.id)
                      ? "SÉLECTIONNÉ"
                      : "DISPONIBLE"}
                  </span>
                </div>
              )}
            />
            <div className="participantsgrid">
              {data.players
                .filter((p) => !p.archived && !p.demo)
                .map((p) => (
                  <label className="participantchoice" key={p.id}>
                    <Checkbox
                      checked={players.some((x) => x.id === p.id)}
                      onCheckedChange={(checked) => {
                        chooseParticipant(p.id, !!checked);
                      }}
                    />
                    <Avatar player={p} />
                    {p.name}
                  </label>
                ))}
            </div>
          </section>
          <Tabs
            value={mode}
            onValueChange={(v) => {
              if (busy || drawing) return;
              setMode(v);
              resetDraw();
              setNotice("");
            }}
          >
            <TabsList>
              <TabsTrigger value="balanced">Équilibré</TabsTrigger>
              <TabsTrigger value="captains">Capitaines</TabsTrigger>
              <TabsTrigger value="pack">Pack draft</TabsTrigger>
            </TabsList>
          </Tabs>
          <section className="panel">
            <div className="split">
              <div>
                <h2>
                  {mode === "balanced"
                    ? "Deux équipes équilibrées"
                    : mode === "captains"
                      ? "Les capitaines choisissent"
                      : "Le draft se dévoile"}
                </h2>
                <p className="muted">
                  {players.length} participants ·{" "}
                  {mode === "balanced"
                    ? "Les équipes sont équilibrées selon les notes de draft et l’ELO."
                    : mode === "captains"
                      ? "Après les capitaines, les choix alternent dans cet ordre : A, B, B, A…"
                      : "Les cartes se révèlent une à une. Le hasard compose deux équipes de 5 joueurs."}
                </p>
              </div>
              <button className="button primary" onClick={generate}>
                <Shuffle size={16} />
                {drawing ? "Tirage en cours…" : Object.keys(teams).length ? "Relancer" : "Lancer le draft"}
              </button>
            </div>
            {mode === "captains" && (
              <div className="formgrid filterrow">
                <Picker
                  label={"Capitaine " + teamName(m, "A")}
                  value={capA}
                  onChange={setCapA}
                  options={players.map((p) => ({ value: p.id, label: p.name }))}
                />
                <Picker
                  label={"Capitaine " + teamName(m, "B")}
                  value={capB}
                  onChange={setCapB}
                  options={players.map((p) => ({ value: p.id, label: p.name }))}
                />
              </div>
            )}
            {mode === "pack" &&
              Object.keys(teams).length > 0 &&
              reveal < players.length && (
                <div className="packreveal">
                  <CardCarousel
                    key={reveal}
                    items={[{ id: "hidden-" + reveal }]}
                    getLabel={() => "la carte suivante"}
                    selectLabel="Révéler"
                    onSelect={() =>
                      setReveal((r) => Math.min(r + 1, players.length))
                    }
                    renderItem={() => (
                      <div className="carousel-player">
                        <img
                          src="/brand/logo.svg"
                          width="100"
                          height="74"
                          alt=""
                        />
                        <h2>PACK DRAFT</h2>
                        <span className="eyebrow">
                          CARTE {reveal + 1} / {players.length}
                        </span>
                      </div>
                    )}
                  />
                </div>
              )}
            {mode === "captains" && Object.keys(teams).length > 0 && !ready && (
              <div className="captainpool">
                <CardCarousel
                  items={players.filter((p) => !teams[p.id])}
                  getLabel={(p) => p.name}
                  selectLabel="Choisir"
                  onSelect={(p) => {
                    const side =
                      Math.floor((turn + 1) / 2) % 2 === 0 ? "A" : "B";
                    setTeams({ ...teams, [p.id]: side });
                    setTurn((t) => t + 1);
                  }}
                  renderItem={(p) => (
                    <div className="carousel-player">
                      <span className="eyebrow">
                        AU TOUR DE{" "}
                        {teamName(
                          m,
                          Math.floor((turn + 1) / 2) % 2 === 0 ? "A" : "B",
                        )}
                      </span>
                      <Avatar player={p} large />
                      <h2>{p.name}</h2>
                    </div>
                  )}
                />
                <h3>
                  Au tour de{" "}
                  {teamName(
                    m,
                    Math.floor((turn + 1) / 2) % 2 === 0 ? "A" : "B",
                  )}
                </h3>
                {players
                  .filter((p) => !teams[p.id])
                  .map((p) => (
                    <button
                      className="button"
                      key={p.id}
                      onClick={() => {
                        const side =
                          Math.floor((turn + 1) / 2) % 2 === 0 ? "A" : "B";
                        setTeams({ ...teams, [p.id]: side });
                        setTurn((t) => t + 1);
                      }}
                    >
                      <Avatar player={p} />
                      {p.name}
                    </button>
                  ))}
              </div>
            )}
            <div className="draftteams">
              {(["A", "B"] as const).map((side) => (
                <section key={side}>
                  <div className="split">
                    <h3>{teamName(m, side)}</h3>
                    <span className="accent">
                      {Object.keys(teams).length && fullyRevealed ? fmt(score(side)) : "—"}{" "}
                      <small>PUISSANCE</small>
                    </span>
                  </div>
                  {estimate?.available && (
                    <p className="muted">Victoire <strong>{fmt(estimate[side].win)} %</strong> · Nul {fmt(estimate[side].draw)} % · Défaite <strong>{fmt(estimate[side].lose)} %</strong></p>
                  )}
                  {players
                    .filter(
                      (p) =>
                        teams[p.id] === side && (mode !== "pack" || visibleIds.has(p.id)),
                    )
                    .map((p) => (
                      <div className="draftplayer" key={p.id}>
                        <Avatar player={p} />
                        <strong>{p.name}</strong>
                        {mode === "balanced" && (
                          <button
                            className="iconbutton"
                            aria-label={
                              (locks[p.id]
                                ? "Déverrouiller "
                                : "Verrouiller ") + p.name
                            }
                            onClick={() =>
                              setLocks((l) => {
                                const next = { ...l };
                                if (next[p.id]) delete next[p.id];
                                else next[p.id] = side;
                                return next;
                              })
                            }
                          >
                            {locks[p.id] ? (
                              <Lock size={15} />
                            ) : (
                              <Unlock size={15} />
                            )}
                          </button>
                        )}
                        {mode !== "pack" && (
                          <button
                            className="iconbutton"
                            aria-label={"Déplacer " + p.name}
                            onClick={() => {
                              setAutomatic(false);
                              setTeams({
                                ...teams,
                                [p.id]: side === "A" ? "B" : "A",
                              });
                              setLocks((l) => {
                                const n = { ...l };
                                delete n[p.id];
                                return n;
                              });
                            }}
                          >
                            <ArrowLeftRight size={16} />
                          </button>
                        )}
                        {mode === "pack" && fullyRevealed && (
                          <button
                            className="iconbutton"
                            aria-label={(swapPlayer && teams[swapPlayer] !== side ? "Échanger avec " : "Échanger ") + p.name}
                            aria-pressed={swapPlayer === p.id}
                            onClick={() => {
                              if (swapPlayer === p.id) setSwapPlayer(null);
                              else if (swapPlayer && teams[swapPlayer] !== side) {
                                setTeams(current => ({ ...current, [p.id]: current[swapPlayer], [swapPlayer]: current[p.id] }));
                                setSwapPlayer(null);
                              } else setSwapPlayer(p.id);
                            }}
                          >
                            <ArrowLeftRight size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                </section>
              ))}
            </div>
            {mode === "pack" && ready && fullyRevealed && (
              <p className="muted" role="status">
                {swapPlayer
                  ? `${players.find(p => p.id === swapPlayer)?.name} sélectionné·e : choisis un joueur de l’autre équipe pour les échanger.`
                  : "Pour ajuster les équipes, sélectionne un joueur puis un joueur adverse avec le bouton d’échange. Chaque équipe garde 5 joueurs."}
                {swapPlayer && <button className="button" onClick={() => setSwapPlayer(null)}>Annuler l’échange</button>}
              </p>
            )}
            {estimate && <p className="muted" role="status">{estimate.available ? "Estimation indicative selon l’ELO et les nuls observés. Aucun résultat n’est garanti." : estimate.reason}</p>}
            {ready && (mode !== "pack" || reveal === players.length) && (
              <div className="split draftresult">
                <p>
                  Écart de puissance{" "}
                  <strong className="accent">{fmt(gap)} %</strong>
                  {gap > 5 && mode === "balanced" && automatic && (
                    <span className="muted">
                      {" "}
                      · L’équilibre reste limité avec ces joueurs et ces verrouillages.
                    </span>
                  )}
                </p>
                {base && (data.admin || onApply) && (
                  <button
                    className="button primary"
                    disabled={
                      busy || drawing || !validTeams
                    }
                    onClick={apply}
                  >
                    <Check size={16} />
                    Valider les équipes
                  </button>
                )}
                {!(base && (data.admin || onApply)) && (
                  <button
                    className="button primary"
                    disabled={!validTeams || drawing}
                    onClick={() => {
                      finishDraw();
                      setNotice("Draft terminée. Prêt pour un nouveau tirage.");
                    }}
                  >
                    <Check size={16} />
                    Terminer la draft
                  </button>
                )}
              </div>
            )}
            {!Object.keys(teams).length && (
              <div className="avatarstack filterrow">
                {players.map((p) => (
                  <Avatar key={p.id} player={p} />
                ))}
                <span className="muted">Choisis les joueurs, puis lance le draft.</span>
              </div>
            )}
          </section>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="success">
              {notice}
            </p>
          )}
        </>
      )}
    </fieldset>
  );
}
