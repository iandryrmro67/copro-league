import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { defaultSettings, type League } from "../lib/model.ts";
const data: League = {
  players: [],
  matches: [],
  seasons: [],
  settings: defaultSettings,
  user: null,
  admin: false,
  bootstrap: false,
};
mock.module(import.meta.resolve("next/navigation"), {
  namedExports: {
    usePathname: () => "/glossaire",
    useRouter: () => ({ prefetch: () => {}, push: () => {} }),
  },
});
mock.module("../components/animations/LeagueDataProvider.tsx", {
  namedExports: {
    useLeagueData: () => ({
      data,
      error: "Connexion temporairement indisponible",
      refresh: async () => data,
    }),
  },
});
const { default: LeagueApp } = await import("../components/league.tsx");
test("background refresh errors keep the current page and offer a retry", () => {
  const html = renderToStaticMarkup(React.createElement(LeagueApp));
  assert.match(html, /COMPRENDRE LES STATS/);
  assert.match(html, /Connexion temporairement indisponible/);
  assert.match(html, /Réessayer/);
});
