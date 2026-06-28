import { getJuzForPage } from "./juz.js";
import { resolveOutgoingTransition } from "./metadata-logic.js";

const MASTERED_JUZ = new Set([1, 30]);
const IN_PROGRESS_JUZ = new Set([2, 29]);
const MIXED_JUZ = new Set([15]);
const SHOWCASE_PAGE_TIERS = new Map([
  [350, "mastered"],
  [351, "strong"],
  [410, "building"],
  [520, "weak"]
]);

function cloneValue(value) {
  return globalThis.structuredClone
    ? globalThis.structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function getOrderedPages(metadata) {
  return Object.keys(metadata?.pages || {})
    .map(Number)
    .filter((page) => Number.isInteger(page) && page > 0)
    .sort((a, b) => a - b);
}

function getPageTier(page) {
  if (SHOWCASE_PAGE_TIERS.has(page)) return SHOWCASE_PAGE_TIERS.get(page);

  const [juzNumber, startPage] = getJuzForPage(page);
  const pageOffset = page - startPage;

  if (MASTERED_JUZ.has(juzNumber)) return "mastered";

  if (IN_PROGRESS_JUZ.has(juzNumber)) {
    const cycle = ["weak", "building", "strong", "building"];
    return cycle[pageOffset % cycle.length];
  }

  if (MIXED_JUZ.has(juzNumber)) {
    const cycle = ["mixed", "weak", "building", "empty", "strong"];
    return cycle[pageOffset % cycle.length];
  }

  return "empty";
}

function buildAyahCounts(page, ayahKeys, tier) {
  switch (tier) {
    case "mastered":
      return ayahKeys.map((_, index) => 48 + ((page + index) % 7));
    case "strong":
      return ayahKeys.map((_, index) => 26 + ((page + index) % 8));
    case "building":
      return ayahKeys.map((_, index) => 11 + ((page + index) % 7));
    case "weak":
      return ayahKeys.map((_, index) => 2 + ((page + index) % 6));
    case "mixed":
      return ayahKeys.map((_, index) => {
        if (index === 0) return 0;
        if (index === ayahKeys.length - 1) return 44;
        return 4 + ((index - 1) % 2) * 3;
      });
    default:
      return ayahKeys.map(() => 0);
  }
}

function buildTransitionCount(page, index, tier) {
  switch (tier) {
    case "mastered":
      return 24 + ((page + index) % 10);
    case "strong":
      return 13 + ((page + index) % 8);
    case "building":
      return 6 + ((page + index) % 7);
    case "weak":
      return 1 + ((page + index) % 4);
    case "mixed":
      return [0, 3, 9, 22][index % 4];
    default:
      return 0;
  }
}

function buildPracticeEvents({ ayahProgress, transitionProgress, metadata }) {
  const startedAt = Date.parse("2026-01-01T00:00:00.000Z");
  const events = [];
  let index = 0;

  Object.entries(ayahProgress).forEach(([key, value]) => {
    if (!value.repetitionCount) return;
    events.push({
      id: `seed-ayah-${index + 1}`,
      type: "ayah-increment",
      timestamp: new Date(startedAt + index * 60_000).toISOString(),
      ayahKey: key,
      delta: 1,
      page: metadata.ayahToPage?.[key] || null
    });
    index += 1;
  });

  Object.entries(transitionProgress).forEach(([key, value]) => {
    if (!value.repetitionCount) return;
    const [, from, to] = key.split("|");
    events.push({
      id: `seed-transition-${index + 1}`,
      type: "transition-increment",
      timestamp: new Date(startedAt + index * 60_000).toISOString(),
      transitionKey: key,
      delta: 1,
      page: Number(key.split("|")[0]),
      from,
      to
    });
    index += 1;
  });

  return events;
}

export function buildDeveloperSeedState(baseState, metadata) {
  const nextState = cloneValue(baseState);
  const ayahProgress = {};
  const transitionProgress = {};
  const bookmarks = [];
  const recentPages = [];
  const orderedPages = getOrderedPages(metadata);

  orderedPages.forEach((page) => {
    const ayahKeys = metadata.pages[String(page)]?.ayahKeys || [];
    const tier = getPageTier(page);
    const counts = buildAyahCounts(page, ayahKeys, tier);

    ayahKeys.forEach((key, index) => {
      if (counts[index] > 0) ayahProgress[key] = { repetitionCount: counts[index] };

      const transition = resolveOutgoingTransition(key, metadata);
      if (!transition || transition.page !== page) return;
      const transitionCount = buildTransitionCount(page, index, tier);
      if (transitionCount > 0) transitionProgress[transition.key] = { repetitionCount: transitionCount };
    });

    if (["mastered", "strong", "mixed", "building", "weak"].includes(tier) && recentPages.length < 5) {
      recentPages.push(page);
    }
    if (["mastered", "mixed", "strong"].includes(tier) && bookmarks.length < 3) {
      bookmarks.push(page);
    }
  });

  const ayahBookmarks = recentPages
    .flatMap((page) => metadata.pages[String(page)]?.ayahKeys?.slice(0, 1) || [])
    .slice(0, 3)
    .map((key) => ({ key, page: metadata.ayahToPage?.[key] || 1 }));

  const lastPage = recentPages[0] || nextState.lastPage || 1;
  const practiceEvents = buildPracticeEvents({ ayahProgress, transitionProgress, metadata });

  return {
    ...nextState,
    ayahProgress,
    transitionProgress,
    lastPage,
    lastRoute: { screen: "reading", tab: "progress", page: lastPage, target: null },
    recentPages,
    pageBookmarks: bookmarks,
    ayahBookmarks,
    practiceEvents
  };
}
