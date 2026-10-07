"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, useMotionValue } from "motion/react";
import * as m from "motion/react-m";
import { ArrowLeft, ArrowRight, Smartphone } from "lucide-react";
import { carouselTransition, snapIndex } from "@/lib/animation-state";
import { eases } from "@/lib/motion";
import { useAnimations } from "./AnimationProvider";
type Props<T extends { id: string }> = {
  items: T[];
  renderItem: (item: T) => ReactNode;
  getLabel: (item: T) => string;
  selectedIds?: string[];
  onSelect: (item: T) => void;
  onReturn?: (item: T) => void;
  selectLabel?: string;
  returnLabel?: string;
};
/** Accessible horizontal carousel. Vertical selection lives in its dedicated gesture handle. */
export function CardCarousel<T extends { id: string }>({
  items,
  renderItem,
  getLabel,
  selectedIds = [],
  onSelect,
  onReturn,
  selectLabel = "Sélectionner",
  returnLabel = "Retirer",
}: Props<T>) {
  const { reduced, play } = useAnimations(),
    container = useRef<HTMLDivElement>(null),
    [current, setCurrent] = useState(0),
    [step, setStep] = useState(336),
    [pulse, setPulse] = useState(0),
    [sensors, setSensors] = useState(false),
    [sensorMessage, setSensorMessage] = useState("");
  const index = Math.min(current, Math.max(0, items.length - 1)),
    x = useMotionValue(-160),
    rx = useMotionValue(0),
    ry = useMotionValue(0),
    glowX = useMotionValue(0),
    glowY = useMotionValue(0),
    release = useRef(-160),
    wheel = useRef(0),
    pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const item = items[index],
    selected = item && selectedIds.includes(item.id);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setStep(Math.min(320, Math.max(200, entry.contentRect.width - 80)) + 16),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const controls = animate(
      x,
      -index * step - (step - 16) / 2,
      carouselTransition(reduced),
    );
    return () => controls.stop();
  }, [index, step, x, reduced]);
  useEffect(() => {
    if (!sensors || reduced) return;
    const orient = (e: DeviceOrientationEvent) => {
      rx.set(Math.max(-8, Math.min(8, (e.beta ?? 0) / 8)));
      ry.set(Math.max(-8, Math.min(8, (e.gamma ?? 0) / 4)));
    };
    window.addEventListener("deviceorientation", orient);
    return () => {
      window.removeEventListener("deviceorientation", orient);
      rx.set(0);
      ry.set(0);
    };
  }, [sensors, reduced, rx, ry]);
  useEffect(
    () => () => {
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
    },
    [],
  );
  function haptic() {
    try {
      navigator.vibrate?.(8);
    } catch {
      /* Optional device feedback. */
    }
  }
  function move(next: number) {
    setCurrent(Math.max(0, Math.min(items.length - 1, next)));
    haptic();
    play("snap");
  }
  function choose(remove = false) {
    if (!item) return;
    if (remove) {
      if (onReturn) onReturn(item);
      else return;
    } else onSelect(item);
    setPulse(remove ? -1 : 1);
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => setPulse(0), 350);
    haptic();
    play("select");
  }
  async function enableSensors() {
    try {
      if (typeof DeviceOrientationEvent === "undefined") {
        setSensorMessage("Inclinaison indisponible sur cet appareil.");
        return;
      }
      const orientation =
        DeviceOrientationEvent as typeof DeviceOrientationEvent & {
          requestPermission?: () => Promise<string>;
        };
      if (
        orientation.requestPermission &&
        (await orientation.requestPermission()) !== "granted"
      ) {
        setSensorMessage(
          "Inclinaison désactivée. Les boutons restent disponibles.",
        );
        return;
      }
      setSensors(true);
      setSensorMessage("Inclinaison activée.");
    } catch {
      setSensorMessage("Inclinaison indisponible.");
    }
  }
  if (!item)
    return <p className="muted carousel-empty">Aucune carte à afficher.</p>;
  return (
    <section
      className="card-carousel"
      aria-label="Cartes joueurs"
      onKeyDown={(e) => {
        if (
          (e.target as Element).closest("input,textarea,select") ||
          !["ArrowLeft", "ArrowRight", "Enter"].includes(e.key)
        )
          return;
        if (e.key === "Enter" && (e.target as Element).closest("button,a"))
          return;
        e.preventDefault();
        if (e.key === "ArrowLeft") move(index - 1);
        else if (e.key === "ArrowRight") move(index + 1);
        else choose();
      }}
    >
      <div
        className="carousel-viewport"
        ref={container}
        tabIndex={0}
        aria-label="Parcourir les cartes avec les flèches"
        onWheel={(e) => {
          const delta =
            Math.abs(e.deltaX) > Math.abs(e.deltaY)
              ? e.deltaX
              : e.shiftKey
                ? e.deltaY
                : 0;
          if (!delta) return;
          wheel.current += delta;
          if (Math.abs(wheel.current) > 60) {
            move(index + Math.sign(wheel.current));
            wheel.current = 0;
          }
        }}
      >
        <m.div
          className="carousel-track"
          style={{ x }}
          drag={reduced ? false : "x"}
          dragElastic={0.12}
          dragMomentum
          dragConstraints={{
            left: -(items.length - 1) * step - (step - 16) / 2,
            right: -(step - 16) / 2,
          }}
          dragTransition={{
            timeConstant: 180,
            power: 0.18,
            bounceStiffness: 1000,
            bounceDamping: 100,
            modifyTarget: () => release.current,
          }}
          onDragEnd={(_, info) => {
            const next = snapIndex(
              index,
              info.offset.x,
              info.velocity.x,
              step,
              items.length,
            );
            release.current = -next * step - (step - 16) / 2;
            move(next);
          }}
        >
          {items.map((entry, i) => (
            <m.article
              className={
                "carousel-card " +
                (i === index ? "is-center" : "") +
                (selectedIds.includes(entry.id) ? " is-picked" : "")
              }
              key={entry.id}
              aria-hidden={i !== index}
              inert={i !== index}
              style={{
                width: step - 16,
                rotateX: i === index && !reduced ? rx : 0,
                rotateY: i === index && !reduced ? ry : 0,
              }}
              animate={{
                scale: reduced ? 1 : i === index ? 1 : 0.86,
                opacity: i === index ? 1 : 0.5,
                x: reduced ? 0 : i === index && pulse > 0 ? [0, -2, 2, 0] : 0,
                y: reduced
                  ? 0
                  : i === index && pulse
                    ? pulse > 0
                      ? -16
                      : 16
                    : 0,
              }}
              transition={{
                duration: reduced ? 0.15 : 0.22,
                x: { duration: 0.12 },
                ease: eases.enter,
              }}
              onPointerMove={(e) => {
                if (
                  i !== index ||
                  reduced ||
                  !window.matchMedia("(any-hover:hover) and (any-pointer:fine)").matches
                )
                  return;
                const box = e.currentTarget.getBoundingClientRect();
                ry.set(
                  ((e.clientX - box.left - box.width / 2) / box.width) * 16,
                );
                rx.set(
                  (-(e.clientY - box.top - box.height / 2) / box.height) * 16,
                );
                glowX.set(e.clientX - box.left - box.width / 2);
                glowY.set(e.clientY - box.top - box.height / 2);
              }}
              onPointerLeave={() => {
                rx.set(0);
                ry.set(0);
              }}
            >
              {renderItem(entry)}
              <m.div
                className="carousel-hologram"
                aria-hidden="true"
                style={{ x: glowX, y: glowY }}
              />
              {i === index && (
                <>
                  <m.div
                    className="carousel-pulse"
                    aria-hidden="true"
                    animate={{ opacity: pulse > 0 ? 0.2 : 0 }}
                    transition={{ duration: 0.12 }}
                  />
                  {!reduced && (
                    <m.div
                      className="carousel-grip"
                      drag={reduced ? false : "y"}
                      dragConstraints={{ top: 0, bottom: 0 }}
                      dragElastic={0.12}
                      dragMomentum={false}
                      onDragEnd={(_, info) => {
                        if (info.offset.y < -40) choose();
                        else if (info.offset.y > 40 && onReturn) choose(true);
                      }}
                      aria-hidden="true"
                    >
                      ↑ CHOISIR {onReturn ? "· ↓ RETIRER" : ""}
                    </m.div>
                  )}
                </>
              )}
            </m.article>
          ))}
        </m.div>
      </div>
      <div className="carousel-controls">
        <button
          className="button"
          type="button"
          disabled={index === 0}
          aria-label="Carte précédente"
          onClick={() => move(index - 1)}
        >
          <ArrowLeft size={16} />
        </button>
        <span className="eyebrow carousel-position" aria-live="polite">
          {getLabel(item)} · {index + 1}/{items.length}
        </span>
        <button
          className="button"
          type="button"
          disabled={index === items.length - 1}
          aria-label="Carte suivante"
          onClick={() => move(index + 1)}
        >
          <ArrowRight size={16} />
        </button>
      </div>
      <div className="carousel-ruler" aria-hidden="true">
        {items.map((entry, i) => (
          <i key={entry.id} className={i === index ? "active" : ""} />
        ))}
      </div>
      <div className="carousel-actions">
        <button
          className="button primary"
          type="button"
          aria-pressed={!!selected}
          onClick={() => choose()}
        >
          {selectLabel} {getLabel(item)} →
        </button>
        {onReturn && (
          <button
            className="button"
            type="button"
            disabled={!selected}
            style={{ visibility: selected ? "visible" : "hidden" }}
            onClick={() => choose(true)}
          >
            {returnLabel}
          </button>
        )}
        <button
          className="button carousel-sensor"
          type="button"
          disabled={reduced}
          aria-pressed={sensors}
          onClick={() => (sensors ? setSensors(false) : void enableSensors())}
        >
          <Smartphone size={14} /> {sensors ? "COUPER" : "ACTIVER"}{" "}
          L’INCLINAISON
        </button>
      </div>
      {sensorMessage && (
        <p className="muted" role="status">
          {sensorMessage}
        </p>
      )}
    </section>
  );
}
