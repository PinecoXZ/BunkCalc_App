export interface PdfReportRow {
  subjectName: string;
  attended: number;
  total: number;
  percentage: string;
  budgetLabel: string;
}

export interface PdfReportInput {
  title: string;
  subtitle: string;
  summaryLine: string;
  rows: PdfReportRow[];
  footer: string;
}

/** Sanitizes text for standard WinAnsi/Type1 Helvetica PDF strings. */
function toPdfSafeAscii(text: string): string {
  return text
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapePdfLiteral(text: string): string {
  return toPdfSafeAscii(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function truncateText(text: string, maxChars: number): string {
  const safe = toPdfSafeAscii(text);
  if (safe.length <= maxChars) return safe;
  return `${safe.slice(0, Math.max(0, maxChars - 3))}...`;
}

/**
 * Generates a valid multi-page PDF 1.4 binary document using standard Helvetica fonts.
 * Works 100% offline with zero external runtime dependencies.
 */
export function buildAttendanceReportPdf(input: PdfReportInput): Uint8Array {
  const PAGE_WIDTH = 595; // A4 portrait points
  const PAGE_HEIGHT = 842;
  const MARGIN_X = 42;
  const ROWS_PER_PAGE = 24;

  const rowChunks: PdfReportRow[][] = [];
  for (let i = 0; i < input.rows.length; i += ROWS_PER_PAGE) {
    rowChunks.push(input.rows.slice(i, i + ROWS_PER_PAGE));
  }
  if (rowChunks.length === 0) {
    rowChunks.push([]);
  }

  const pageStreams: string[] = rowChunks.map((chunk, pageIdx) => {
    const cmds: string[] = [];
    let y = PAGE_HEIGHT - 54;

    // Header
    cmds.push('0.145 0.388 0.922 rg');
    cmds.push(`BT /F2 20 Tf ${MARGIN_X} ${y} Td (${escapePdfLiteral(input.title)}) Tj ET`);
    y -= 18;

    cmds.push('0.392 0.455 0.545 rg');
    cmds.push(`BT /F1 10 Tf ${MARGIN_X} ${y} Td (${escapePdfLiteral(input.subtitle)}) Tj ET`);
    y -= 18;

    if (pageIdx === 0 && input.summaryLine) {
      cmds.push('0.118 0.161 0.231 rg');
      cmds.push(`BT /F2 11 Tf ${MARGIN_X} ${y} Td (${escapePdfLiteral(input.summaryLine)}) Tj ET`);
      y -= 24;
    } else {
      y -= 10;
    }

    // Table header bar
    const tableWidth = PAGE_WIDTH - MARGIN_X * 2;
    cmds.push('0.945 0.961 0.976 rg');
    cmds.push(`${MARGIN_X} ${y - 6} ${tableWidth} 22 re f`);
    cmds.push('0.886 0.910 0.941 RG 0.8 w');
    cmds.push(`${MARGIN_X} ${y - 6} ${tableWidth} 22 re S`);

    cmds.push('0.278 0.333 0.412 rg');
    cmds.push(`BT /F2 9 Tf ${MARGIN_X + 8} ${y + 2} Td (Subject) Tj ET`);
    cmds.push(`BT /F2 9 Tf ${MARGIN_X + 240} ${y + 2} Td (Attended / Total) Tj ET`);
    cmds.push(`BT /F2 9 Tf ${MARGIN_X + 355} ${y + 2} Td (Percentage) Tj ET`);
    cmds.push(`BT /F2 9 Tf ${MARGIN_X + 430} ${y + 2} Td (Bunk Budget) Tj ET`);
    y -= 26;

    if (chunk.length === 0) {
      cmds.push('0.392 0.455 0.545 rg');
      cmds.push(`BT /F1 10 Tf ${MARGIN_X + 8} ${y} Td (No subjects recorded.) Tj ET`);
    } else {
      chunk.forEach((row) => {
        cmds.push('0.886 0.910 0.941 RG 0.5 w');
        cmds.push(`${MARGIN_X} ${y - 7} m ${MARGIN_X + tableWidth} ${y - 7} l S`);

        cmds.push('0.118 0.161 0.231 rg');
        cmds.push(`BT /F2 10 Tf ${MARGIN_X + 8} ${y} Td (${escapePdfLiteral(truncateText(row.subjectName, 36))}) Tj ET`);
        cmds.push('0.278 0.333 0.412 rg');
        cmds.push(`BT /F1 10 Tf ${MARGIN_X + 240} ${y} Td (${escapePdfLiteral(`${row.attended} / ${row.total}`)}) Tj ET`);
        cmds.push(`BT /F2 10 Tf ${MARGIN_X + 355} ${y} Td (${escapePdfLiteral(row.percentage)}) Tj ET`);
        cmds.push(`BT /F1 10 Tf ${MARGIN_X + 430} ${y} Td (${escapePdfLiteral(truncateText(row.budgetLabel, 18))}) Tj ET`);

        y -= 24;
      });
    }

    // Footer
    const pageNote = rowChunks.length > 1 ? ` - Page ${pageIdx + 1}/${rowChunks.length}` : '';
    cmds.push('0.580 0.639 0.722 rg');
    cmds.push(`BT /F1 9 Tf ${MARGIN_X} 34 Td (${escapePdfLiteral(`${input.footer}${pageNote}`)}) Tj ET`);

    return cmds.join('\n');
  });

  // Object layout:
  // 1: Catalog
  // 2: Pages
  // 3: Font Helvetica (/F1)
  // 4: Font Helvetica-Bold (/F2)
  // 5..: Alternating Page and Content stream objects
  const objects: string[] = [];
  const pageObjIds: number[] = [];

  pageStreams.forEach((_, idx) => {
    const pageObjId = 5 + idx * 2;
    pageObjIds.push(pageObjId);
  });

  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>\nendobj\n`
  );
  objects.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');

  pageStreams.forEach((stream, idx) => {
    const pageObjId = 5 + idx * 2;
    const contentObjId = pageObjId + 1;
    objects.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`
    );
    objects.push(
      `${contentObjId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
    );
  });

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const header = encoder.encode('%PDF-1.4\n');
  chunks.push(header);

  let byteOffset = header.length;
  const offsets: number[] = [0]; // object 0

  for (const obj of objects) {
    offsets.push(byteOffset);
    const bytes = encoder.encode(obj);
    chunks.push(bytes);
    byteOffset += bytes.length;
  }

  const xrefStart = byteOffset;
  const xrefLines = [`xref\n0 ${offsets.length}\n`, '0000000000 65535 f \n'];
  for (let i = 1; i < offsets.length; i++) {
    xrefLines.push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  const trailer = `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  chunks.push(encoder.encode(xrefLines.join('') + trailer));

  const totalBytes = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalBytes);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}
