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

  const isCommissions = title.includes('عمولات') || items.some((i: any) => i.metadata?.task_amount !== undefined);

  // Add report header
  const numColumns = isCommissions ? 7 : 6;
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
  headerRow.values = isCommissions
    ? [
        'التاريخ',
        'الموظف المستحق للعمولة',
        'البيان',
        'مبلغ المهمة',
        'مبلغ المصروفات',
        'المبلغ الصافي',
        'الرصيد النهائي'
      ]
    : [
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

    let meta: any = item.metadata;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch {}
    }

    const taskAmt = Number(meta?.task_amount ?? (isCommissions ? debitVal : 0));
    const expAmt = Number(meta?.expense_amount ?? 0);
    const netAmt = Number(meta?.net_amount ?? (taskAmt - expAmt));
    const empName = meta?.employee_name || item.transaction_type || '—';

    const isReceipt = debitVal > 0 || item.transaction_type === 'قبض' || item.transaction_type === 'CASHBOX_RECEIPT';
    
    // Check for explicit voucher override in metadata (e.g. Bank payout formatted as Client Receipt)
    let typeLabel = isReceipt ? 'قبض' : 'صرف';
    if (meta && typeof meta === 'object') {
      if (meta.voucher_type_override === 'receipt') {
        typeLabel = 'صرف (سند قبض)';
      } else if (meta.voucher_type_override === 'expense') {
        typeLabel = 'قبض (سند صرف)';
      }
    }

    const row = isCommissions
      ? worksheet.addRow([
          formatDateDDMMYYYY(item.transaction_date),
          empName,
          item.description || '—',
          taskAmt,
          expAmt,
          netAmt,
          balanceVal
        ])
      : worksheet.addRow([
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
      if (isCommissions) {
        if (colNumber === 1) {
          // Date
          cell.style = {
            font: { name: 'Calibri', size: 11 },
            alignment: { horizontal: 'center', vertical: 'middle' },
            fill: isEvenRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowLight } } : undefined,
            border: baseCellBorder
          };
        } else if (colNumber === 2) {
          // Employee Name
          cell.style = {
            font: { name: 'Calibri', size: 11, bold: true },
            alignment: { horizontal: 'center', vertical: 'middle' },
            fill: isEvenRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowLight } } : undefined,
            border: baseCellBorder
          };
        } else if (colNumber === 3) {
          // Description
          cell.style = {
            font: { name: 'Calibri', size: 11, bold: true },
            alignment: { horizontal: 'right', vertical: 'middle', wrapText: true },
            fill: isEvenRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowLight } } : undefined,
            border: baseCellBorder
          };
        } else if (colNumber === 4) {
          // Task amount
          cell.style = {
            font: { name: 'Calibri', size: 11, bold: true },
            numFmt: '#,##0.00',
            alignment: { horizontal: 'center', vertical: 'middle' },
            fill: isEvenRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowLight } } : undefined,
            border: baseCellBorder
          };
        } else if (colNumber === 5) {
          // Expense amount (red)
          cell.style = {
            font: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF9C0006' } },
            numFmt: '#,##0.00',
            alignment: { horizontal: 'center', vertical: 'middle' },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } },
            border: baseCellBorder
          };
        } else if (colNumber === 6) {
          // Net amount (green)
          cell.style = {
            font: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF006100' } },
            numFmt: '#,##0.00',
            alignment: { horizontal: 'center', vertical: 'middle' },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } },
            border: baseCellBorder
          };
        } else if (colNumber === 7) {
          // Balance
          applyStandardBalanceFormatting(cell, balanceVal, baseCellBorder);
        }
      } else {
        // Standard Treasury styling
        if (colNumber === 1) {
          cell.style = {
            font: { name: 'Calibri', size: 11 },
            alignment: { horizontal: 'center', vertical: 'middle' },
            fill: isEvenRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowLight } } : undefined,
            border: baseCellBorder
          };
        } else if (colNumber === 2) {
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
          cell.style = {
            font: { name: 'Calibri', size: 11 },
            alignment: { horizontal: 'right', vertical: 'middle', wrapText: true },
            fill: isEvenRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowLight } } : undefined,
            border: baseCellBorder
          };
        } else if (colNumber === 4) {
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
          applyStandardBalanceFormatting(cell, balanceVal, baseCellBorder);
        }
      }
    });

    currentRowNum++;
  });

  // Add Totals row if items exist
  if (items.length > 0) {
    const finalBalance = items[items.length - 1]?.balance ?? 0;

    if (isCommissions) {
      const totalTask = items.reduce((sum, item: any) => sum + (Number(item.metadata?.task_amount) || 0), 0);
      const totalExpense = items.reduce((sum, item: any) => sum + (Number(item.metadata?.expense_amount) || 0), 0);
      const totalNet = items.reduce((sum, item: any) => {
        const net = item.metadata?.net_amount !== undefined
          ? Number(item.metadata.net_amount)
          : (Number(item.metadata?.task_amount || 0) - Number(item.metadata?.expense_amount || 0));
        return sum + (Number.isFinite(net) ? net : 0);
      }, 0);

      const totalsRow = worksheet.addRow([
        'الإجمالي',
        '',
        '',
        totalTask,
        totalExpense,
        totalNet,
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

      totalsRow.getCell(4).style = {
        font: { name: 'Calibri', bold: true, size: 11 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEAEA' } },
        numFmt: '#,##0.00',
        border: {
          top: { style: thinStyle, color: { argb: COLORS.border } },
          left: { style: thinStyle, color: { argb: COLORS.border } },
          bottom: { style: mediumStyle, color: { argb: COLORS.border } },
          right: { style: thinStyle, color: { argb: COLORS.border } },
        }
      };

      totalsRow.getCell(5).style = {
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

      totalsRow.getCell(6).style = {
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

      applyStandardBalanceFormatting(totalsRow.getCell(7), finalBalance, {
        top: { style: thinStyle, color: { argb: COLORS.border } },
        left: { style: thinStyle, color: { argb: COLORS.border } },
        bottom: { style: mediumStyle, color: { argb: COLORS.border } },
        right: { style: thinStyle, color: { argb: COLORS.border } },
      });

      totalsRow.height = 26;
    } else {
      const totalDebit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
      const totalCredit = items.reduce((sum, item) => sum + (item.credit || 0), 0);

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
  }

  // Calculate dynamic width for description column while keeping other columns tight
  let maxDescLen = 30;
  items.forEach(item => {
    if (item.description && item.description.length > maxDescLen) {
      maxDescLen = item.description.length;
    }
  });
  const descWidth = Math.min(Math.max(maxDescLen + 4, 45), 75);

  worksheet.columns = isCommissions
    ? [
        { width: 14 }, // Date
        { width: 22 }, // Employee Name
        { width: descWidth }, // Description
        { width: 15 }, // Task Amount
        { width: 15 }, // Expense Amount
        { width: 15 }, // Net Amount
        { width: 16 }, // Balance
      ]
    : [
        { width: 14 }, // Date (DD/MM/YYYY)
        { width: 12 }, // Type (قبض/صرف)
        { width: descWidth }, // Description (WIDER)
        { width: 15 }, // Debit
        { width: 15 }, // Credit
        { width: 16 }, // Balance
      ];

  return worksheet;
}
