// Shared .xlsx builder for reporting endpoints.
// Title row + bold header row + optional subtitle/meta + totals.

import * as ExcelJS from 'exceljs';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  /** UGX-style thousands-separated number format */
  currency?: boolean;
}

export interface BuildExcelOptions {
  sheetName: string;
  columns: ExcelColumn[];
  rows: Record<string, any>[];
  /** Main report title (row 1, merged) */
  title?: string;
  /** Second line under title: definitions, timezone, tenant scope */
  subtitle?: string;
  totalsRow?: Record<string, any>;
}

export async function buildExcelBuffer(opts: BuildExcelOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Bingo Vintage Lending System';
  workbook.created = new Date();
  workbook.company = 'Bingo Vintage';

  const hasTitle = !!opts.title;
  const hasSubtitle = !!opts.subtitle;
  const headerOffset = (hasTitle ? 1 : 0) + (hasSubtitle ? 1 : 0) + (hasTitle || hasSubtitle ? 1 : 0);
  // title, optional subtitle, blank, then header → freeze below header
  const freezeAt = headerOffset + 1;

  const sheet = workbook.addWorksheet(opts.sheetName, {
    views: [{ state: 'frozen', ySplit: freezeAt }],
  });

  const colCount = Math.max(opts.columns.length, 1);
  opts.columns.forEach((col, i) => {
    sheet.getColumn(i + 1).width = col.width ?? 18;
  });

  let cursor = 1;

  if (opts.title) {
    sheet.mergeCells(1, 1, 1, colCount);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = opts.title;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF111827' } };
    titleCell.alignment = { vertical: 'middle' };
    cursor = 2;
  }

  if (opts.subtitle) {
    sheet.mergeCells(cursor, 1, cursor, colCount);
    const sub = sheet.getCell(cursor, 1);
    sub.value = opts.subtitle;
    sub.font = { size: 10, italic: true, color: { argb: 'FF4B5563' } };
    cursor += 1;
  }

  if (opts.title || opts.subtitle) {
    cursor += 1; // blank row before headers
  }

  const headerRow = sheet.getRow(cursor);
  opts.columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF111827' } },
    };
  });
  headerRow.height = 22;
  headerRow.commit();
  cursor++;

  const currencyFmt = '#,##0';
  for (const r of opts.rows) {
    const row = sheet.getRow(cursor);
    opts.columns.forEach((col, i) => {
      const cell = row.getCell(i + 1);
      cell.value = r[col.key] ?? '';
      if (col.currency && typeof cell.value === 'number') {
        cell.numFmt = currencyFmt;
      }
    });
    row.commit();
    cursor++;
  }

  if (opts.totalsRow) {
    const row = sheet.getRow(cursor);
    opts.columns.forEach((col, i) => {
      const cell = row.getCell(i + 1);
      const v = opts.totalsRow![col.key];
      if (v !== undefined && v !== null) {
        cell.value = v;
        cell.font = { bold: true };
        if (col.currency && typeof v === 'number') {
          cell.numFmt = currencyFmt;
        }
      }
    });
    row.commit();
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
