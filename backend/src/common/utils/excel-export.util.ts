// Shared .xlsx builder for the reporting endpoints (daily payment
// accountability, upcoming due installments, cash drawer balancing).
//
// One canonical implementation so every export in the app looks and
// behaves the same way (bold dark header row, frozen header, a bold
// totals row when the report has one) rather than each report hand-
// rolling its own worksheet formatting.

import * as ExcelJS from 'exceljs';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  /** Render this column's values with a UGX-style thousands-separated number format */
  currency?: boolean;
}

export interface BuildExcelOptions {
  sheetName: string;
  columns: ExcelColumn[];
  rows: Record<string, any>[];
  /** Optional title line (e.g. "Daily Payment Accountability — 2026-08-18") shown above the header row */
  title?: string;
  /** Optional bold totals/summary row rendered after the data rows */
  totalsRow?: Record<string, any>;
}

export async function buildExcelBuffer(opts: BuildExcelOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Bingo Vintage';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(opts.sheetName, {
    views: [{ state: 'frozen', ySplit: opts.title ? 3 : 1 }],
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
    titleCell.font = { bold: true, size: 13 };
    cursor = 3;
  }

  const headerRow = sheet.getRow(cursor);
  opts.columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    cell.alignment = { vertical: 'middle' };
  });
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
      const val = opts.totalsRow![col.key];
      if (val !== undefined) {
        cell.value = val;
        cell.font = { bold: true };
        cell.border = { top: { style: 'thin' } };
        if (col.currency && typeof val === 'number') cell.numFmt = currencyFmt;
      }
    });
    row.commit();
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
}
