// src/services/export/ReceivableExcelGenerator.ts
import type { Workbook } from 'exceljs';
import { 
  setupWorksheet, 
  addReportHeader, 
  styles, 
  applyReceivablesConditionalFormatting,
  autoSizeColumns 
} from './excelStyles';
import type { AllReceivablesReportData, ExportOptions } from './exportTypes';

/**
 * Generate Excel report for all receivables summary
 * Implements "تصدير جميع المستحقات" specification
 */
export function generateAllReceivablesExcel(
  workbook: Workbook, 
  data: AllReceivablesReportData, 
  _options?: ExportOptions
) {
  const { receivables, summary } = data;
  const worksheet = workbook.addWorksheet('المستحقات - Receivables');

  setupWorksheet(worksheet);

  // Add report header
  const contentStartRow = addReportHeader(worksheet, 'تقرير جميع المستحقات', 5);

  // Define columns as per specification
  worksheet.columns = [
    { header: 'العميل', key: 'clientName', width: 25 },
    { header: 'رقم الجوال', key: 'clientPhone', width: 15 },
    { header: 'إجمالي المدين', key: 'totalDebit', width: 15 },
    { header: 'إجمالي الدائن', key: 'totalCredit', width: 15 },
    { header: 'إجمالي المستحقات', key: 'netReceivables', width: 18 },
  ];

  // Position headers at content start row
  const headerRow = worksheet.getRow(contentStartRow);
  headerRow.values = ['العميل', 'رقم الجوال', 'إجمالي المدين', 'إجمالي الدائن', 'إجمالي المستحقات'];
  headerRow.eachCell(cell => {
    cell.style = styles.mainHeader;
  });
  headerRow.height = 25;

  // Add receivables data
  let currentRow = contentStartRow + 1;
  receivables.forEach((receivable, index) => {
    const row = worksheet.getRow(currentRow);
    
    row.values = [
      receivable.client_name || '',
      receivable.client_phone ? `+966${receivable.client_phone.replace(/^\+?966/, '')}` : '',
      receivable.total_debit || 0,
      receivable.total_credit || 0,
      receivable.net_receivables || 0,
    ];

    // Apply data cell styling with alternating rows
    const isEvenRow = index % 2 === 1;
    row.getCell(1).style = styles.dataCell(isEvenRow); // Client name
    row.getCell(2).style = styles.dataCellCenter(isEvenRow); // Phone
    
    // Debit cell - red for debt
    const debitCell = row.getCell(3);
    debitCell.style = { 
      ...styles.dataCellCenter(isEvenRow), 
      ...styles.currency,
      font: { ...styles.currency.font, color: { argb: 'FF9C0006' } } // Red for debit
    };
    
    // Credit cell - green for credit
    const creditCell = row.getCell(4);
    creditCell.style = { 
      ...styles.dataCellCenter(isEvenRow), 
      ...styles.currency,
      font: { ...styles.currency.font, color: { argb: 'FF006100' } } // Green for credit
    };
    
    // Net receivables with conditional formatting
    const netCell = row.getCell(5);
    netCell.style = { ...styles.dataCellCenter(isEvenRow), ...styles.currency };
    applyReceivablesConditionalFormatting(netCell, receivable.net_receivables || 0);

    row.height = 20;
    currentRow++;
  });

  // Add summary section
  worksheet.addRow([]); // Spacer
  currentRow++;

  // Summary header
  const summaryHeaderRow = worksheet.addRow(['ملخص التقرير']);
  worksheet.mergeCells(currentRow, 1, currentRow, 5);
  summaryHeaderRow.getCell(1).style = styles.reportTitle;
  currentRow++;

  // Summary statistics
  const summaryItems = [
    ['إجمالي المدين', summary.total_debit],
    ['إجمالي الدائن', summary.total_credit],
    ['صافي المستحقات', summary.net_receivables],
    ['عملاء لديهم ديون', summary.clients_with_debt],
    ['عملاء لديهم رصيد', summary.clients_with_credit],
    ['عملاء متوازنون', summary.balanced_clients],
  ];

  summaryItems.forEach(([label, value]) => {
    const summaryRow = worksheet.addRow(['', '', '', label, value]);
    summaryRow.getCell(4).style = styles.totalLabel;
    
    if (typeof value === 'number' && (label.toString().includes('مدين') || label.toString().includes('دائن') || label.toString().includes('مستحقات'))) {
      summaryRow.getCell(5).style = styles.totalValue();
      if (label.toString().includes('صافي')) {
        applyReceivablesConditionalFormatting(summaryRow.getCell(5), value);
      }
    } else {
      summaryRow.getCell(5).style = {
        font: { bold: true },
        alignment: { horizontal: 'center' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      };
    }
    currentRow++;
  });

  // Auto-size columns for better readability
  autoSizeColumns(worksheet);

  return worksheet;
}
