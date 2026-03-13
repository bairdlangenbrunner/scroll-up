export const CHAPTER_OVERLAY_MIN_HALF_RANGE_KM = 2.4;
export const CHAPTER_OVERLAY_MAX_HALF_RANGE_KM = 4.5;
export const CHAPTER_OVERLAY_KM_PER_LINE = 0.55;
export const CHAPTER_EXIT_EPSILON_KM = 0.02;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getChapterHalfRangeKm(lineCount) {
  return clamp(
    lineCount * CHAPTER_OVERLAY_KM_PER_LINE,
    CHAPTER_OVERLAY_MIN_HALF_RANGE_KM,
    CHAPTER_OVERLAY_MAX_HALF_RANGE_KM
  );
}

export function getChapterOverlayState(chapterBreaks, centerKm) {
  let bestMatch = null;

  for (const [kmKey, chapter] of Object.entries(chapterBreaks)) {
    const chapterKm = Number(kmKey);
    const halfRangeKm = getChapterHalfRangeKm(chapter.lines.length);
    const distanceKm = Math.abs(centerKm - chapterKm);

    if (distanceKm > halfRangeKm) continue;

    const progress = clamp(
      (centerKm - (chapterKm - halfRangeKm)) / (halfRangeKm * 2),
      0,
      1
    );
    const normalizedDistance = distanceKm / halfRangeKm;

    if (!bestMatch || normalizedDistance < bestMatch.normalizedDistance) {
      bestMatch = {
        chapterKm,
        chapter,
        progress,
        normalizedDistance,
      };
    }
  }

  return bestMatch;
}

export function findChapterCrossing(chapterBreaks, previousKm, nextKm) {
  if (nextKm === previousKm) return null;

  const direction = nextKm > previousKm ? "up" : "down";
  const orderedBreaks = Object.keys(chapterBreaks)
    .map(Number)
    .sort((a, b) => (direction === "up" ? a - b : b - a));

  for (const chapterKm of orderedBreaks) {
    const crossedUp = previousKm < chapterKm && nextKm >= chapterKm;
    const crossedDown = previousKm > chapterKm && nextKm <= chapterKm;

    if (crossedUp || crossedDown) {
      return {
        chapterKm,
        direction: crossedUp ? "up" : "down",
        chapter: chapterBreaks[chapterKm],
      };
    }
  }

  return null;
}
