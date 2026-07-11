import type { Workbook } from 'exceljs';
import {
  setupWorksheet,
  addReportHeader,
  styles,
  autoSizeColumns,
  COLORS
} from './excelStyles';
import type { TreasuryAccountExportReportData, ExportOptions } from './exportTypes';

export function generateTreasuryAccountExcel(
  workbook: Workbook,
  data: TreasuryAccountExportReportData,
  options?: ExportOptions
) {
  const { title, items, period } = data;
  const worksheet = workbook.addWorksheet(title.substring(0, 31));

  setupWorksheet(worksheet);

  // Add report header
  const numColumns = 6;
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

  // Add items
  let currentRowNum = tableStartRow + 1;
  items.forEach(item => {
    const row = worksheet.addRow([
      item.transaction_date ? item.transaction_date.split(' ')[0] : '',
      item.transaction_type,
      item.description,
      item.debit,
      item.credit,
      item.balance
    ]);

    row.height = 22;

    const isEvenRow = (currentRowNum - tableStartRow) % 2 === 0;

    row.eachCell((cell, colNumber) => {
      // Default body styling from excelStyles
      cell.style = styles.dataCell(isEvenRow);

      // Centered styling for date and type
      if (colNumber === 1 || colNumber === 2) {
        cell.style = styles.dataCellCenter(isEvenRow);
      }

      // Left-aligned numbers and custom color codes
      if (colNumber >= 4) {
        cell.style = {
          ...styles.dataCell(isEvenRow),
          alignment: { horizontal: 'left', vertical: 'middle' },
          numFmt: '#,##0.00'
        };
      }

      // Apply font color alerts
      if (colNumber === 4 && item.debit > 0) {
        cell.style = {
          ...cell.style,
          font: { bold: true, color: { argb: 'FF006100' } },
        };
      }
      if (colNumber === 5 && item.credit > 0) {
        cell.style = {
          ...cell.style,
          font: { bold: true, color: { argb: 'FF9C0006' } },
        };
      }
    });

    currentRowNum++;
  });

  // Add Totals row if items exist
  if (items.length > 0) {
    const totalDebit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
    const totalCredit = items.reduce((sum, item) => sum + (item.credit || 0), 0);
    const finalBalance = items[0]?.balance ?? 0;

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
      font: { bold: true, size: 11 },
      alignment: { horizontal: 'center' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEAEA' } },
    };

    totalsRow.eachCell((cell, colNumber) => {
      if (colNumber >= 4) {
        cell.style = {
          font: { bold: true, size: 11 },
          alignment: { horizontal: 'left' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEAEA' } },
          numFmt: '#,##0.00'
        };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.border } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        bottom: { style: 'medium', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } },
      };
    });
    totalsRow.height = 25;
  }

  autoSizeColumns(worksheet);
  return worksheet;
}
