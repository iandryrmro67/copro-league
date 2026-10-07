export type BootTasks = { fonts: boolean; image: boolean; data: boolean };
export type UnlockBadge = { id: string; active: boolean };
export function bootProgress(tasks: BootTasks) {
  return (
    Number(tasks.fonts) * 30 +
    Number(tasks.image) * 10 +
    Number(tasks.data) * 60
  );
}
export function snapIndex(
  index: number,
  offset: number,
  velocity: number,
  step: number,
  count: number,
) {
  if (count <= 1 || step <= 0) return 0;
  return Math.max(
    0,
    Math.min(count - 1, index - Math.round((offset + velocity * 0.18) / step)),
  );
}
export function unlockedIds(
  before: UnlockBadge[] | null,
  after: UnlockBadge[],
  seen: ReadonlySet<string>,
) {
  if (!before) return [];
  const previous = new Map(before.map((b) => [b.id, b.active]));
  return after
    .filter((b) => b.active && previous.get(b.id) === false && !seen.has(b.id))
    .map((b) => b.id);
}
/** Deduplicates concurrent reads only; never persists a response or caches an error. */
export function createSingleFlight<T>(load: () => Promise<T>) {
  let pending: Promise<T> | null = null;
  return () => {
    if (!pending)
      pending = load().finally(() => {
        pending = null;
      });
    return pending;
  };
}
export function magneticOffset(
  dx: number,
  dy: number,
  width: number,
  height: number,
) {
  if (
    Math.hypot(
      Math.max(Math.abs(dx) - width / 2, 0),
      Math.max(Math.abs(dy) - height / 2, 0),
    ) > 60
  )
    return { x: 0, y: 0 };
  return {
    x: Math.max(-6, Math.min(6, (dx / (width / 2 + 60)) * 6)),
    y: Math.max(-6, Math.min(6, (dy / (height / 2 + 60)) * 6)),
  };
}

/** A cursor outside the native top layer cannot replace the pointer inside a modal. */
export function cursorAllowed(state: {
  fine: boolean;
  touch: boolean;
  modal: boolean;
  precision: boolean;
  interactive: boolean;
  text: boolean;
  disabled: boolean;
}) {
  return (
    state.fine &&
    !state.touch &&
    !state.modal &&
    !state.precision &&
    !state.disabled &&
    (state.interactive || !state.text)
  );
}
/** Imperative Motion animations need their own reduced-motion preference. */
export function carouselTransition(reduced: boolean) {
  return {
    duration: reduced ? 0 : 0.35,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  };
}

export type MotionPreference = "auto" | "full" | "reduced";
/** Auto respects accessibility settings; only an explicit choice overrides them. */
export function resolveReducedMotion(preference: MotionPreference, systemReduced: boolean) {
  return preference === "auto" ? systemReduced : preference === "reduced";
}
