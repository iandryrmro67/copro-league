import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { defaultSettings, type League } from "../lib/model.ts";
let currentPath = "/glossaire";
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
    usePathname: () => currentPath,
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
// Next's CJS entry wrappers are resolved by the bundler in production.
mock.module(import.meta.resolve("next/link"), {
  defaultExport: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }>) =>
    React.createElement("a", { ...props, href }, children),
});
mock.module(import.meta.resolve("next/image"), {
  defaultExport: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement("img", { src, alt }),
});
const { default: LeagueApp } = await import("../components/league.tsx");
test("background refresh errors keep the current page and offer a retry", () => {
  const html = renderToStaticMarkup(React.createElement(LeagueApp));
  assert.match(html, /LE GUIDE DES STATS/);
  assert.match(html, /Connexion temporairement indisponible/);
  assert.match(html, /Réessayer/);
});

test("home renders the latest season even when the earlier season is active and listed first", () => {
  currentPath = "/";
  data.seasons = [
    {
      id: "old",
      name: "Saison 2",
      start: "2025-01-01",
      end: "",
      status: "active",
      demo: false,
      contribution: 0,
      winnerId: null,
      minParticipation: 0,
      version: 1,
    },
    {
      id: "new",
      name: "Saison 3",
      start: "2026-01-01",
      end: "",
      status: "inactive",
      demo: false,
      contribution: 0,
      winnerId: null,
      minParticipation: 0,
      version: 1,
    },
  ];
  data.matches = [
    {
      id: "old-match",
      seasonId: "old",
      number: 99,
      date: "2025-01-01",
      duration: 60,
      location: "",
      status: "finished",
      scoreA: 1,
      scoreB: 0,
      mvpId: null,
      level: 1,
      video: "https://www.youtube.com/watch?v=oldseason01",
      participants: [],
      events: [],
      trackedKeys: [],
      version: 1,
    },
  ];
  try {
    const html = renderToStaticMarkup(React.createElement(LeagueApp));
    assert.match(html, /LA LIGUE \/ Saison 3/);
    assert.doesNotMatch(html, /LA LIGUE \/ Saison 2/);
    assert.doesNotMatch(html, /Replay du match 99/);
  } finally {
    currentPath = "/glossaire";
    data.seasons = [];
    data.matches = [];
  }
});
