import test from "node:test";
import assert from "node:assert/strict";

import {
  getChapterHalfRangeKm,
  getChapterOverlayState,
} from "./chapterScroll.js";

const CHAPTER_BREAKS = {
  12: {
    lines: [
      "You've reached the tropopause, at about 12 km.",
      "Below this height, it gets colder with altitude.",
      "Above it is the stratosphere.",
      "This means air is stratified.",
      "Planes fly near these altitudes.",
    ],
  },
  50: {
    lines: [
      "You've reached the stratopause, at about 50 km.",
      "You just passed through the ozone layer.",
      "That absorption is why temperatures rose.",
      "Above here, temperatures plummet again.",
    ],
  },
};

test("chapter half range stays within the configured limits", () => {
  assert.equal(getChapterHalfRangeKm(1), 2.4);
  assert.equal(getChapterHalfRangeKm(4), 2.4);
  assert.equal(getChapterHalfRangeKm(10), 4.5);
});

test("overlay activates near a chapter and reports forward progress", () => {
  const state = getChapterOverlayState(CHAPTER_BREAKS, 12);

  assert.ok(state);
  assert.equal(state.chapterKm, 12);
  assert.equal(state.progress, 0.5);
});

test("overlay rewinds immediately when the center moves back down", () => {
  const upwardState = getChapterOverlayState(CHAPTER_BREAKS, 13.5);
  const downwardState = getChapterOverlayState(CHAPTER_BREAKS, 11.5);

  assert.ok(upwardState);
  assert.ok(downwardState);
  assert.equal(upwardState.chapterKm, 12);
  assert.equal(downwardState.chapterKm, 12);
  assert.ok(upwardState.progress > downwardState.progress);
});

test("overlay disappears outside the chapter range without any cooldown state", () => {
  assert.equal(getChapterOverlayState(CHAPTER_BREAKS, 7), null);
  assert.equal(getChapterOverlayState(CHAPTER_BREAKS, 17), null);
});

test("nearest in-range chapter wins when overlay windows are close", () => {
  const state = getChapterOverlayState(CHAPTER_BREAKS, 47.8);

  assert.ok(state);
  assert.equal(state.chapterKm, 50);
});
