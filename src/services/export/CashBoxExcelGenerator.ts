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
    'التاريخ',
    'النوع',
    'الصندوق',
    'الموظف المسؤول',
    'البيان',
    'المدين (مقبوضات)',
    'الدائن (مصروفات)',
    'الرصيد'
  ];
  headerRow.eachCell(cell => {
    cell.style = styles.mainHeader;
  });
  headerRow.height = 25;

  // Set column widths
  worksheet.getColumn(1).width = 15; // Date
  worksheet.getColumn(2).width = 12; // Type
  worksheet.getColumn(3).width = 20; // Cashbox
  worksheet.getColumn(4).width = 20; // Employee
  worksheet.getColumn(5).width = 30; // Description
  worksheet.getColumn(6).width = 15; // Debit
  worksheet.getColumn(7).width = 15; // Credit
  worksheet.getColumn(8).width = 15; // Balance

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
      formatDateForExcel(item.date),
      item.type_label || (item.debit > 0 ? 'قبض' : 'صرف'),
      item.cashbox_name,
      item.employee_name,
      item.description,
      item.debit || '-',
      item.credit || '-',
      item.balance
    ];

    // Apply styles
    row.eachCell((cell, colNumber) => {
      const baseStyle = styles.dataCell(isEvenRow);
      cell.style = baseStyle;

      // Date column - centered
      if (colNumber === 1) {
        cell.style = { ...styles.dataCellCenter(isEvenRow), ...styles.dateFormat };
      }

      // Debit column (green text for income)
      if (colNumber === 6 && item.debit > 0) {
        cell.style = {
          ...styles.dataCellCenter(isEvenRow),
          font: { bold: true, color: { argb: 'FF006100' } },
          numFmt: '#,##0.00'
        };
      } else if (colNumber === 6) {
        cell.style = styles.dataCellCenter(isEvenRow);
      }

      // Credit column (red text for expense)
      if (colNumber === 7 && item.credit > 0) {
        cell.style = {
          ...styles.dataCellCenter(isEvenRow),
          font: { bold: true, color: { argb: 'FF9C0006' } },
          numFmt: '#,##0.00'
        };
      } else if (colNumber === 7) {
        cell.style = styles.dataCellCenter(isEvenRow);
      }

      // Balance column
      if (colNumber === 8) {
        cell.style = {
          ...styles.dataCellCenter(isEvenRow),
          font: { bold: true },
          numFmt: '#,##0.00'
        };
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
    '-',
    '-',
    '-',
    'الإجماليات',
    totalDebit,
    totalCredit,
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

    if (colNumber === 6) {
      cell.style = { ...cell.style, font: { ...cell.font, color: { argb: 'FF006100' } }, numFmt: '#,##0.00' };
    }
    if (colNumber === 7) {
      cell.style = { ...cell.style, font: { ...cell.font, color: { argb: 'FF9C0006' } }, numFmt: '#,##0.00' };
    }
  });
  totalsRow.height = 25;

  // Auto-size columns for better readability
  autoSizeColumns(worksheet);

  return worksheet;
}
