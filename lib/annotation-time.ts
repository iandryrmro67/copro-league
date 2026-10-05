const maxTime = 9999 * 60 + 59;
export function parseActionTime(value: string): number | null {
  if (!/^\d{1,4}:[0-5]\d$/.test(value)) return null;
  const [minutes, seconds] = value.split(":").map(Number);
  return minutes * 60 + seconds;
}
export function formatActionTime(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "";
  const time = Math.min(maxTime, Math.max(0, Math.floor(value)));
  return `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`;
}
export function shiftActionTime(value: string, delta: number): string {
  return formatActionTime((parseActionTime(value) ?? 0) + delta);
}
