import { getCountLevelClass } from "./metadata-logic.js";

export function describeDetailTarget(detailTarget, options) {
  if (detailTarget.kind === "transition") {
    const count = options.getTransitionCount(detailTarget.key);
    const countLevel = getCountLevelClass(count, options.settings.transitionCountThresholds);
    return {
      title: options.labelTransition(detailTarget.key),
      mode: "transition",
      canBookmark: false,
      bookmarked: false,
      headerBookmarkLabel: null,
      transitionOnly: {
        label: "Transition count",
        count,
        countLevel,
        target: buildTargetCount(count, options.settings.transitionCountThresholds)
      }
    };
  }

  const repetitionCount = options.getRepetitionCount(detailTarget.key);
  const repetitionCountLevel = getCountLevelClass(repetitionCount, options.settings.repetitionThresholds);
  const outgoing = options.resolveOutgoingTransition
    ? options.resolveOutgoingTransition(detailTarget.key)
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
      count: repetitionCount,
      countLevel: repetitionCountLevel,
      target: buildTargetCount(repetitionCount, options.settings.repetitionThresholds)
    },
    transition: outgoing
      ? buildOutgoingTransitionDetail(outgoing, options)
      : {
          available: false,
          label: "Transition count",
          message: "No outgoing transition"
        }
  };
}

function buildOutgoingTransitionDetail(outgoing, options) {
  const count = options.getTransitionCount(outgoing.key);
  const countLevel = getCountLevelClass(count, options.settings.transitionCountThresholds);
  return {
    available: true,
    path: outgoing.path,
    label: "Transition count",
    count,
    countLevel,
    target: buildTargetCount(count, options.settings.transitionCountThresholds)
  };
}

function buildTargetCount(count, thresholds) {
  if (count <= thresholds.weakMax) return thresholds.weakMax + 1;
  if (count <= thresholds.buildingMax) return thresholds.buildingMax + 1;
  if (count <= thresholds.strongMax) return thresholds.strongMax + 1;
  return thresholds.strongMax + 1;
}
