import test from "node:test";
import assert from "node:assert/strict";
import type { Season } from "../lib/model.ts";
import { latestSeasonId } from "../lib/season-selection.ts";
const season = (
  id: string,
  start: string,
  status: Season["status"] = "active",
  demo = false,
): Season => ({
  id,
  name: `Saison ${id}`,
  start,
  end: "",
  status,
  demo,
  contribution: 0,
  winnerId: null,
  minParticipation: 0,
  version: 1,
});
test("latest season uses chronology rather than storage order or active status", () => {
  const seasons = [
    season("1", "2025-01-01"),
    season("3", "2027-01-01", "inactive"),
    season("2", "2026-01-01"),
  ];
  assert.equal(latestSeasonId(seasons), "3");
  assert.equal(latestSeasonId([...seasons].reverse()), "3");
  assert.deepEqual(
    seasons.map((s) => s.id),
    ["1", "3", "2"],
  );
});
test("undated seasons use natural numbering and real seasons take precedence over demos", () => {
  assert.equal(
    latestSeasonId([season("2", ""), season("10", ""), season("1", "")]),
    "10",
  );
  assert.equal(
    latestSeasonId([
      season("2", "2026-01-01"),
      season("99", "2099-01-01", "active", true),
    ]),
    "2",
  );
  assert.equal(latestSeasonId([]), "");
});

test("match context wins over a chosen season and multiple active seasons", async () => {
  const { pageSeasonId } = await import("../lib/season-selection.ts");
  const seasons = [season("2", "2025-01-01"), season("3", "2026-01-01")];
  assert.equal(
    pageSeasonId("/matchs/m", seasons, [{ id: "m", seasonId: "3" }], "2"),
    "3",
  );
  assert.equal(pageSeasonId("/matchs", seasons, []), "3");
  assert.equal(pageSeasonId("/joueurs", seasons, [], "2"), "2");
  assert.equal(pageSeasonId("/", seasons, [], "2"), "3");
});
