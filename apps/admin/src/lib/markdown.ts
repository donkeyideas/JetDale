// ============================================================
// Jetdale — Minimal Markdown to HTML Converter
// Handles ## headers, **bold**, - lists, > blockquotes, tables.
// No dependencies. Used for rendering artifact content.
// ============================================================

export function markdownToHtml(md: string): string {
  if (!md) return '';

  const lines = md.split('\n');
  const html: string[] = [];
  let inList = false;
  let inTable = false;
  let tableHeaderDone = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Close list if needed
    if (inList && !trimmed.startsWith('- ') && !trimmed.startsWith('* ')) {
      html.push('</ul>');
      inList = false;
    }

    // Table detection: line contains | and is not a header/list/blockquote
    const isTableRow = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|');
    const isSeparator = isTableRow && /^\|[\s\-:|]+\|$/.test(trimmed);

    if (isTableRow) {
      if (!inTable) {
        html.push('<table>');
        inTable = true;
        tableHeaderDone = false;
      }

      if (isSeparator) {
        // This is the --- separator between header and body — skip it, close thead, open tbody
        tableHeaderDone = true;
        html.push('</thead><tbody>');
        continue;
      }

      const cells = trimmed
        .slice(1, -1) // remove leading/trailing |
        .split('|')
        .map((c) => c.trim());

      if (!tableHeaderDone) {
        // First row = header
        html.push('<thead><tr>');
        for (const cell of cells) {
          html.push(`<th>${inline(cell)}</th>`);
        }
        html.push('</tr>');
      } else {
        html.push('<tr>');
        for (const cell of cells) {
          html.push(`<td>${inline(cell)}</td>`);
        }
        html.push('</tr>');
      }
      continue;
    }

    // Close table if we hit a non-table line
    if (inTable) {
      if (tableHeaderDone) html.push('</tbody>');
      html.push('</table>');
      inTable = false;
      tableHeaderDone = false;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      html.push(`<h3>${inline(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith('## ')) {
      html.push(`<h2>${inline(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith('# ')) {
      html.push(`<h1>${inline(trimmed.slice(2))}</h1>`);
    }
    // Blockquote
    else if (trimmed.startsWith('> ')) {
      html.push(`<blockquote>${inline(trimmed.slice(2))}</blockquote>`);
    }
    // List item
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) { html.push('<ul>'); inList = true; }
      html.push(`<li>${inline(trimmed.slice(2))}</li>`);
    }
    // Numbered list
    else if (/^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s/, '');
      if (!inList) { html.push('<ul>'); inList = true; }
      html.push(`<li>${inline(text)}</li>`);
    }
    // Empty line
    else if (trimmed === '') {
      // skip
    }
    // Paragraph
    else {
      html.push(`<p>${inline(trimmed)}</p>`);
    }
  }

  if (inList) html.push('</ul>');
  if (inTable) {
    if (tableHeaderDone) html.push('</tbody>');
    html.push('</table>');
  }

  return html.join('\n');
}

// Inline formatting: bold, italic, code
function inline(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}
