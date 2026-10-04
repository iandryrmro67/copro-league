"use client";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import * as m from "motion/react-m";
import { usePathname, useRouter } from "next/navigation";
import { HoverLink } from "./HoverLink";
import { ArrowRight, Menu, X, ShieldCheck } from "lucide-react";
import { eases } from "@/lib/motion";
import { shouldAnimateNavigation } from "@/lib/animated-navigation";
import { HoverButton } from "./HoverButton";
import { HudLabel } from "./HudLabel";
import { useAnimations } from "./AnimationProvider";
const entries = [
  ["MATCHS", "/matchs"],
  ["DRAFT", "/draft"],
  ["JOUEURS", "/joueurs"],
  ["STATS", "/stats"],
  ["AWARDS", "/awards"],
  ["REPLAYS", "/replays"],
] as const;
/** HUD and native modal navigation. Account links keep full-page authentication semantics. */
export function GameMenu({
  seasonName,
  user,
  admin,
  initialOpen = false,
}: {
  seasonName: string;
  user: string | null;
  admin: boolean;
  initialOpen?: boolean;
}) {
  const router = useRouter(),
    path = usePathname(),
    { reduced, sound, setSound, navigate, setLayer, play } = useAnimations();
  const [open, setOpen] = useState(initialOpen),
    [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    tiles = useRef<(HTMLAnchorElement | null)[]>([]),
    selectionLock = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current,
      button = trigger.current;
    element?.showModal();
    setLayer("menu", true);
    (
      tiles.current.find(
        (tile) => tile?.getAttribute("aria-current") === "page",
      ) ?? tiles.current[0]
    )?.focus();
    return () => {
      element?.close();
      setLayer("menu", false);
      button?.focus({ preventScroll: true });
    };
  }, [open, setLayer]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() !== "m" ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.repeat
      )
        return;
      const target = e.target as Element;
      if (
        target.closest(
          'input,textarea,select,[contenteditable="true"],.precise-workspace',
        ) ||
        (document.querySelector("dialog[open]") && !open)
      )
        return;
      e.preventDefault();
      setOpen((v) => !v);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function choose(e: MouseEvent<HTMLAnchorElement>, i: number) {
    if (
      !shouldAnimateNavigation(
        e,
        e.currentTarget.href,
        location.origin,
        e.currentTarget.target,
      )
    )
      return;
    e.preventDefault();
    if (selectionLock.current) return;
    selectionLock.current = true;
    setSelected(i);
    play("select");
    timer.current = setTimeout(
      () => {
        setOpen(false);
        void navigate(entries[i][1]).finally(() => {
          selectionLock.current = false;
          setSelected(null);
        });
      },
      reduced ? 150 : 250,
    );
  }
  return (
    <>
      <header className="game-hud">
        <HoverLink className="brand" href="/">
          <img src="/brand/logo.svg" width="40" height="36" alt="" />
          COPRO<span>LEAGUE</span>
        </HoverLink>
        <span className="hud-season">
          <HudLabel text={seasonName} />
        </span>
        <div className="hud-controls">
          <button
            className="button"
            type="button"
            aria-pressed={sound}
            aria-label={sound ? "Désactiver les sons" : "Activer les sons"}
            onClick={() => setSound(!sound)}
          >
            SON {sound ? "ON" : "OFF"}
          </button>
          {user ? (
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="hud-account"
                title="Se déconnecter"
              >
                <ShieldCheck size={14} aria-hidden="true" />
                <span>{admin ? "ADMIN" : "COMPTE"}</span>
              </button>
            </form>
          ) : (
            <HoverLink
              className="button"
              href="/connexion?return_to=/admin"
              target="_top"
            >
              Connexion
            </HoverLink>
          )}
          <HoverButton
            ref={trigger}
            className="button primary"
            type="button"
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => {
              setOpen(true);
              play("open");
            }}
          >
            <Menu size={16} aria-hidden="true" /> MENU
          </HoverButton>
        </div>
      </header>
      {open && (
        <dialog
          ref={dialog}
          className="game-menu"
          aria-labelledby="game-menu-title"
          onCancel={(e) => {
            e.preventDefault();
            setOpen(false);
          }}
          onKeyDown={(e) => {
            const index = tiles.current.indexOf(
              document.activeElement as HTMLAnchorElement,
            );
            if (index < 0) return;
            const columns = window.matchMedia("(max-width:700px)").matches
              ? 2
              : 3;
            const move: { [key: string]: number } = {
              ArrowRight: 1,
              ArrowLeft: -1,
              ArrowDown: columns,
              ArrowUp: -columns,
            };
            if (e.key in move) {
              e.preventDefault();
              tiles.current[
                (index + move[e.key] + entries.length) % entries.length
              ]?.focus();
            }
          }}
        >
          <div className="menu-heading">
            <div>
              <p className="eyebrow">COPRO LEAGUE / {seasonName}</p>
              <h2 id="game-menu-title">CHOISIS TON TERRAIN.</h2>
            </div>
            <button
              className="button"
              type="button"
              aria-label="Fermer le menu"
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <nav aria-label="Navigation principale" className="game-menu-grid">
            {entries.map(([title, href], i) => (
              <m.a
                ref={(element) => {
                  tiles.current[i] = element;
                }}
                key={href}
                href={href}
                className={
                  "game-menu-tile " + (selected === i ? "is-selected" : "")
                }
                aria-current={path.startsWith(href) ? "page" : undefined}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduced ? 0.15 : 0.35,
                  delay: reduced ? 0 : i * 0.06,
                  ease: eases.enter,
                }}
                onFocus={() => router.prefetch(href)}
                onPointerEnter={() => router.prefetch(href)}
                onClick={(e) => choose(e, i)}
              >
                <m.i
                  className="menu-fill"
                  aria-hidden="true"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: selected === i ? 1 : 0 }}
                  transition={{
                    duration: reduced ? 0.15 : 0.25,
                    ease: eases.enter,
                  }}
                />
                <span className="menu-index">
                  {String(i + 1).padStart(2, "0")} / ÉCRAN
                </span>
                <strong>
                  {title}
                  <ArrowRight size={24} aria-hidden="true" />
                </strong>
              </m.a>
            ))}
          </nav>
          <div className="menu-secondary">
            <HoverLink
              onClick={(e) => {
                if (
                  shouldAnimateNavigation(
                    e,
                    e.currentTarget.href,
                    location.origin,
                    e.currentTarget.target,
                  )
                )
                  setOpen(false);
              }}
              href="/"
            >
              Accueil ↗
            </HoverLink>
            <HoverLink
              onClick={(e) => {
                if (
                  shouldAnimateNavigation(
                    e,
                    e.currentTarget.href,
                    location.origin,
                    e.currentTarget.target,
                  )
                )
                  setOpen(false);
              }}
              href="/saisons"
            >
              Saisons ↗
            </HoverLink>
            <HoverLink
              onClick={(e) => {
                if (
                  shouldAnimateNavigation(
                    e,
                    e.currentTarget.href,
                    location.origin,
                    e.currentTarget.target,
                  )
                )
                  setOpen(false);
              }}
              href="/glossaire"
            >
              Comprendre les stats ↗
            </HoverLink>
            {admin && (
              <HoverLink
                onClick={(e) => {
                  if (
                    shouldAnimateNavigation(
                      e,
                      e.currentTarget.href,
                      location.origin,
                      e.currentTarget.target,
                    )
                  )
                    setOpen(false);
                }}
                href="/admin"
              >
                Administration ↗
              </HoverLink>
            )}
          </div>
          <p className="menu-hint">
            FLÈCHES : NAVIGUER · ENTRÉE : CHOISIR · ÉCHAP : FERMER
          </p>
        </dialog>
      )}
    </>
  );
}
