// src/services/export/ClientExcelGenerator.ts
import type { Workbook } from 'exceljs';
import { 
  setupWorksheet, 
  addReportHeader, 
  styles, 
  applyReceivablesConditionalFormatting,
  autoSizeColumns 
} from './excelStyles';
import type { AllClientsReportData, ExportOptions } from './exportTypes';

/**
 * Generate Excel report for all clients with receivables summary
 * Implements "تصدير جميع العملاء" specification
 */
export function generateAllClientsExcel(
  workbook: Workbook, 
  data: AllClientsReportData, 
  _options?: ExportOptions
) {
  const { clients, summary } = data;
  const worksheet = workbook.addWorksheet('العملاء - Clients');

  setupWorksheet(worksheet);

  // Add report header
  const contentStartRow = addReportHeader(worksheet, 'تقرير جميع العملاء', 5);

  // Define columns as per specification
  worksheet.columns = [
    { header: 'اسم العميل', key: 'clientName', width: 25 },
    { header: 'رقم الهاتف', key: 'phoneNumber', width: 15 },
    { header: 'المنطقة', key: 'clientRegion', width: 15 },
    { header: 'الملاحظات', key: 'notes', width: 30 },
    { header: 'المستحقات', key: 'receivables', width: 15 },
  ];

  // Position headers at content start row
  const headerRow = worksheet.getRow(contentStartRow);
  headerRow.values = ['اسم العميل', 'رقم الهاتف', 'نوع العميل', 'الملاحظات', 'المستحقات'];
  headerRow.eachCell(cell => {
    cell.style = styles.mainHeader;
  });
  headerRow.height = 25;

  // Add client data
  let currentRow = contentStartRow + 1;
  clients.forEach((client, index) => {
    const row = worksheet.getRow(currentRow);
    
    row.values = [
      client.name || '',
      client.phone ? `+966${client.phone.replace(/^\+?966/, '')}` : '', // Ensure +966 prefix
      client.region_name || 'غير محدد',
      client.notes || '',
      client.balance || 0, // Use balance (which maps to total_outstanding) to match table display
    ];

    // Apply data cell styling with alternating rows
    const isEvenRow = index % 2 === 1;
    row.getCell(1).style = styles.dataCell(isEvenRow); // Client name - right aligned
    row.getCell(2).style = styles.dataCellCenter(isEvenRow); // Phone - center aligned
    row.getCell(3).style = styles.dataCellCenter(isEvenRow); // Type - center aligned
    row.getCell(4).style = { ...styles.dataCell(isEvenRow), alignment: { ...styles.dataCell(isEvenRow).alignment, wrapText: true } }; // Notes - wrapped
    row.getCell(5).style = { ...styles.dataCellCenter(isEvenRow), ...styles.currency }; // Receivables - currency format

    // Apply conditional formatting for receivables
    applyReceivablesConditionalFormatting(row.getCell(5), client.balance || 0);

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

  // Summary data
  const summaryItems = [
    ['عدد العملاء الكلي', summary.total_clients],
    ['إجمالي المستحقات', summary.total_receivables],
    ['إجمالي المدفوع', summary.total_paid],
    ['صافي الرصيد', summary.net_balance],
  ];

  summaryItems.forEach(([label, value]) => {
    const summaryRow = worksheet.addRow(['', '', '', label, value]);
    summaryRow.getCell(4).style = styles.totalLabel;
    
    if (typeof value === 'number' && label.toString().includes('مبلغ') || label.toString().includes('رصيد') || label.toString().includes('مستحقات')) {
      summaryRow.getCell(5).style = styles.totalValue();
      if (label.toString().includes('رصيد') && typeof value === 'number') {
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

  // Data validation for client type column (as per specification)
//   const clientTypeValidation = {
//     type: 'list' as const,
//     allowBlank: false,
//     formulae: ['"عادي,مميز,VIP,شركة"'],
//     showErrorMessage: true,
//     errorTitle: 'نوع العميل غير صحيح',
//     error: 'يرجى اختيار نوع العميل من القائمة المحددة'
//   };

//   // Apply validation to the client type column for data rows
//   for (let i = contentStartRow + 1; i < currentRow - summaryItems.length - 2; i++) {
//     worksheet.getCell(`C${i}`).dataValidation = clientTypeValidation;
//   }

  return worksheet;
}
