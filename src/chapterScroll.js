export const CHAPTER_OVERLAY_MIN_HALF_RANGE_KM = 2.4;
export const CHAPTER_OVERLAY_MAX_HALF_RANGE_KM = 4.5;
export const CHAPTER_OVERLAY_KM_PER_LINE = 0.55;

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
