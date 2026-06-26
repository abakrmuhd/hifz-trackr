function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderGlyphItem(item, index, items) {
  const typeClass = escapeHtml(item.type || "word");
  const family = escapeHtml(item.fontFamily || "QCF2001");
  const glyph = escapeHtml(item.glyph || "");
  const space = index < items.length - 1 ? '<span class="space"> </span>' : "";
  return `<span class="${typeClass}" style="font-family: '${family}'">${glyph}</span>${space}`;
}

function renderGlyphs(glyphs = []) {
  return glyphs.map(renderGlyphItem).join("");
}

function renderAyahGroup(group, line, options) {
  const attrs = options.inert ? "" : ` ${options.buildAyahAttrs(group.key, group)}`;
  const className = options.buildGroupClass(group.key, group);
  return `<span class="${escapeHtml(className)}"${attrs}>${renderGlyphs(group.items || group.words || [])}</span>`;
}

function renderLine(line, options) {
  if (line.type === "surah-header") {
    return `<span class="line centered-line">${renderGlyphs(line.glyphs)}</span>`;
  }

  if (line.type === "basmala") {
    return `<span class="line centered-line">${renderGlyphs(line.glyphs)}</span>`;
  }

  const centered = line.centered ? " centered-line" : "";
  const justify = line.justify ? " justify" : "";
  const groups = (line.ayahGroups || []).map((group) => renderAyahGroup(group, line, options)).join("");
  return `<span class="line${centered}${justify}">${groups}</span>`;
}

export function renderQcf4Page(pageData, options) {
  const normalizedOptions = {
    inert: false,
    buildAyahAttrs: () => "",
    buildGroupClass: () => "ayah-group",
    ...options
  };
  const lines = (pageData.lines || []).map((line) => renderLine(line, normalizedOptions)).join("");

  return `
    <mushaf-page data-page="${escapeHtml(pageData.page)}" data-page-face="${escapeHtml(pageData.face || "")}">
      <mushaf-page-inner>
        <div class="page-content">
          <div class="ayah-chars">${lines}</div>
        </div>
      </mushaf-page-inner>
    </mushaf-page>
  `;
}
