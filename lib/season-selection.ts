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

/** Match pages inherit the match's season even when several seasons are active. */
export function pageSeasonId(
  path: string,
  seasons: Season[],
  matches: { id: string; seasonId: string }[],
  chosen = "",
) {
  if (path.startsWith("/matchs/")) {
    const match = matches.find((m) => m.id === path.split("/")[2]);
    if (match) return match.seasonId;
  }
  if (path === "/") return latestSeasonId(seasons);
  return (
    chosen ||
    latestSeasonId(seasons.filter((s) => s.status === "active")) ||
    latestSeasonId(seasons)
  );
}
