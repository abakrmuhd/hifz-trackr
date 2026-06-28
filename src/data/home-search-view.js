function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

export function renderHomeSearchResults(results) {
  if (!results.length) return "";
  return `
    <div class="search-results" role="listbox" aria-label="Navigation results">
      ${results.map((result) => `
        <button class="search-result" data-search-page="${result.page}" role="option">
          <span class="search-result-copy">
            <strong>${escapeHtml(result.primaryLabel)}</strong>
            ${result.secondaryLabel ? `<small>${escapeHtml(result.secondaryLabel)}</small>` : ""}
          </span>
          <span class="search-result-page" aria-label="Page ${result.page}">Page ${result.page}</span>
        </button>
      `).join("")}
    </div>
  `;
}
