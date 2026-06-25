import { getCountLevelClass } from "./metadata-logic.js";

export function buildRepetitionRingState({
  repetitionCount,
  transitionCount,
  repetitionThresholds,
  transitionCountThresholds
}) {
  const hasTransitionRing = transitionCount != null;
  return {
    repetitionCountLevel: getCountLevelClass(repetitionCount, repetitionThresholds),
    transitionCountLevel:
      transitionCount == null ? null : getCountLevelClass(transitionCount, transitionCountThresholds),
    hasTransitionRing,
    transitionArcDegrees: hasTransitionRing
      ? buildTransitionArcDegrees(transitionCount, transitionCountThresholds)
      : 0
  };
}

function buildTransitionArcDegrees(count, thresholds) {
  const target = buildTargetCount(count, thresholds);
  return Math.min(360, Math.round((count / target) * 360));
}

function buildTargetCount(count, thresholds) {
  if (count <= thresholds.weakMax) return thresholds.weakMax + 1;
  if (count <= thresholds.buildingMax) return thresholds.buildingMax + 1;
  if (count <= thresholds.strongMax) return thresholds.strongMax + 1;
  return thresholds.strongMax + 1;
}

export function buildRepetitionAriaLabel({
  ayahLabel,
  repetitionCountLevel,
  transitionCountLevel
}) {
  return transitionCountLevel
    ? `${ayahLabel}, repetition count ${repetitionCountLevel}, transition count ${transitionCountLevel}`
    : `${ayahLabel}, repetition count ${repetitionCountLevel}`;
}
