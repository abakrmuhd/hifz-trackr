function cloneValue(value) {
  return globalThis.structuredClone
    ? globalThis.structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function buildOrderedAyahKeys(metadata) {
  return Object.entries(metadata?.pages || {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .flatMap(([, page]) => page.ayahKeys || []);
}

function clampCount(value) {
  return Math.max(0, value);
}

function buildTransitionKey(metadata, fromAyahKey, toAyahKey) {
  const page = metadata?.ayahToPage?.[fromAyahKey];
  if (!page) return null;
  return `${page}|${fromAyahKey}|${toAyahKey}`;
}

export function bulkFillAyahRangeCounts({
  state,
  metadata,
  startAyahKey,
  endAyahKey,
  repetitionCount,
  transitionCount,
  mode = "replace"
}) {
  const orderedAyahs = buildOrderedAyahKeys(metadata);
  const startIndex = orderedAyahs.indexOf(startAyahKey);
  const endIndex = orderedAyahs.indexOf(endAyahKey);

  if (startIndex < 0 || endIndex < 0) {
    return {
      ...state,
      ayahProgress: { ...(state.ayahProgress || {}) },
      transitionProgress: { ...(state.transitionProgress || {}) }
    };
  }

  const rangeStart = Math.min(startIndex, endIndex);
  const rangeEnd = Math.max(startIndex, endIndex);
  const inRangeKeys = orderedAyahs.slice(rangeStart, rangeEnd + 1);
  const inRangeSet = new Set(inRangeKeys);
  const ayahProgress = cloneValue(state.ayahProgress || {});
  const transitionProgress = cloneValue(state.transitionProgress || {});

  inRangeKeys.forEach((key) => {
    const current = ayahProgress[key]?.repetitionCount || 0;
    const next = mode === "increment"
      ? clampCount(current + repetitionCount)
      : repetitionCount;
    ayahProgress[key] = { repetitionCount: next };
  });

  for (let index = 0; index < inRangeKeys.length - 1; index += 1) {
    const from = inRangeKeys[index];
    const to = inRangeKeys[index + 1];
    if (from.split(":")[0] !== to.split(":")[0]) continue;
    const key = buildTransitionKey(metadata, from, to);
    if (!key) continue;
    const current = transitionProgress[key]?.repetitionCount || 0;
    const next = mode === "increment"
      ? clampCount(current + transitionCount)
      : transitionCount;
    transitionProgress[key] = { repetitionCount: next };
  }

  return {
    ...state,
    ayahProgress,
    transitionProgress
  };
}
