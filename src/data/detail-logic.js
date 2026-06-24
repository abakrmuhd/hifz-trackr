import { getStrengthClass } from "./metadata-logic.js";

export function describeDetailTarget(detailTarget, options) {
  if (detailTarget.kind === "transition") {
    const count = options.getTransitionCount(detailTarget.key);
    const strength = getStrengthClass(count, options.settings.transitionThresholds);
    return {
      title: options.labelTransition(detailTarget.key),
      mode: "transition",
      canBookmark: false,
      bookmarked: false,
      headerBookmarkLabel: null,
      transitionOnly: {
        label: "Transition count",
        count,
        strength,
        target: buildTargetCount(count, options.settings.transitionThresholds)
      }
    };
  }

  const ayahCount = options.getAyahCount(detailTarget.key);
  const ayahStrength = getStrengthClass(ayahCount, options.settings.ayahThresholds);
  const incoming = options.resolveIncomingTransition
    ? options.resolveIncomingTransition(detailTarget.key)
    : null;
  const bookmarked = options.isAyahBookmarked(detailTarget.key);

  return {
    title: options.labelAyah(detailTarget.key),
    mode: "ayah",
    canBookmark: true,
    bookmarked,
    headerBookmarkLabel: bookmarked ? "Remove ayah bookmark" : "Bookmark ayah",
    ayah: {
      label: "Repetition count",
      count: ayahCount,
      strength: ayahStrength,
      target: buildTargetCount(ayahCount, options.settings.ayahThresholds)
    },
    transition: incoming
      ? buildIncomingTransitionDetail(incoming, options)
      : {
          available: false,
          label: "Transition count",
          message: "No incoming transition"
        }
  };
}

function buildIncomingTransitionDetail(incoming, options) {
  const count = options.getTransitionCount(incoming.key);
  const strength = getStrengthClass(count, options.settings.transitionThresholds);
  return {
    available: true,
    path: incoming.path,
    label: "Transition count",
    count,
    strength,
    target: buildTargetCount(count, options.settings.transitionThresholds)
  };
}

function buildTargetCount(count, thresholds) {
  if (count <= thresholds.weakMax) return thresholds.weakMax + 1;
  if (count <= thresholds.buildingMax) return thresholds.buildingMax + 1;
  if (count <= thresholds.strongMax) return thresholds.strongMax + 1;
  return thresholds.strongMax + 1;
}
