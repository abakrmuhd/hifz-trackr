export function getTrackDirection({ dx, dy, startThreshold }) {
  if (Math.abs(dx) <= startThreshold) return null;
  if (Math.abs(dx) <= Math.abs(dy)) return null;
  return dx < 0 ? "previous" : "next";
}

export function shouldCommitTrackMove({ dx, dy, commitDistance, verticalLimit }) {
  return Math.abs(dx) > commitDistance && Math.abs(dy) < verticalLimit;
}

export function shouldStartTrackGesture({ pointerType, startedOnSelectableText }) {
  return !(pointerType === "mouse" && startedOnSelectableText);
}

export function clampTrackOffset(dx, { maxOffset, dragRatio }) {
  const scaled = dx * dragRatio;
  return Math.max(-maxOffset, Math.min(maxOffset, scaled));
}

export function getTrackTargetPage({ currentPage, direction, pageCount }) {
  if (direction === "next") return currentPage < pageCount ? currentPage + 1 : null;
  if (direction === "previous") return currentPage > 1 ? currentPage - 1 : null;
  return null;
}

export function buildTrackPages({ currentPage, pageCount }) {
  return {
    previous: currentPage > 1 ? currentPage - 1 : null,
    current: currentPage,
    next: currentPage < pageCount ? currentPage + 1 : null
  };
}
