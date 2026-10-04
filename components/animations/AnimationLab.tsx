"use client";
import { useEffect, useState } from "react";
import { AnimationPreview, useAnimations } from "./AnimationProvider";
import { BootScreen } from "./BootScreen";
import { CardCarousel } from "./CardCarousel";
import { GameMenu } from "./GameMenu";
import { BadgeViewer, type ViewerBadge } from "./BadgeViewer";
import { BadgeUnlock } from "./BadgeUnlock";
import { HoverButton } from "./HoverButton";
import { HoverLink } from "./HoverLink";
import { HoverTile } from "./HoverTile";
import { HudLabel } from "./HudLabel";
import type { BootTasks } from "@/lib/animation-state";
const sections = [
  "Chargement",
  "Cartes joueurs",
  "Menu & navigation",
  "Badges",
  "Interactions",
] as const;
const players = [
  { id: "demo-1", name: "Alex", position: "PIVOT", number: "09" },
  { id: "demo-2", name: "Sam", position: "MILIEU", number: "06" },
  { id: "demo-3", name: "Lou", position: "DÉFENSE", number: "04" },
];
const badges: ViewerBadge[] = [
  {
    id: "demo-badge-1",
    name: "LE COLLECTIF",
    description:
      "Une distinction fictive pour explorer les animations. Aucun résultat de match n’est modifié.",
    icon: "users",
    kind: "badge",
    status: "BADGE DE DÉMONSTRATION · ACTIF",
    active: true,
    checks: [],
  },
  {
    id: "demo-badge-2",
    name: "EN PROGRESSION",
    description:
      "Une distinction fictive verrouillée. La barre compte les critères connus ; elle ne représente pas une probabilité.",
    icon: "target",
    kind: "badge",
    status: "BADGE DE DÉMONSTRATION · VERROUILLÉ",
    active: false,
    checks: [
      {
        key: "demo-1",
        label: "Première condition fictive",
        passed: true,
        actual: 1,
        target: 1,
      },
      {
        key: "demo-2",
        label: "Deuxième condition fictive",
        passed: false,
        actual: 0,
        target: 1,
      },
    ],
  },
];
function DemoBoot({
  fail,
  onClose,
}: {
  fail: boolean;
  onClose: (failed: boolean) => void;
}) {
  const [tasks, setTasks] = useState<BootTasks>({
      fonts: false,
      image: false,
      data: false,
    }),
    [error, setError] = useState("");
  useEffect(() => {
    const timers = [
      setTimeout(() => setTasks((t) => ({ ...t, fonts: true })), 500),
      setTimeout(() => setTasks((t) => ({ ...t, image: true })), 900),
      setTimeout(
        () =>
          fail
            ? setError("Erreur fictive : le chargement a été interrompu.")
            : setTasks((t) => ({ ...t, data: true })),
        1600,
      ),
    ];
    return () => timers.forEach(clearTimeout);
  }, [fail]);
  return (
    <BootScreen
      demo
      tasks={tasks}
      seasonName="SAISON DÉMO"
      playerCount={3}
      matchCount={1}
      error={error}
      onClose={() => onClose(!!error)}
    />
  );
}
/** Local fixtures only: no league request, account identity or persisted match data. */
export function AnimationLab() {
  const [section, setSection] = useState(1),
    [revision, setRevision] = useState(0),
    [reduced, setReduced] = useState(false),
    [boot, setBoot] = useState(false),
    [fail, setFail] = useState(false),
    [failureShown, setFailureShown] = useState(false),
    [unlock, setUnlock] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [menuPreview, setMenuPreview] = useState(false);
  const { previewTransition, busy } = useAnimations();
  const [cls, setCls] = useState(0);
  useEffect(() => {
    if (!PerformanceObserver.supportedEntryTypes.includes("layout-shift"))
      return;
    let score = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        score += (entry as PerformanceEntry & { value: number }).value;
      }
      setCls(score);
    });
    let alive = true;
    let frame = 0;
    void document.fonts.ready.then(() => {
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (alive)
            observer.observe({ type: "layout-shift", buffered: false });
        });
      });
    });
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);
  function replay() {
    setRevision((r) => r + 1);
    if (section === 0) {
      setFailureShown(false);
      setBoot(true);
    }
    if (section === 2) setMenuPreview(true);
  }
  return (
    <main className="animation-lab">
      <div className="lab-top">
        <HoverLink href="/">← COPRO LEAGUE</HoverLink>
        <span className="eyebrow">LABORATOIRE / DONNÉES FICTIVES</span>
      </div>
      <p className="eyebrow">MOUVEMENT & INTERACTION</p>
      <h1>LE JEU PREND VIE.</h1>
      <p className="lab-intro">
        Les animations du site, réunies au même endroit. Explore avec les
        boutons, le clavier ou les gestes. Les données de cette page sont
        fictives.
      </p>
      <nav className="lab-tabs" aria-label="Démonstrations">
        {sections.map((name, i) => (
          <button
            key={name}
            className={"button " + (i === section ? "primary" : "")}
            aria-pressed={section === i}
            onClick={() => {
              setSection(i);
              setMenuPreview(false);
              setUnlock(false);
              setBoot(false);
            }}
          >
            {String(i + 1).padStart(2, "0")} / {name}
          </button>
        ))}
      </nav>
      <div className="lab-toolbar">
        <HoverButton magnetic={false} onClick={replay} disabled={busy}>
          Rejouer
        </HoverButton>
        <label>
          <input
            type="checkbox"
            checked={reduced}
            onChange={(e) => setReduced(e.target.checked)}
          />{" "}
          Simuler les mouvements réduits
        </label>
      </div>
      <AnimationPreview reduced={reduced}>
        <section className="lab-stage" aria-labelledby="lab-section-title">
          <div className="lab-stage-heading">
            <span className="eyebrow">
              {String(section + 1).padStart(2, "0")} / DÉMONSTRATION
            </span>
            <h2 id="lab-section-title">{sections[section]}</h2>
          </div>
          <div key={revision} className="lab-example">
            {section === 0 && (
              <>
                <p>
                  Progression par étapes : polices 30 %, image 10 %, données 60
                  %. Le chargement réel du site suit ses propres ressources.
                </p>
                <label className="lab-option">
                  <input
                    type="checkbox"
                    checked={fail}
                    onChange={(e) => setFail(e.target.checked)}
                  />{" "}
                  Simuler une erreur de chargement
                </label>
                <HoverButton
                  magnetic={false}
                  disabled={busy}
                  onClick={() => {
                    setFailureShown(false);
                    setBoot(true);
                  }}
                >
                  Lancer le chargement →
                </HoverButton>
                <p className="muted" role="status">
                  {failureShown
                    ? "Erreur fictive affichée : l’intro a été retirée et cette page reste utilisable."
                    : "PASSER ou Échap ferme l’intro. Aucun état de session réel n’est effacé."}
                </p>
              </>
            )}
            {section === 1 && (
              <CardCarousel
                items={players}
                selectedIds={selected}
                getLabel={(p) => p.name}
                onSelect={(p) =>
                  setSelected((ids) => [...new Set([...ids, p.id])])
                }
                onReturn={(p) =>
                  setSelected((ids) => ids.filter((id) => id !== p.id))
                }
                renderItem={(p) => (
                  <div className="carousel-player">
                    <span className="eyebrow">COPRO / DÉMO</span>
                    <span className="lab-player-number">{p.number}</span>
                    <h2>{p.name}</h2>
                    <span className="tag">{p.position}</span>
                  </div>
                )}
              />
            )}
            {section === 2 && (
              <>
                <GameMenu
                  key={revision + String(menuPreview)}
                  initialOpen={menuPreview}
                  seasonName="SAISON DÉMO"
                  user={null}
                  admin={false}
                />
                <p className="muted">
                  MENU ou M ouvre les six destinations réelles du site. Flèches
                  pour parcourir, Entrée pour choisir, Échap pour fermer.
                </p>
                <HoverButton
                  magnetic={false}
                  disabled={busy}
                  onClick={() => void previewTransition(reduced)}
                >
                  Rejouer le rideau sans quitter la démo
                </HoverButton>
              </>
            )}
            {section === 3 && (
              <>
                <BadgeViewer items={badges} />
                <HoverButton
                  magnetic={false}
                  disabled={busy}
                  onClick={() => setUnlock(true)}
                >
                  Simuler un déblocage →
                </HoverButton>
              </>
            )}
            {section === 4 && (
              <div className="lab-hover-grid">
                <HoverTile image className="panel lab-hover-card">
                  <span className="eyebrow">
                    <HudLabel text="SAISON / DÉMONSTRATION" />
                  </span>
                  <img
                    src="/brand/logo.svg"
                    width="100"
                    height="74"
                    alt="Copro League"
                  />
                  <h3>ENTRE DANS LE JEU.</h3>
                  <p className="muted">
                    Viseur, reflet et inclinaison sur un pointeur précis.
                  </p>
                  <HoverLink href="/joueurs">Explorer les joueurs →</HoverLink>
                </HoverTile>
                <div className="lab-hover-controls">
                  <HoverButton
                    onClick={() =>
                      setSelected((ids) =>
                        ids.includes("hover") ? [] : ["hover"],
                      )
                    }
                  >
                    Bouton principal →
                  </HoverButton>
                  <HoverButton variant="secondary">
                    Bouton secondaire →
                  </HoverButton>
                  <HoverButton disabled>Bouton indisponible</HoverButton>
                  <p className="eyebrow" role="status">
                    {selected.includes("hover")
                      ? "ACTION ACTIVÉE"
                      : "SURVOLE OU UTILISE TAB"}
                  </p>
                  <label>
                    Champ avec curseur natif
                    <input placeholder="Écrire ici" />
                  </label>
                  <p className="muted">
                    Les contrôles de la timeline conservent une position fixe.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
        {boot && (
          <DemoBoot
            fail={fail}
            onClose={(failed) => {
              setBoot(false);
              setFailureShown(failed);
            }}
          />
        )}
        {unlock && (
          <BadgeUnlock badge={badges[0]} onClose={() => setUnlock(false)} />
        )}
      </AnimationPreview>
      <p className="lab-cls eyebrow">
        DÉCALAGES APRÈS CHARGEMENT DES POLICES : {cls.toFixed(4)}
      </p>
    </main>
  );
}
