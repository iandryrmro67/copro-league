"use client";
import { useState } from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import type { Check } from "@/lib/recognition";
import { RecognitionIcon } from "../recognition-icon";
import { eases } from "@/lib/motion";
import { useAnimations } from "./AnimationProvider";
export type ViewerBadge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  kind: "badge" | "award";
  status: string;
  checks: Check[];
  active?: boolean;
};
/** Badge/award browsing; active is authoritative only for kind=badge. */
export function BadgeViewer({
  items,
  label = "Explorer les distinctions",
}: {
  items: ViewerBadge[];
  label?: string;
}) {
  const { reduced, play } = useAnimations(),
    [index, setIndex] = useState(0),
    [direction, setDirection] = useState(1);
  const current = Math.min(index, Math.max(0, items.length - 1)),
    badge = items[current];
  function move(next: number) {
    setDirection(next > current ? 1 : -1);
    setIndex((next + items.length) % items.length);
    play("snap");
  }
  if (!badge) return <p className="muted">Aucune distinction à afficher.</p>;
  const locked = badge.kind === "badge" && !badge.active,
    passed = badge.checks.filter((c) => c.passed).length;
  return (
    <section
      className="badge-viewer"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (
          (e.target as Element).closest("input,textarea,select") ||
          !["ArrowLeft", "ArrowRight"].includes(e.key)
        )
          return;
        e.preventDefault();
        move(current + (e.key === "ArrowRight" ? 1 : -1));
      }}
    >
      <div className="badge-viewer-visual">
        <AnimatePresence initial={false} custom={direction}>
          <m.div
            key={badge.id}
            className={"badge-viewer-icon " + (locked ? "is-locked" : "")}
            custom={direction}
            variants={{
              enter: (d: number) => ({
                opacity: 0,
                x: reduced ? 0 : d * 40,
                scale: reduced ? 1 : 0.92,
              }),
              rest: { opacity: 1, x: 0, scale: 1 },
              exit: (d: number) => ({
                opacity: 0,
                x: reduced ? 0 : -d * 40,
                scale: reduced ? 1 : 0.92,
              }),
            }}
            initial="enter"
            animate="rest"
            exit="exit"
            transition={{ duration: reduced ? 0.15 : 0.35, ease: eases.enter }}
            drag={reduced ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragMomentum={false}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) > 40)
                move(current + (info.offset.x < 0 ? 1 : -1));
            }}
          >
            <RecognitionIcon icon={badge.icon} />
            {locked && (
              <LockKeyhole
                className="badge-lock"
                size={18}
                aria-hidden="true"
              />
            )}
            <div className="badge-ring" aria-hidden="true">
              {Array.from({ length: 4 }, (_, i) => (
                <m.i
                  key={i}
                  className={"ring-quarter q" + i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: reduced ? 0.15 : 0.125,
                    delay: reduced ? 0 : i * 0.125,
                  }}
                />
              ))}
            </div>
          </m.div>
        </AnimatePresence>
      </div>
      <div className="badge-name-mask">
        <m.h3
          key={badge.id}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0.15 : 0.35, ease: eases.enter }}
        >
          {badge.name}
        </m.h3>
      </div>
      <m.p
        key={badge.id + "desc"}
        className="badge-description"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, delay: reduced ? 0 : 0.08 }}
      >
        {badge.description}
      </m.p>
      <p className="eyebrow badge-status">{badge.status}</p>
      <div
        className="badge-criteria"
        aria-hidden={!locked}
        style={{ visibility: locked ? "visible" : "hidden" }}
      >
        <span>
          Critères vérifiés : {passed} / {badge.checks.length}
        </span>
        <div className="criteria-bar">
          <i
            style={{
              transform: `scaleX(${badge.checks.length ? passed / badge.checks.length : 0})`,
            }}
          />
        </div>
        <small>
          Consulte les conditions complètes. Les groupes de règles et les
          données disponibles déterminent l’activation.
        </small>
      </div>
      <div className="badge-viewer-controls">
        <button
          className="button"
          type="button"
          aria-label="Badge précédent"
          disabled={items.length < 2}
          onClick={() => move(current - 1)}
        >
          <ArrowLeft size={16} />
        </button>
        <span className="eyebrow" aria-live="polite">
          {current + 1} / {items.length} · {badge.name}
        </span>
        <button
          className="button"
          type="button"
          aria-label="Badge suivant"
          disabled={items.length < 2}
          onClick={() => move(current + 1)}
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}
