// src/services/export/EmployeeStatementGenerator.ts
import type { Workbook, BorderStyle } from 'exceljs';
import {
  setupWorksheet,
  styles,
  applyStandardBalanceFormatting,
  COLORS
} from './excelStyles';
import type { EmployeeStatementReportData, ExportOptions } from './exportTypes';

function formatDateDDMMYYYY(dateStr: string | Date | undefined | null): string {
  if (!dateStr || dateStr === '-') return '-';
  const str = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
  const cleanDate = str.split(' ')[0].split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year && month && day) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }
  return cleanDate;
}

/**
 * Generate Excel report for employee financial statement
 * Implements "كشف حساب الموظف" specification
 */
export function generateEmployeeStatementExcel(
  workbook: Workbook,
  data: EmployeeStatementReportData,
  options?: ExportOptions
) {
  const { employeeName, period, openingBalance, transactions, summary } = data;
  const sheetName = `كشف حساب - ${employeeName}`.replace(/[\\/*?:\[\]]/g, '').substring(0, 31);
  const worksheet = workbook.addWorksheet(sheetName);

  setupWorksheet(worksheet);

  const numColumns = 6;
  const thinStyle: BorderStyle = 'thin';
  const mediumStyle: BorderStyle = 'medium';

  // Format Period string
  const periodStr = (period?.month_name || period?.year)
    ? `${period.month_name || ''} ${period.year || ''}`.trim()
    : 'جميع الفترات';

  const todayStr = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY

  // Row 1: Header Title with Period and Report Date merged together (NO white space spacer rows)
  const fullTitle = `كشف حساب الموظف: ${employeeName}  |  الفترة: ${periodStr}  |  تاريخ التقرير: ${todayStr}`;
  const titleRow = worksheet.addRow([fullTitle]);
  worksheet.mergeCells(1, 1, 1, numColumns);
  titleRow.getCell(1).style = styles.reportTitle;
  titleRow.height = 38;

  // Row 2: Table Headers (Date is SECOND column!)
  const tableStartRow = 2;
  const headerRow = worksheet.getRow(tableStartRow);
  headerRow.values = [
    'اسم العميل',
    'التاريخ',
    'البيان',
    'المدين',
    'الدائن',
    'الرصيد'
  ];
  headerRow.eachCell(cell => {
    cell.style = styles.mainHeader;
  });
  headerRow.height = 30;

  const baseCellBorder = {
    top: { style: thinStyle, color: { argb: COLORS.border } },
    left: { style: thinStyle, color: { argb: COLORS.border } },
    bottom: { style: thinStyle, color: { argb: COLORS.border } },
    right: { style: thinStyle, color: { argb: COLORS.border } },
  };

  let currentRowNum = tableStartRow + 1;

  // Opening Balance Row
  const openingRow = worksheet.getRow(currentRowNum);
  const openingDebit = openingBalance.total_debit > 0 ? openingBalance.total_debit : 0;
  const openingCredit = openingBalance.total_credit > 0 ? openingBalance.total_credit : 0;
  const openingBal = Number(openingBalance.balance || 0);

  openingRow.values = [
    'رصيد افتتاحي',
    '-',
    'رصيد افتتاحي',
    openingDebit,
    openingCredit,
    openingBal
  ];
  openingRow.height = 22;

  openingRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if (colNumber === 1 || colNumber === 3) {
      cell.style = {
        font: { name: 'Calibri', size: 11, bold: true },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEAEA' } },
        border: baseCellBorder
      };
    } else if (colNumber === 2) {
      cell.style = {
        font: { name: 'Calibri', size: 11 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEAEA' } },
        border: baseCellBorder
      };
    } else if (colNumber === 4) {
      // Opening Debit: Red background / Reddish text when > 0
      const hasDebit = openingDebit > 0;
      cell.style = {
        font: { name: 'Calibri', size: 11, bold: true, color: hasDebit ? { argb: 'FF9C0006' } : undefined },
        numFmt: '#,##0.00',
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: hasDebit ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } } : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEAEA' } },
        border: baseCellBorder
      };
    } else if (colNumber === 5) {
      // Opening Credit: Green background / Greenish text when > 0
      const hasCredit = openingCredit > 0;
      cell.style = {
        font: { name: 'Calibri', size: 11, bold: true, color: hasCredit ? { argb: 'FF006100' } : undefined },
        numFmt: '#,##0.00',
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: hasCredit ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } } : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEAEA' } },
        border: baseCellBorder
      };
    } else if (colNumber === 6) {
      // Opening Balance
      applyStandardBalanceFormatting(cell, openingBal, baseCellBorder);
    }
  });

  currentRowNum++;

  // Transaction Rows
  transactions.forEach((transaction, index) => {
    const isEvenRow = index % 2 === 1;
    const row = worksheet.getRow(currentRowNum);

    const debitValue = transaction.direction === 'income' ? Number(transaction.amount || 0) : 0;
    const creditValue = transaction.direction === 'expense' ? Number(transaction.amount || 0) : 0;
    const runningBal = Number(transaction.running_balance || 0);

    const clientDocLabel = transaction.client_name || (transaction.direction === 'income' ? 'سند قبض' : 'سند صرف');

    row.values = [
      clientDocLabel,
      formatDateDDMMYYYY(transaction.date),
      transaction.description || '—',
      debitValue,
      creditValue,
      runningBal
    ];

    row.height = 22;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber === 1) {
        // Client / Document Name
        cell.style = {
          font: { name: 'Calibri', size: 11, bold: true },
          alignment: { horizontal: 'center', vertical: 'middle' },
          fill: isEvenRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowLight } } : undefined,
          border: baseCellBorder
        };
      } else if (colNumber === 2) {
        // Date column (DD/MM/YYYY) - SECOND COLUMN!
        cell.style = {
          font: { name: 'Calibri', size: 11 },
          alignment: { horizontal: 'center', vertical: 'middle' },
          fill: isEvenRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowLight } } : undefined,
          border: baseCellBorder
        };
      } else if (colNumber === 3) {
        // Description - WIDER!
        cell.style = {
          font: { name: 'Calibri', size: 11 },
          alignment: { horizontal: 'right', vertical: 'middle', wrapText: true },
          fill: isEvenRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowLight } } : undefined,
          border: baseCellBorder
        };
      } else if (colNumber === 4) {
        // Debit column - Red background & Dark Red text
        const hasDebit = debitValue > 0;
        cell.style = {
          font: {
            name: 'Calibri',
            size: 11,
            bold: hasDebit,
            color: hasDebit ? { argb: 'FF9C0006' } : undefined
          },
          numFmt: '#,##0.00',
          alignment: { horizontal: 'center', vertical: 'middle' },
          fill: hasDebit
            ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } }
            : (isEvenRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowLight } } : undefined),
          border: baseCellBorder
        };
      } else if (colNumber === 5) {
        // Credit column - Green background & Dark Green text
        const hasCredit = creditValue > 0;
        cell.style = {
          font: {
            name: 'Calibri',
            size: 11,
            bold: hasCredit,
            color: hasCredit ? { argb: 'FF006100' } : undefined
          },
          numFmt: '#,##0.00',
          alignment: { horizontal: 'center', vertical: 'middle' },
          fill: hasCredit
            ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } }
            : (isEvenRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowLight } } : undefined),
          border: baseCellBorder
        };
      } else if (colNumber === 6) {
        // Balance column: Red if negative (no '-' minus sign), Green if positive
        applyStandardBalanceFormatting(cell, runningBal, baseCellBorder);
      }
    });

    currentRowNum++;
  });

  // Summary / Totals Row
  const totalsRow = worksheet.getRow(currentRowNum);
  const totalDebitSum = Number(summary?.total_to_date_income || 0);
  const totalCreditSum = Number(summary?.total_to_date_expenses || 0);
  const closingBalSum = Number(summary?.closing_balance || 0);

  totalsRow.values = [
    'الإجماليات',
    '-',
    '-',
    totalDebitSum,
    totalCreditSum,
    closingBalSum
  ];

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

  // Col 4 (Debit Total): Red theme
  const col4Cell = totalsRow.getCell(4);
  col4Cell.style = {
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

  // Col 5 (Credit Total): Green theme
  const col5Cell = totalsRow.getCell(5);
  col5Cell.style = {
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

  // Col 6 (Balance Total): Standard balance formatting (Red if negative, Green if positive)
  const col6Cell = totalsRow.getCell(6);
  applyStandardBalanceFormatting(col6Cell, closingBalSum, {
    top: { style: thinStyle, color: { argb: COLORS.border } },
    left: { style: thinStyle, color: { argb: COLORS.border } },
    bottom: { style: mediumStyle, color: { argb: COLORS.border } },
    right: { style: thinStyle, color: { argb: COLORS.border } },
  });

  totalsRow.height = 26;

  // Calculate dynamic width for description column while keeping other columns tight
  let maxDescLen = 25;
  transactions.forEach(t => {
    if (t.description && t.description.length > maxDescLen) {
      maxDescLen = t.description.length;
    }
  });
  const descWidth = Math.min(Math.max(maxDescLen + 4, 45), 75);

  worksheet.columns = [
    { width: 16 }, // Col 1: اسم العميل
    { width: 14 }, // Col 2: التاريخ (Date DD/MM/YYYY)
    { width: descWidth }, // Col 3: البيان (Description - WIDER!)
    { width: 14 }, // Col 4: المدين
    { width: 14 }, // Col 5: الدائن
    { width: 15 }, // Col 6: الرصيد
  ];

  return worksheet;
}
