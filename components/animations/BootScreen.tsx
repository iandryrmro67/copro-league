"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { animate, useMotionValue, useMotionValueEvent } from "motion/react";
import * as m from "motion/react-m";
import { bootProgress, type BootTasks } from "@/lib/animation-state";
import { eases } from "@/lib/motion";
import { useAnimations } from "./AnimationProvider";
/** tasks represent completed real loading groups. demo never modifies the session flag. */
export function BootScreen({
  tasks,
  seasonName,
  playerCount,
  matchCount,
  error = "",
  onClose,
  demo = false,
}: {
  tasks: BootTasks;
  seasonName: string;
  playerCount?: number;
  matchCount?: number;
  error?: string;
  onClose: () => void;
  demo?: boolean;
}) {
  const { reduced, setLayer } = useAnimations(),
    dialog = useRef<HTMLDialogElement>(null),
    [age, setAge] = useState(0);
  const [count, setCount] = useState(0),
    progress = useMotionValue(0);
  const complete = bootProgress(tasks),
    opening = complete === 100 && age >= 1200 && !error,
    close = useEffectEvent(onClose);
  useMotionValueEvent(progress, "change", (v) => setCount(Math.round(v)));
  useEffect(() => {
    const animation = animate(progress, complete, {
      duration: reduced ? 0 : 0.22,
      ease: eases.enter,
    });
    return () => animation.stop();
  }, [complete, reduced, progress]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    setLayer("boot", true);
    const start = performance.now();
    const interval = setInterval(() => setAge(performance.now() - start), 100);
    const failSafe = setTimeout(() => close(), 8000);
    return () => {
      clearInterval(interval);
      clearTimeout(failSafe);
      element?.close();
      setLayer("boot", false);
      requestAnimationFrame(() => {
        if (previous?.isConnected) previous.focus({ preventScroll: true });
      });
    };
  }, [setLayer]);
  useEffect(() => {
    if (error) close();
  }, [error]);
  useEffect(() => {
    if (!opening) return;
    const timer = setTimeout(() => close(), reduced ? 150 : 500);
    return () => clearTimeout(timer);
  }, [opening, reduced]);
  const lines = [
    "> SYS_CHECK",
    "> CHARGEMENT " + seasonName.toUpperCase(),
    playerCount == null
      ? "> CONNEXION À LA LIGUE"
      : `> ${playerCount} JOUEURS · ${matchCount ?? 0} MATCHS`,
    complete === 100 ? "> PRÊT" : "> CHARGEMENT EN COURS",
  ];
  return (
    <dialog
      ref={dialog}
      className="boot-screen"
      aria-label={
        demo ? "Démonstration du chargement" : "Chargement de Copro League"
      }
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="boot-grain" aria-hidden="true" />
      <m.div
        className="boot-content"
        initial={{ opacity: 0 }}
        animate={{
          opacity: opening ? 0 : age >= 300 ? 1 : 0,
          scale: reduced ? 1 : opening ? 0.88 : 1,
        }}
        transition={{ duration: reduced ? 0.15 : 0.22 }}
      >
        <div className="boot-logo">
          <div className="boot-outline" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <m.i
                key={i}
                className={"ring-quarter q" + i}
                initial={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
                animate={{ opacity: age >= 300 + i * 150 ? 1 : 0, scale: 1 }}
                transition={{ duration: reduced ? 0.15 : 0.15 }}
              />
            ))}
          </div>
          <div className="boot-fill-mask">
            <m.div
              className="boot-fill"
              animate={{
                y: reduced ? 0 : `${100 - complete}%`,
                opacity: reduced ? complete / 100 : 1,
              }}
              transition={{ duration: 0.22, ease: eases.enter }}
            />
          </div>
          <img
            src="/brand/logo.svg"
            width="100"
            height="74"
            alt="Copro League"
          />
        </div>
        <p className="boot-percent" aria-live="off">
          {String(reduced ? complete : count).padStart(3, "0")}
          <span> %</span>
        </p>
        <div
          className="boot-progress"
          role="progressbar"
          aria-label="Étapes de chargement"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={complete}
        >
          <m.i
            animate={{ scaleX: complete / 100 }}
            transition={{ duration: 0.22, ease: eases.enter }}
          />
          <span style={{ left: `${complete}%` }} />
        </div>
        <div className="boot-terminal" aria-hidden="true">
          {lines.map((line, i) => (
            <m.p
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: age >= 300 + i * 250 ? 1 : 0 }}
              transition={{ duration: 0.15 }}
            >
              {reduced
                ? line
                : line.slice(
                    0,
                    Math.max(0, Math.floor((age - 300 - i * 250) / 15)),
                  ) || " "}
            </m.p>
          ))}
        </div>
      </m.div>
      {opening && !reduced && (
        <m.div
          className="boot-flash"
          initial={{ opacity: 0.16 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.08 }}
          aria-hidden="true"
        />
      )}
      {[0, 1].map((i) => (
        <m.div
          key={i}
          className={"boot-curtain " + (i ? "bottom" : "top")}
          aria-hidden="true"
          animate={opening && !reduced ? { y: i ? "100%" : "-100%" } : { y: 0 }}
          transition={{ duration: 0.5, ease: eases.enter }}
        />
      ))}
      {age >= 600 && !opening && (
        <button type="button" className="boot-skip button" onClick={onClose}>
          PASSER →
        </button>
      )}
    </dialog>
  );
}
