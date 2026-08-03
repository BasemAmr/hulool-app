import type { Workbook, BorderStyle } from 'exceljs';
import {
  setupWorksheet,
  addReportHeader,
  styles,
  applyStandardBalanceFormatting,
  COLORS
} from './excelStyles';
import type { TreasuryAccountExportReportData, ExportOptions } from './exportTypes';

function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  const cleanDate = dateStr.split(' ')[0].split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year && month && day) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }
  return cleanDate;
}

export function generateTreasuryAccountExcel(
  workbook: Workbook,
  data: TreasuryAccountExportReportData,
  options?: ExportOptions
) {
  const { title, items, period } = data;
  const sheetName = title.replace(/[\\/*?:\[\]]/g, '').substring(0, 31);
  const worksheet = workbook.addWorksheet(sheetName);

  setupWorksheet(worksheet);

  // Add report header
  const numColumns = 6;
  const contentStartRow = addReportHeader(worksheet, title, numColumns, {
    includeDateInTitle: true,
    skipSpacer: true,
  });

  // Add period info if available
  if (period && (period.from || period.to)) {
    const periodStr = `الفترة: ${period.from ? `من ${period.from}` : ''} ${period.to ? `إلى ${period.to}` : ''}`;
    const periodRow = worksheet.addRow([periodStr]);
    const periodRowIndex = worksheet.lastRow ? worksheet.lastRow.number : contentStartRow + 1;
    worksheet.mergeCells(periodRowIndex, 1, periodRowIndex, numColumns);
    periodRow.getCell(1).style = {
      font: { bold: true, size: 12 },
      alignment: { horizontal: 'center' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } },
    };
  }

  // Table headers start directly on the next row without empty spacer rows
  const tableStartRow = worksheet.lastRow ? worksheet.lastRow.number + 1 : 2;

  // Table headers (Right-to-Left Arabic context)
  const headerRow = worksheet.getRow(tableStartRow);
  headerRow.values = [
    'التاريخ',
    'نوع الحركة',
    'البيان',
    'مدين (+)',
    'دائن (-)',
    'الرصيد الجاري'
  ];
  headerRow.eachCell(cell => {
    cell.style = styles.mainHeader;
  });
  headerRow.height = 30;

  const thinStyle: BorderStyle = 'thin';
  const mediumStyle: BorderStyle = 'medium';

  // Add items
  let currentRowNum = tableStartRow + 1;
  items.forEach(item => {
    const debitVal = Number(item.debit || 0);
    const creditVal = Number(item.credit || 0);
    const balanceVal = Number(item.balance || 0);

    const isReceipt = debitVal > 0 || item.transaction_type === 'قبض' || item.transaction_type === 'CASHBOX_RECEIPT';
    const typeLabel = isReceipt ? 'قبض' : 'صرف';

    const row = worksheet.addRow([
      formatDateDDMMYYYY(item.transaction_date),
      typeLabel,
      item.description || '—',
      debitVal,
      creditVal,
      balanceVal
    ]);

    row.height = 22;

    const isEvenRow = (currentRowNum - tableStartRow) % 2 === 0;
    const baseCellBorder = {
      top: { style: thinStyle, color: { argb: COLORS.border } },
      left: { style: thinStyle, color: { argb: COLORS.border } },
      bottom: { style: thinStyle, color: { argb: COLORS.border } },
      right: { style: thinStyle, color: { argb: COLORS.border } },
    };

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber === 1) {
        // Date column: DD/MM/YYYY centered
        cell.style = {
          font: { name: 'Calibri', size: 11 },
          alignment: { horizontal: 'center', vertical: 'middle' },
          fill: isEvenRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowLight } } : undefined,
          border: baseCellBorder
        };
      } else if (colNumber === 2) {
        // Type column: "قبض" (green bg, dark green text) or "صرف" (red bg, dark red text)
        if (isReceipt) {
          cell.style = {
            font: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF006100' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } },
            alignment: { horizontal: 'center', vertical: 'middle' },
            border: baseCellBorder
          };
        } else {
          cell.style = {
            font: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF9C0006' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } },
            alignment: { horizontal: 'center', vertical: 'middle' },
            border: baseCellBorder
          };
        }
      } else if (colNumber === 3) {
        // Description column: Right aligned for Arabic text
        cell.style = {
          font: { name: 'Calibri', size: 11 },
          alignment: { horizontal: 'right', vertical: 'middle', wrapText: true },
          fill: isEvenRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowLight } } : undefined,
          border: baseCellBorder
        };
      } else if (colNumber === 4) {
        // Debit column: Amount only (no currency formatter)
        const hasDebit = debitVal > 0;
        cell.style = {
          font: {
            name: 'Calibri',
            size: 11,
            bold: hasDebit,
            color: hasDebit ? { argb: 'FF006100' } : undefined
          },
          numFmt: '#,##0.00',
          alignment: { horizontal: 'center', vertical: 'middle' },
          fill: hasDebit
            ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } }
            : (isEvenRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowLight } } : undefined),
          border: baseCellBorder
        };
      } else if (colNumber === 5) {
        // Credit column: Amount only (no currency formatter)
        const hasCredit = creditVal > 0;
        cell.style = {
          font: {
            name: 'Calibri',
            size: 11,
            bold: hasCredit,
            color: hasCredit ? { argb: 'FF9C0006' } : undefined
          },
          numFmt: '#,##0.00',
          alignment: { horizontal: 'center', vertical: 'middle' },
          fill: hasCredit
            ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } }
            : (isEvenRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowLight } } : undefined),
          border: baseCellBorder
        };
      } else if (colNumber === 6) {
        // Balance column: Red bg/text if negative (remove '-' sign), Green bg/text if positive
        applyStandardBalanceFormatting(cell, balanceVal, baseCellBorder);
      }
    });

    currentRowNum++;
  });

  // Add Totals row if items exist
  if (items.length > 0) {
    const totalDebit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
    const totalCredit = items.reduce((sum, item) => sum + (item.credit || 0), 0);
    const finalBalance = items[items.length - 1]?.balance ?? 0;

    const totalsRow = worksheet.addRow([
      'الإجمالي',
      '',
      '',
      totalDebit,
      totalCredit,
      finalBalance
    ]);

    worksheet.mergeCells(currentRowNum, 1, currentRowNum, 3);
    totalsRow.getCell(1).style = {
      font: { name: 'Calibri', bold: true, size: 11 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEAEA' } },
      border: {
        top: { style: thinStyle, color: { argb: COLORS.border } },
        left: { style: thinStyle, color: { argb: COLORS.border } },
        bottom: { style: mediumStyle, color: { argb: COLORS.border } },
        right: { style: thinStyle, color: { argb: COLORS.border } },
      }
    };

    // Style Totals cells
    const col4Cell = totalsRow.getCell(4);
    col4Cell.style = {
      font: { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF006100' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } },
      numFmt: '#,##0.00',
      border: {
        top: { style: thinStyle, color: { argb: COLORS.border } },
        left: { style: thinStyle, color: { argb: COLORS.border } },
        bottom: { style: mediumStyle, color: { argb: COLORS.border } },
        right: { style: thinStyle, color: { argb: COLORS.border } },
      }
    };

    const col5Cell = totalsRow.getCell(5);
    col5Cell.style = {
      font: { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF9C0006' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } },
      numFmt: '#,##0.00',
      border: {
        top: { style: thinStyle, color: { argb: COLORS.border } },
        left: { style: thinStyle, color: { argb: COLORS.border } },
        bottom: { style: mediumStyle, color: { argb: COLORS.border } },
        right: { style: thinStyle, color: { argb: COLORS.border } },
      }
    };

    const col6Cell = totalsRow.getCell(6);
    applyStandardBalanceFormatting(col6Cell, finalBalance, {
      top: { style: thinStyle, color: { argb: COLORS.border } },
      left: { style: thinStyle, color: { argb: COLORS.border } },
      bottom: { style: mediumStyle, color: { argb: COLORS.border } },
      right: { style: thinStyle, color: { argb: COLORS.border } },
    });

    totalsRow.height = 26;
  }

  // Calculate dynamic width for description column while keeping other columns tight
  let maxDescLen = 30;
  items.forEach(item => {
    if (item.description && item.description.length > maxDescLen) {
      maxDescLen = item.description.length;
    }
  });
  const descWidth = Math.min(Math.max(maxDescLen + 4, 45), 75);

  worksheet.columns = [
    { width: 14 }, // Date (DD/MM/YYYY)
    { width: 12 }, // Type (قبض/صرف)
    { width: descWidth }, // Description (WIDER)
    { width: 15 }, // Debit
    { width: 15 }, // Credit
    { width: 16 }, // Balance
  ];

  return worksheet;
}
