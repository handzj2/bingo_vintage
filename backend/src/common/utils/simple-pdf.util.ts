/**
 * Minimal PDF builder (no external dependency).
 * Supports multi-page text reports for NPL / weekly sign-off exports.
 */
export function buildSimplePdf(title: string, lines: string[]): Buffer {
  const pageWidth = 612; // US Letter
  const pageHeight = 792;
  const margin = 40;
  const fontSize = 10;
  const lineHeight = 14;
  const maxLinesPerPage = Math.floor((pageHeight - margin * 2 - 40) / lineHeight);

  const pages: string[][] = [];
  let current: string[] = [];
  const header = title.slice(0, 100);
  const pushLine = (line: string) => {
    // wrap long lines
    const maxChars = 95;
    let s = line.replace(/[\r\n]+/g, ' ');
    while (s.length > maxChars) {
      current.push(s.slice(0, maxChars));
      s = s.slice(maxChars);
      if (current.length >= maxLinesPerPage) {
        pages.push(current);
        current = [];
      }
    }
    current.push(s);
    if (current.length >= maxLinesPerPage) {
      pages.push(current);
      current = [];
    }
  };

  pushLine(header);
  pushLine(`Generated: ${new Date().toISOString()}`);
  pushLine('');
  for (const line of lines) pushLine(line);
  if (current.length) pages.push(current);
  if (!pages.length) pages.push(['(empty report)']);

  const objects: string[] = [];
  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n');

  const pageIds: number[] = [];
  let nextId = 3;
  const contentIds: number[] = [];

  for (let p = 0; p < pages.length; p++) {
    const contentId = nextId++;
    contentIds.push(contentId);
    const pageId = nextId++;
    pageIds.push(pageId);

    let y = pageHeight - margin;
    const contentLines = [
      'BT',
      `/F1 ${fontSize} Tf`,
      `${margin} ${y} Td`,
      `${lineHeight} TL`,
    ];
    for (let i = 0; i < pages[p].length; i++) {
      const safe = pages[p][i]
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
      if (i === 0) contentLines.push(`(${safe}) Tj`);
      else contentLines.push(`T* (${safe}) Tj`);
    }
    contentLines.push('ET');
    const stream = contentLines.join('\n');
    objects.push(
      `${contentId} 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj\n`,
    );
    objects.push(
      `${pageId} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
        `/Contents ${contentId} 0 R /Resources << /Font << /F1 ${nextId} 0 R >> >> >>endobj\n`,
    );
  }

  const fontId = nextId++;
  objects.push(`${fontId} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n`);

  // Fix page resources to use fontId - rewrite page objects with correct font id
  // (font id known only after loop — patch)
  for (let i = 0; i < pageIds.length; i++) {
    const pageId = pageIds[i];
    const contentId = contentIds[i];
    const idx = objects.findIndex((o) => o.startsWith(`${pageId} 0 obj`));
    if (idx >= 0) {
      objects[idx] =
        `${pageId} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
        `/Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>endobj\n`;
    }
  }

  const kids = pageIds.map((id) => `${id} 0 R`).join(' ');
  objects.splice(
    1,
    0,
    `2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${pageIds.length} >>endobj\n`,
  );

  // Build xref
  let body = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, 'utf8'));
    body += obj;
  }
  const xrefPos = Buffer.byteLength(body, 'utf8');
  body += `xref\n0 ${offsets.length}\n`;
  body += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(body, 'utf8');
}
