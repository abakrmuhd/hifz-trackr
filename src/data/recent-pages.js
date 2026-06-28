export const MAX_RECENT_PAGES = 5;

export function limitRecentPages(recentPages = [], limit = MAX_RECENT_PAGES) {
  return recentPages.slice(0, limit);
}

export function pushRecentPage(recentPages = [], page, limit = MAX_RECENT_PAGES) {
  return limitRecentPages([page, ...recentPages.filter((item) => item !== page)], limit);
}
