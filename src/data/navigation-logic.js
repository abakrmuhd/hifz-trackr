export function normalizeSearchText(value = "") {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function buildSurahTerms(surah) {
  const values = [
    surah.arabicName,
    surah.transliteratedName,
    surah.englishName,
    ...(surah.aliases || [])
  ];

  const terms = new Set();
  values.forEach((value) => {
    const normalized = normalizeSearchText(value);
    if (!normalized) return;
    terms.add(normalized);
    terms.add(normalized.replace(/\s+/g, ""));
    if (normalized.startsWith("al ")) terms.add(normalized.slice(3));
  });
  return [...terms];
}

function scoreSurahQuery(query, surah) {
  const terms = buildSurahTerms(surah);
  let best = Number.POSITIVE_INFINITY;

  for (const term of terms) {
    if (!term) continue;
    if (query === term) best = Math.min(best, 0);
    else if (query === term.replace(/\s+/g, "")) best = Math.min(best, 0);
    else if (query.startsWith(term) || term.startsWith(query)) best = Math.min(best, 1);
    else if (query.includes(term) || term.includes(query)) best = Math.min(best, 2);
  }

  return Number.isFinite(best) ? best : null;
}

function buildPageResult(page) {
  return {
    kind: "page",
    page,
    primaryLabel: `Page ${page}`,
    secondaryLabel: null
  };
}

function buildSurahResult(surah) {
  return {
    kind: "surah",
    page: surah.startPage,
    primaryLabel: surah.transliteratedName || surah.englishName || `Surah ${surah.number}`,
    secondaryLabel: `Surah ${surah.number}`
  };
}

function buildJuzResult(juz) {
  return {
    kind: "juz",
    page: juz.startPage,
    primaryLabel: `Juz ${juz.number}`,
    secondaryLabel: `Pages ${juz.startPage}-${juz.endPage}`
  };
}

export function searchNavigationTargets(value, metadata, pageCount) {
  const text = normalizeSearchText(value);
  if (!text) return [];

  const juzMatch = text.match(/\bjuz\s+(\d{1,2})\b/);
  if (juzMatch) {
    const number = Number(juzMatch[1]);
    const juz = metadata.juz.find((item) => item.number === number);
    return juz ? [buildJuzResult(juz)] : [];
  }

  const surahMatch = text.match(/\bsurah\s+(\d{1,3})\b/);
  if (surahMatch) {
    const number = Number(surahMatch[1]);
    const surah = metadata.surahs.find((item) => item.number === number);
    return surah ? [buildSurahResult(surah)] : [];
  }

  const pageMatch = text.match(/\bpage\s+(\d{1,3})\b/);
  if (pageMatch) {
    const page = Number(pageMatch[1]);
    return page >= 1 && page <= pageCount ? [buildPageResult(page)] : [];
  }

  const results = [];

  if (/^\d{1,3}$/.test(text)) {
    const page = Number(text);
    if (page >= 1 && page <= pageCount) {
      results.push({ rank: 0, result: buildPageResult(page) });
    }
    const juz = metadata.juz.find((item) => item.number === page);
    if (juz) {
      results.push({ rank: 20, result: buildJuzResult(juz) });
    }
  }

  for (const surah of metadata.surahs) {
    const score = scoreSurahQuery(text, surah);
    if (score === null) continue;
    results.push({ rank: 10 + score, result: buildSurahResult(surah) });
  }

  return results
    .sort((a, b) => a.rank - b.rank || a.result.page - b.result.page)
    .map((item) => item.result)
    .slice(0, 8);
}

export function resolveNavigationTarget(value, metadata, pageCount) {
  const result = searchNavigationTargets(value, metadata, pageCount)[0];
  return result ? { page: result.page, kind: result.kind } : null;
}
