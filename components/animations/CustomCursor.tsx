"use client";
import { useEffect, useState } from "react";
import { useMotionValue } from "motion/react";
import * as m from "motion/react-m";
import { cursorAllowed } from "@/lib/animation-state";
import { useAnimations } from "./AnimationProvider";
/** Progressive enhancement on fine pointers only; native cursor on text and precision surfaces. */
export function CustomCursor() {
  const { reduced, busy } = useAnimations(),
    x = useMotionValue(-100),
    y = useMotionValue(-100),
    [hover, setHover] = useState(false),
    [visible, setVisible] = useState(false);
  useEffect(() => {
    if (reduced || busy) return;
    const fine = matchMedia("(any-hover:hover) and (any-pointer:fine)");
    let frame = 0,
      cx = -100,
      cy = -100,
      tx = -100,
      ty = -100;
    const tick = () => {
      cx += (tx - cx) * 0.3;
      cy += (ty - cy) * 0.3;
      x.set(cx);
      y.set(cy);
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.1)
        frame = requestAnimationFrame(tick);
      else frame = 0;
    };
    const move = (e: PointerEvent) => {
      const target = e.target as Element,
        interactive = !!target.closest('a,button,summary,[role="button"]'),
        allowed = cursorAllowed({
          fine: fine.matches,
          touch: e.pointerType === "touch",
          modal: !!document.querySelector("dialog[open]"),
          precision: !!target.closest(
            "input,textarea,select,[contenteditable],video,iframe,.precise-workspace",
          ),
          interactive,
          text: !!target.closest("p,h1,h2,h3,span"),
          disabled: !!target.closest('[disabled],[aria-disabled="true"]'),
        });
      document.documentElement.classList.toggle("copro-custom-cursor", allowed);
      setVisible(allowed);
      setHover(interactive);
      if (tx === -100) {
        cx = e.clientX;
        cy = e.clientY;
        x.set(cx);
        y.set(cy);
      }
      tx = e.clientX;
      ty = e.clientY;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const leave = () => {
      document.documentElement.classList.remove("copro-custom-cursor");
      setVisible(false);
    };
    window.addEventListener("pointermove", move);
    document.addEventListener("pointerleave", leave);
    fine.addEventListener("change", leave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      fine.removeEventListener("change", leave);
      leave();
    };
  }, [reduced, busy, x, y]);
  if (reduced) return null;
  return (
    <m.div
      className="copro-cursor"
      aria-hidden="true"
      style={{ x, y }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.15 }}
    >
      <m.i className="cursor-dot" animate={{ opacity: hover ? 0 : 1 }} />
      <m.div
        className="cursor-crosshair"
        animate={{ opacity: hover ? 1 : 0, scale: hover ? 1 : 0.2 }}
        transition={{ duration: 0.15 }}
      >
        {[0, 1, 2, 3].map((i) => (
          <i className={"c" + i} key={i} />
        ))}
      </m.div>
    </m.div>
  );
}
