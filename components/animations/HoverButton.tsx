"use client";
import { forwardRef, useEffect, useRef } from "react";
import { useMotionValue, type HTMLMotionProps } from "motion/react";
import * as m from "motion/react-m";
import { magneticOffset } from "@/lib/animation-state";
import { useAnimations } from "./AnimationProvider";
type Props = HTMLMotionProps<"button"> & {
  variant?: "primary" | "secondary";
  magnetic?: boolean;
};
/** Native button attributes/ref are forwarded. Disable magnetism for precision controls. */
export const HoverButton = forwardRef<HTMLButtonElement, Props>(
  function HoverButton(
    {
      variant = "primary",
      magnetic = true,
      className = "",
      children,
      onPointerMove,
      onPointerLeave,
      ...props
    },
    ref,
  ) {
    const button = useRef<HTMLButtonElement | null>(null);
    const { reduced } = useAnimations(),
      x = useMotionValue(0),
      y = useMotionValue(0);
    useEffect(() => {
      if (reduced) {
        x.set(0);
        y.set(0);
      }
    }, [reduced, x, y]);
    useEffect(() => {
      if (!magnetic || reduced || props.disabled || variant !== "primary")
        return;
      const fine = matchMedia("(hover:hover) and (pointer:fine)");
      const move = (e: PointerEvent) => {
        const element = button.current;
        if (!element || !fine.matches || e.pointerType === "touch") return;
        const r = element.getBoundingClientRect(),
          offset = magneticOffset(
            e.clientX - r.left - r.width / 2,
            e.clientY - r.top - r.height / 2,
            r.width,
            r.height,
          );
        x.set(
          Math.max(-r.left, Math.min(window.innerWidth - r.right, offset.x)),
        );
        y.set(
          Math.max(-r.top, Math.min(window.innerHeight - r.bottom, offset.y)),
        );
      };
      const reset = () => {
        x.set(0);
        y.set(0);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("blur", reset);
      return () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("blur", reset);
        reset();
      };
    }, [magnetic, reduced, props.disabled, variant, x, y]);
    return (
      <m.button
        {...props}
        ref={(element) => {
          button.current = element;
          if (typeof ref === "function") ref(element);
          else if (ref) ref.current = element;
        }}
        className={`button hover-button ${variant === "primary" ? "primary" : ""} ${className}`}
        style={{ ...props.style, x, y }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        {children}
      </m.button>
    );
  },
);
