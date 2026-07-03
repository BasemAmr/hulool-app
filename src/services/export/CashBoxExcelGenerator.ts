// src/services/export/CashBoxExcelGenerator.ts
import type { Workbook } from 'exceljs';
import {
  setupWorksheet,
  addReportHeader,
  styles,
  autoSizeColumns,
  COLORS
} from './excelStyles';
import type { CashBoxExportReportData, ExportOptions } from './exportTypes';
import { formatDateForExcel } from '@/shared/utils/formatUtils';

/**
 * Generate Excel report for Cash Box statement(s)
 */
export function generateCashBoxExcel(
  workbook: Workbook,
  data: CashBoxExportReportData,
  options?: ExportOptions
) {
  const { title, items, period } = data;
  const worksheet = workbook.addWorksheet(title.substring(0, 31)); // excel sheet name limit is 31 chars

  setupWorksheet(worksheet);

  // Add report header
  const numColumns = 8;
  const contentStartRow = addReportHeader(worksheet, title, numColumns);

  // Add period info if available
  if (period && (period.from || period.to)) {
    const periodStr = `الفترة: ${period.from ? `من ${period.from}` : ''} ${period.to ? `إلى ${period.to}` : ''}`;
    const periodRow = worksheet.addRow([periodStr]);
    worksheet.mergeCells(contentStartRow + 1, 1, contentStartRow + 1, numColumns);
    periodRow.getCell(1).style = {
      font: { bold: true, size: 12 },
      alignment: { horizontal: 'center' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } },
    };
  }

  worksheet.addRow([]); // Spacer

  // Define table columns start row
  const tableStartRow = worksheet.lastRow ? worksheet.lastRow.number + 1 : 5;

  // Table headers (Arabic / Right-to-Left context)
  const headerRow = worksheet.getRow(tableStartRow);
  headerRow.values = [
    'الرصيد',
    'الدائن (مصروفات)',
    'المدين (مقبوضات)',
    'التصنيف',
    'البيان',
    'الموظف المسؤول',
    'الصندوق',
    'التاريخ'
  ];
  headerRow.eachCell(cell => {
    cell.style = styles.mainHeader;
  });
  headerRow.height = 25;

  // Set column widths (Right-to-Left order since we configured RTL sheet setup in setupWorksheet)
  worksheet.getColumn(1).width = 15; // Balance
  worksheet.getColumn(2).width = 15; // Credit
  worksheet.getColumn(3).width = 15; // Debit
  worksheet.getColumn(4).width = 15; // Category
  worksheet.getColumn(5).width = 25; // Description
  worksheet.getColumn(6).width = 20; // Employee name
  worksheet.getColumn(7).width = 20; // Cashbox name
  worksheet.getColumn(8).width = 15; // Date

  let currentRow = tableStartRow + 1;

  // Totals calculations
  let totalDebit = 0;
  let totalCredit = 0;

  // Transaction Rows
  items.forEach((item, index) => {
    const isEvenRow = index % 2 === 1;
    const row = worksheet.getRow(currentRow);

    totalDebit += item.debit || 0;
    totalCredit += item.credit || 0;

    row.values = [
      item.balance,
      item.credit || '-',
      item.debit || '-',
      item.category || '-',
      item.description,
      item.employee_name,
      item.cashbox_name,
      formatDateForExcel(item.date)
    ];

    // Apply styles
    row.eachCell((cell, colNumber) => {
      const baseStyle = styles.dataCell(isEvenRow);
      cell.style = baseStyle;

      // Balance column
      if (colNumber === 1) {
        cell.style = {
          ...styles.dataCellCenter(isEvenRow),
          font: { bold: true },
          numFmt: '#,##0.00'
        };
      }

      // Credit column (red text for expense)
      if (colNumber === 2 && item.credit > 0) {
        cell.style = {
          ...styles.dataCellCenter(isEvenRow),
          font: { bold: true, color: { argb: 'FF9C0006' } },
          numFmt: '#,##0.00'
        };
      } else if (colNumber === 2) {
        cell.style = styles.dataCellCenter(isEvenRow);
      }

      // Debit column (green text for income)
      if (colNumber === 3 && item.debit > 0) {
        cell.style = {
          ...styles.dataCellCenter(isEvenRow),
          font: { bold: true, color: { argb: 'FF006100' } },
          numFmt: '#,##0.00'
        };
      } else if (colNumber === 3) {
        cell.style = styles.dataCellCenter(isEvenRow);
      }

      // Date column - centered
      if (colNumber === 8) {
        cell.style = { ...styles.dataCellCenter(isEvenRow), ...styles.dateFormat };
      }
    });

    row.height = 20;
    currentRow++;
  });

  // Summary/Totals Row
  worksheet.addRow([]); // Spacer
  currentRow++;

  const totalsRow = worksheet.getRow(currentRow);
  totalsRow.values = [
    '-',
    totalCredit,
    totalDebit,
    '-',
    'الإجماليات',
    '-',
    '-',
    '-'
  ];

  totalsRow.eachCell((cell, colNumber) => {
    cell.style = {
      font: { bold: true, size: 11 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } },
      border: {
        top: { style: 'medium', color: { argb: COLORS.border } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        bottom: { style: 'medium', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } },
      },
    };

    if (colNumber === 2) {
      cell.style = { ...cell.style, font: { ...cell.font, color: { argb: 'FF9C0006' } }, numFmt: '#,##0.00' };
    }
    if (colNumber === 3) {
      cell.style = { ...cell.style, font: { ...cell.font, color: { argb: 'FF006100' } }, numFmt: '#,##0.00' };
    }
  });
  totalsRow.height = 25;

  // Auto-size columns for better readability
  autoSizeColumns(worksheet);

  return worksheet;
}
