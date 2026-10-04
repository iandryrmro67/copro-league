import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { navigationKind } from "../lib/animated-navigation.ts";
import { cursorAllowed, carouselTransition } from "../lib/animation-state.ts";
import { AnimationPreview } from "../components/animations/AnimationProvider.tsx";
import { CardCarousel } from "../components/animations/CardCarousel.tsx";
test("entering and leaving the editor creates document history protected by beforeunload", () => {
  assert.equal(navigationKind("/stats", "/admin"), "document");
  assert.equal(navigationKind("/admin", "/stats"), "document");
  assert.equal(navigationKind("/admin", "/admin"), "document");
  assert.equal(navigationKind("/stats", "/joueurs"), "client");
  assert.equal(navigationKind("/matchs", "/matchs"), "document");
});
test("native cursor remains usable inside top-layer modals and precision controls", () => {
  const normal = {
    fine: true,
    touch: false,
    modal: false,
    precision: false,
    interactive: true,
    text: false,
    disabled: false,
  };
  assert.equal(cursorAllowed(normal), true);
  assert.equal(cursorAllowed({ ...normal, modal: true }), false);
  assert.equal(cursorAllowed({ ...normal, precision: true }), false);
  assert.equal(cursorAllowed({ ...normal, touch: true }), false);
});
test("reduced motion does not interpolate card position or render an inert gesture handle", () => {
  assert.equal(carouselTransition(true).duration, 0);
  assert.ok(carouselTransition(false).duration > 0);
  const html = renderToStaticMarkup(
    React.createElement(
      AnimationPreview,
      { reduced: true },
      React.createElement(CardCarousel, {
        items: [{ id: "a" }],
        renderItem: () => React.createElement("p", null, "Alex"),
        getLabel: () => "Alex",
        onSelect: () => {},
      }),
    ),
  );
  assert.doesNotMatch(html, /carousel-grip/);
  assert.match(html, /Sélectionner/);
});
