import type { Season } from "./model.ts";
/** Home always follows the latest real season, independent of storage order. */
export function latestSeasonId(seasons: Season[]): string {
  const real = seasons.filter((s) => !s.demo);
  return (
    [...(real.length ? real : seasons)].sort(
      (a, b) =>
        b.start.localeCompare(a.start) ||
        b.name.localeCompare(a.name, "fr", { numeric: true }) ||
        b.id.localeCompare(a.id, "fr", { numeric: true }),
    )[0]?.id ?? ""
  );
}
