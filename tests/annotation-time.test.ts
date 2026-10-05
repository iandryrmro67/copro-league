import test from "node:test";
import assert from "node:assert/strict";
import {
  parseActionTime,
  formatActionTime,
  shiftActionTime,
} from "../lib/annotation-time.ts";
import { annotationMoment } from "../lib/annotation-controls.ts";
test("quick time changes cross minute boundaries and never go below kickoff", () => {
  assert.equal(shiftActionTime("00:59", 1), "01:00");
  assert.equal(shiftActionTime("01:00", -1), "00:59");
  assert.equal(shiftActionTime("00:00", -1), "00:00");
  assert.equal(shiftActionTime("0:58", 5), "01:03");
  assert.equal(shiftActionTime("01:03", -5), "00:58");
  assert.equal(shiftActionTime("00:03", -30), "00:00");
  assert.equal(shiftActionTime("120:59", 60), "121:59");
  assert.equal(shiftActionTime("9999:59", 60), "9999:59");
});
test("unknown historical time stays unknown until an explicit adjustment", () => {
  assert.equal(parseActionTime(""), null);
  assert.equal(parseActionTime("1:99"), null);
  assert.equal(parseActionTime("wat"), null);
  assert.equal(formatActionTime(null), "");
  assert.equal(shiftActionTime("", 30), "00:30");
});
test("adjusted match time preserves the video offset used by capture", () => {
  const stamp = shiftActionTime("02:00", -5);
  assert.deepEqual(
    annotationMoment({ stamp, offset: 30, videoTime: 0, useVideo: false }),
    { timestamp: 115, videoTimestamp: 145 },
  );
});
