"use client";
import { useEffect, useRef, useState } from "react";
import { useAnimations } from "./AnimationProvider";
/** The real label never changes. Only an aria-hidden monospace layer is scrambled. */
export function HudLabel({ text }: { text: string }) {
  const { reduced } = useAnimations(),
    [decoded, setDecoded] = useState(""),
    timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );
  function decode() {
    if (
      reduced ||
      !window.matchMedia("(any-hover:hover) and (any-pointer:fine)").matches
    )
      return;
    if (timer.current) clearInterval(timer.current);
    let frame = 0;
    timer.current = setInterval(() => {
      frame++;
      if (frame >= 16) {
        clearInterval(timer.current!);
        setDecoded("");
        return;
      }
      const symbols = "01+-_/";
      setDecoded(
        [...text]
          .map((char, i) =>
            char === " " || i / text.length < frame / 16
              ? char
              : symbols[Math.floor(Math.random() * symbols.length)],
          )
          .join(""),
      );
    }, 25);
  }
  return (
    <span
      className={"hud-label " + (decoded && !reduced ? "is-decoding" : "")}
      onPointerEnter={decode}
    >
      <span className="hud-label-real">{text}</span>
      {decoded && !reduced && (
        <span className="hud-label-decode" aria-hidden="true">
          {decoded}
        </span>
      )}
    </span>
  );
}
