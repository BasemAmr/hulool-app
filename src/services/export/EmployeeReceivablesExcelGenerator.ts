// src/services/export/EmployeeReceivablesExcelGenerator.ts
import type { Workbook, Cell, Borders } from 'exceljs';
import { setupWorksheet, addReportHeader, COLORS, FONTS } from './excelStyles';
import type { EmployeeReceivablesReportData } from './exportTypes';

/**
 * Palette copied from the employee dashboard panel CSS tokens (light theme) so the
 * spreadsheet reads like the panel it was exported from:
 *   --token-card-badge-amount-due-bg/-text/-border  -> header + amount + totals
 *   --token-status-danger-bg/-text/-border          -> the "صرف" badge
 *   --token-bg-surface / --token-bg-surface-hover   -> row striping
 *   --token-report-card-text                        -> client name
 *   --token-text-primary                            -> description (black)
 */
const PANEL = {
  amountBg: 'FFFFF1F2',
  amountText: 'FF9F1239',
  amountBorder: 'FFFDA4AF',
  dangerBg: 'FFFEF2F2',
  dangerText: 'FFB91C1C',
  dangerBorder: 'FFFECACA',
  neutralBg: 'FFF1F5F9',
  neutralText: 'FF1E293B',
  neutralBorder: 'FFE2E8F0',
  rowBase: 'FFFFFFFF',
  rowAlt: 'FFE7F0FE', // color-mix(brand-500 12%, white)
  clientText: 'FF0C4A6E',
  descriptionText: 'FF000000',
  border: COLORS.border,
};

const panelBorder = (): Partial<Borders> => ({
  top: { style: 'thin', color: { argb: PANEL.border } },
  left: { style: 'thin', color: { argb: PANEL.border } },
  bottom: { style: 'thin', color: { argb: PANEL.border } },
  right: { style: 'thin', color: { argb: PANEL.border } },
});

/**
 * Generate the "المستحقات عند العملاء" spreadsheet from the employee dashboard panel.
 * Columns and their order mirror the panel exactly:
 *   العميل | نوع الحركة | الوصف | المستحق
 * plus the panel's totals row (اجمالي المبالغ المستحقة).
 */
export function generateEmployeeReceivablesExcel(
  workbook: Workbook,
  data: EmployeeReceivablesReportData
) {
  const { items, total_outstanding } = data;
  const worksheet = workbook.addWorksheet('المستحقات عند العملاء');

  setupWorksheet(worksheet);

  const contentStartRow = addReportHeader(worksheet, 'المستحقات عند العملاء', 4);

  // Column order = panel order. The sheet is RTL (setupWorksheet), so the first
  // column renders on the right, exactly like the panel's first <th>.
  // Setting `worksheet.columns[].header` here would overwrite row 1 and destroy
  // the report title already written by addReportHeader(). Set widths directly.
  worksheet.getColumn(1).width = 30;
  worksheet.getColumn(2).width = 10;
  worksheet.getColumn(3).width = 34;
  worksheet.getColumn(4).width = 14;

  // Header row — styled like the panel's thead.
  const headerRow = worksheet.getRow(contentStartRow);
  headerRow.values = ['العميل', 'نوع الحركة', 'الوصف', 'المستحق'];
  headerRow.eachCell(cell => {
    cell.style = {
      font: { ...FONTS.header, color: { argb: PANEL.amountText } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PANEL.amountBg } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin', color: { argb: PANEL.amountBorder } },
        left: { style: 'thin', color: { argb: PANEL.amountBorder } },
        bottom: { style: 'thin', color: { argb: PANEL.amountBorder } },
        right: { style: 'thin', color: { argb: PANEL.amountBorder } },
      },
    };
  });
  headerRow.height = 22;

  // Data rows — same order and same striping as the panel.
  let currentRow = contentStartRow + 1;
  items.forEach((item, index) => {
    const row = worksheet.getRow(currentRow);
    row.values = [
      item.client_name || '',
      item.transaction_type || '',
      item.description || '',
      Number(item.remaining_amount) || 0,
    ];

    const isAlt = index % 2 === 1;
    const rowFill = isAlt ? PANEL.rowAlt : PANEL.rowBase;

    // العميل — bold, panel's client-name colour.
    row.getCell(1).style = {
      font: { ...FONTS.default, bold: true, color: { argb: PANEL.clientText } },
      alignment: { horizontal: 'right', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } },
      border: panelBorder(),
    };

    // نوع الحركة — same badge colours the panel uses for the type chip.
    const typeCell = row.getCell(2);
    const isPayout = item.transaction_type === 'صرف';
    typeCell.style = {
      font: { ...FONTS.default, bold: true, size: 9, color: { argb: isPayout ? PANEL.dangerText : PANEL.neutralText } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: isPayout ? PANEL.dangerBg : PANEL.neutralBg } },
      border: {
        top: { style: 'thin', color: { argb: isPayout ? PANEL.dangerBorder : PANEL.neutralBorder } },
        left: { style: 'thin', color: { argb: isPayout ? PANEL.dangerBorder : PANEL.neutralBorder } },
        bottom: { style: 'thin', color: { argb: isPayout ? PANEL.dangerBorder : PANEL.neutralBorder } },
        right: { style: 'thin', color: { argb: isPayout ? PANEL.dangerBorder : PANEL.neutralBorder } },
      },
    };

    // الوصف — black, like the panel.
    row.getCell(3).style = {
      font: { ...FONTS.default, color: { argb: PANEL.descriptionText } },
      alignment: { horizontal: 'right', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } },
      border: panelBorder(),
    };

    // المستحق — the panel's amount-due cell: tinted background, red bold text.
    row.getCell(4).style = {
      font: { ...FONTS.default, bold: true, color: { argb: PANEL.amountText } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PANEL.amountBg } },
      border: panelBorder(),
      numFmt: '#,##0',
    };

    row.height = 20;
    currentRow++;
  });

  // Totals row — the panel's tfoot: label spanning the first columns, grand total last.
  const totalsRow = worksheet.getRow(currentRow);
  totalsRow.values = ['اجمالي المبالغ المستحقة', '', '', Number(total_outstanding) || 0];
  worksheet.mergeCells(currentRow, 1, currentRow, 3);

  const labelCell: Cell = totalsRow.getCell(1);
  labelCell.style = {
    font: { ...FONTS.default, bold: true, color: { argb: PANEL.amountText } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PANEL.amountBg } },
    border: {
      top: { style: 'thin', color: { argb: PANEL.amountBorder } },
      left: { style: 'thin', color: { argb: PANEL.amountBorder } },
      bottom: { style: 'thin', color: { argb: PANEL.amountBorder } },
      right: { style: 'thin', color: { argb: PANEL.amountBorder } },
    },
  };

  const totalCell = totalsRow.getCell(4);
  // A real formula makes the workbook self-checking: SUM(amount rows) is always
  // the value in the styled total cell, instead of a disconnected hard-coded number.
  totalCell.value = items.length > 0
    ? {
        formula: `SUM(D${contentStartRow + 1}:D${currentRow - 1})`,
        result: Number(total_outstanding) || 0,
      }
    : 0;
  totalCell.style = {
    font: { ...FONTS.default, bold: true, color: { argb: PANEL.amountText } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PANEL.amountBg } },
    border: {
      top: { style: 'thin', color: { argb: PANEL.amountBorder } },
      left: { style: 'thin', color: { argb: PANEL.amountBorder } },
      bottom: { style: 'thin', color: { argb: PANEL.amountBorder } },
      right: { style: 'thin', color: { argb: PANEL.amountBorder } },
    },
    numFmt: '#,##0',
  };
  totalsRow.height = 22;

  return worksheet;
}
