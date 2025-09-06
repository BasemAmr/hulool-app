// src/services/export/ClientStatementGenerator.ts
import type { Workbook } from 'exceljs';
import { 
  setupWorksheet, 
  addReportHeader, 
  styles, 
  applyReceivablesConditionalFormatting,
  autoSizeColumns 
} from './excelStyles';
import type { ClientStatementReportData, ExportOptions } from './exportTypes';
import { formatDateForExcel } from '../../utils/formatUtils';

/**
 * Generate Excel report for detailed client statement with transactions and allocations
 * Implements "تفاصيل مستحقات العميل" specification
 */
export function generateClientStatementExcel(
  workbook: Workbook, 
  data: ClientStatementReportData, 
  options?: ExportOptions
) {
  const { clientName, clientPhone, statementItems, totals, period } = data;
  const worksheet = workbook.addWorksheet(`${clientName} - المستحقات`);

  setupWorksheet(worksheet);

  // Add report header with client info
  const reportTitle = `كشف حساب العميل: ${clientName}`;
  const contentStartRow = addReportHeader(worksheet, reportTitle, 6);

  // Add client information section
  const clientInfoRow = worksheet.addRow(['معلومات العميل']);
  worksheet.mergeCells(contentStartRow, 1, contentStartRow, 6);
  clientInfoRow.getCell(1).style = {
    font: { bold: true, size: 12 },
    alignment: { horizontal: 'center' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } },
  };

  worksheet.addRow(['', `اسم العميل: ${clientName}`, '', `رقم الجوال: ${clientPhone || 'غير محدد'}`]);
  worksheet.addRow(['', `فترة التقرير: من ${formatDateForExcel(period.from)} إلى ${formatDateForExcel(period.to)}`]);
  
  worksheet.addRow([]); // Spacer

  // Define columns for transaction table
  const transactionStartRow = contentStartRow + 5;
  worksheet.columns = [
    { header: 'الوصف', key: 'description', width: 30 },
    { header: 'المدين', key: 'debit', width: 15 },
    { header: 'الدائن', key: 'credit', width: 15 },
    { header: 'الرصيد المتراكم', key: 'balance', width: 15 },
    { header: 'تاريخ الحركة', key: 'date', width: 15 },
    { header: 'النوع', key: 'type', width: 15 },
  ];

  // Transaction table headers
  const headerRow = worksheet.getRow(transactionStartRow);
  headerRow.values = ['الوصف', 'المدين', 'الدائن', 'الرصيد المتراكم', 'تاريخ الحركة', 'النوع'];
  headerRow.eachCell(cell => {
    cell.style = styles.mainHeader;
  });
  headerRow.height = 25;

  // Add transaction data with running balance
  let currentRow = transactionStartRow + 1;
  let runningBalance = 0;
  
  // Sort statement items by date
  const sortedItems = [...statementItems].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sortedItems.forEach((item, index) => {
    runningBalance += (item.debit || 0) - (item.credit || 0);

    const row = worksheet.getRow(currentRow);
    row.values = [
      item.description || '',
      item.debit || 0,
      item.credit || 0,
      runningBalance,
      formatDateForExcel(item.date),
      item.type || '',
    ];

    // Apply data cell styling with alternating rows
    const isEvenRow = index % 2 === 1;
    row.getCell(1).style = { ...styles.dataCell(isEvenRow), alignment: { ...styles.dataCell(isEvenRow).alignment, wrapText: true } }; // Description
    
    // Debit cell - red for debt
    const debitCell = row.getCell(2);
    debitCell.style = { 
      ...styles.dataCellCenter(isEvenRow), 
      ...styles.currency,
      font: { ...styles.currency.font, color: { argb: 'FF9C0006' } } // Red for debit
    };
    
    // Credit cell - green for credit
    const creditCell = row.getCell(3);
    creditCell.style = { 
      ...styles.dataCellCenter(isEvenRow), 
      ...styles.currency,
      font: { ...styles.currency.font, color: { argb: 'FF006100' } } // Green for credit
    };
    
    // Running balance with conditional formatting
    const balanceCell = row.getCell(4);
    balanceCell.style = { ...styles.dataCellCenter(isEvenRow), ...styles.currency, font: { bold: true } };
    applyReceivablesConditionalFormatting(balanceCell, runningBalance);
    
    // Date and type cells
    row.getCell(5).style = { ...styles.dataCellCenter(isEvenRow), ...styles.dateFormat };
    row.getCell(6).style = styles.dataCellCenter(isEvenRow);

    row.height = 20;
    currentRow++;

    // Add sub-tables for payments and allocations if enabled and data exists
    if (options?.includeSubTables !== false && item.details) {
      const { payments, allocations } = item.details;
      
      if ((payments && payments.length > 0) || (allocations && allocations.length > 0)) {
        // Add spacer row
        worksheet.addRow([]);
        currentRow++;
        
        // Add sub-table header
        const subHeaderRow = worksheet.addRow(['', 'تفاصيل المدفوعات والتخصيصات']);
        worksheet.mergeCells(currentRow, 2, currentRow, 6);
        subHeaderRow.getCell(2).style = {
          font: { bold: true, color: { argb: 'FF6C757D' } },
          alignment: { horizontal: 'center' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } },
        };
        currentRow++;

        // Sub-table column headers
        const paymentHeaderRow = worksheet.addRow(['', 'المبلغ', 'التاريخ', 'الطريقة', 'ملاحظات']);
        for (let i = 2; i <= 5; i++) {
          paymentHeaderRow.getCell(i).style = styles.subHeader;
        }
        currentRow++;

        // Add payment details
        if (payments) {
          payments.forEach(payment => {
            const pRow = worksheet.addRow([
              '', 
              payment.amount, 
              formatDateForExcel(payment.allocated_at), 
              payment.payment_method?.name || 'نقد', 
              payment.note || '-'
            ]);
            pRow.getCell(2).style = { 
              ...styles.currency, 
              font: { ...styles.currency.font, color: { argb: 'FF006100' } },
              border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
            };
            for (let i = 3; i <= 5; i++) {
              pRow.getCell(i).style = {
                font: { size: 10 },
                alignment: { horizontal: 'center' },
                border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
              };
            }
            currentRow++;
          });
        }

        // Add credit allocation details
        if (allocations) {
          allocations.forEach(allocation => {
            const aRow = worksheet.addRow([
              '', 
              allocation.amount, 
              formatDateForExcel(allocation.allocated_at), 
              'تخصيص من رصيد', 
              allocation.description || '-'
            ]);
            aRow.getCell(2).style = { 
              ...styles.currency, 
              font: { ...styles.currency.font, color: { argb: 'FF0D6EFD' } },
              border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
            };
            for (let i = 3; i <= 5; i++) {
              aRow.getCell(i).style = {
                font: { size: 10 },
                alignment: { horizontal: 'center' },
                border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
              };
            }
            currentRow++;
          });
        }

        // Add spacer after sub-table
        worksheet.addRow([]);
        currentRow++;
      }
    }
  });

  // Add summary section
  worksheet.addRow([]); // Spacer
  currentRow++;

  // Summary header
  const summaryHeaderRow = worksheet.addRow(['ملخص الحساب']);
  worksheet.mergeCells(currentRow, 1, currentRow, 6);
  summaryHeaderRow.getCell(1).style = styles.reportTitle;
  currentRow++;

  // Summary totals
  const summaryItems = [
    ['إجمالي المدين', totals.totalDebit],
    ['إجمالي الدائن', totals.totalCredit],
    ['الرصيد النهائي', totals.balance],
  ];

  summaryItems.forEach(([label, value]) => {
    const summaryRow = worksheet.addRow(['', '', '', '', label, value]);
    summaryRow.getCell(5).style = styles.totalLabel;
    
    const valueCell = summaryRow.getCell(6);
    if (label.toString().includes('الرصيد النهائي')) {
      valueCell.style = styles.finalBalance;
      applyReceivablesConditionalFormatting(valueCell, value as number);
    } else {
      valueCell.style = styles.totalValue();
      if (label.toString().includes('المدين')) {
        valueCell.style = { ...valueCell.style, font: { ...valueCell.font, color: { argb: 'FF9C0006' } } };
      } else if (label.toString().includes('الدائن')) {
        valueCell.style = { ...valueCell.style, font: { ...valueCell.font, color: { argb: 'FF006100' } } };
      }
    }
    currentRow++;
  });

  // Auto-size columns for better readability
  autoSizeColumns(worksheet);

  return worksheet;
}
