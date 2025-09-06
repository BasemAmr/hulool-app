// src/services/export/ClientCreditsGenerator.ts
import type { Workbook } from 'exceljs';
import { 
  setupWorksheet, 
  addReportHeader, 
  styles, 
  creditStatusStyles,
  autoSizeColumns 
} from './excelStyles';
import type { ClientCreditsReportData, ExportOptions } from './exportTypes';
import { formatDateForExcel, calculatePercentage } from '../../utils/formatUtils';

/**
 * Generate Excel report for client credit information and history
 * Implements "ائتمانات العميل" specification
 */
export function generateClientCreditsExcel(
  workbook: Workbook, 
  data: ClientCreditsReportData, 
  _options?: ExportOptions
) {
  const { client, credits, summary } = data;
  const worksheet = workbook.addWorksheet(`${client.name} - الائتمانات`);

  setupWorksheet(worksheet);

  // Add report header
  const reportTitle = `تقرير ائتمانات العميل: ${client.name}`;
  const contentStartRow = addReportHeader(worksheet, reportTitle, 7);

  // Add credit analysis table
  worksheet.columns = [
    { header: 'تاريخ الائتمان', key: 'creditDate', width: 15 },
    { header: 'المبلغ الممنوح', key: 'amountGranted', width: 15 },
    { header: 'المبلغ المستخدم', key: 'amountUsed', width: 15 },
    { header: 'الرصيد المتاح', key: 'amountAvailable', width: 15 },
    { header: 'تاريخ الاستحقاق', key: 'dueDate', width: 15 },
    { header: 'الحالة', key: 'status', width: 12 },
    { header: 'نوع الائتمان', key: 'creditType', width: 15 },
  ];

  // Main table headers
  const headerRow = worksheet.getRow(contentStartRow);
  headerRow.values = [
    'تاريخ الائتمان', 'المبلغ الممنوح', 'المبلغ المستخدم', 'الرصيد المتاح', 
    'تاريخ الاستحقاق', 'الحالة', 'نوع الائتمان'
  ];
  headerRow.eachCell(cell => {
    cell.style = styles.mainHeader;
  });
  headerRow.height = 25;

  // Add credits data
  let currentRow = contentStartRow + 1;
  credits.forEach((credit, index) => {
    const row = worksheet.getRow(currentRow);
    
    // Map status to Arabic
    const statusArabic = {
      'active': 'نشط',
      'expired': 'منتهي الصلاحية',
      'used': 'مستخدم بالكامل',
      'suspended': 'معلق'
    }[credit.status] || credit.status;

    row.values = [
      formatDateForExcel(credit.credit_date),
      credit.amount_granted || 0,
      credit.amount_used || 0,
      credit.amount_available || 0,
      formatDateForExcel(credit.due_date),
      statusArabic,
      credit.credit_type || '',
    ];

    // Apply data cell styling with alternating rows
    const isEvenRow = index % 2 === 1;
    
    // Date cells
    row.getCell(1).style = { ...styles.dataCellCenter(isEvenRow), ...styles.dateFormat };
    row.getCell(5).style = { ...styles.dataCellCenter(isEvenRow), ...styles.dateFormat };
    
    // Amount cells
    row.getCell(2).style = { ...styles.dataCellCenter(isEvenRow), ...styles.currency };
    row.getCell(3).style = { 
      ...styles.dataCellCenter(isEvenRow), 
      ...styles.currency,
      font: { ...styles.currency.font, color: { argb: 'FF9C0006' } } // Red for used
    };
    row.getCell(4).style = { 
      ...styles.dataCellCenter(isEvenRow), 
      ...styles.currency,
      font: { ...styles.currency.font, color: { argb: 'FF006100' } } // Green for available
    };
    
    // Status with conditional formatting
    const statusCell = row.getCell(6);
    const statusStyle = creditStatusStyles[credit.status as keyof typeof creditStatusStyles];
    statusCell.style = { ...styles.dataCellCenter(isEvenRow), ...(statusStyle || {}) };
    
    // Credit type
    row.getCell(7).style = styles.dataCellCenter(isEvenRow);

    row.height = 20;
    currentRow++;
  });

  // Add credit summary dashboard on the right side
  const summaryStartRow = contentStartRow;
  const summaryColumn = 9; // Column I

  // Summary header
  const summaryHeaderCell = worksheet.getCell(summaryStartRow, summaryColumn);
  summaryHeaderCell.value = 'ملخص الائتمانات';
  summaryHeaderCell.style = {
    font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
    alignment: { horizontal: 'center' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
    border: {
      top: { style: 'medium' },
      left: { style: 'medium' },
      bottom: { style: 'medium' },
      right: { style: 'medium' },
    },
  };
  worksheet.mergeCells(summaryStartRow, summaryColumn, summaryStartRow, summaryColumn + 1);

  // Summary items
  const summaryItems = [
    ['إجمالي الائتمان الممنوح', summary.total_granted],
    ['إجمالي المستخدم', summary.total_used],
    ['إجمالي المتاح', summary.total_available],
    ['عدد الائتمانات النشطة', summary.active_credits],
    ['عدد الائتمانات المنتهية', summary.expired_credits],
    ['نسبة الاستخدام', `${calculatePercentage(summary.total_used, summary.total_granted)}%`],
  ];

  let summaryRowIndex = summaryStartRow + 2;
  summaryItems.forEach(([label, value]) => {
    const labelCell = worksheet.getCell(summaryRowIndex, summaryColumn);
    const valueCell = worksheet.getCell(summaryRowIndex, summaryColumn + 1);
    
    labelCell.value = label;
    valueCell.value = value;
    
    labelCell.style = {
      font: { bold: true },
      alignment: { horizontal: 'right' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };
    
    if (typeof value === 'number' && label.toString().includes('مبلغ')) {
      valueCell.style = {
        ...styles.currency,
        font: { bold: true },
        alignment: { horizontal: 'center' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      };
    } else {
      valueCell.style = {
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
    
    summaryRowIndex++;
  });

  // Add overall summary at the bottom
  worksheet.addRow([]); // Spacer
  currentRow++;

  const finalSummaryHeaderRow = worksheet.addRow(['ملخص إجمالي الائتمانات']);
  worksheet.mergeCells(currentRow, 1, currentRow, 7);
  finalSummaryHeaderRow.getCell(1).style = styles.reportTitle;
  currentRow++;

  const finalSummaryItems = [
    ['إجمالي الائتمان الممنوح', summary.total_granted],
    ['إجمالي المستخدم', summary.total_used],
    ['إجمالي المتاح', summary.total_available],
    ['نسبة الاستخدام', `${calculatePercentage(summary.total_used, summary.total_granted)}%`],
  ];

  finalSummaryItems.forEach(([label, value]) => {
    const summaryRow = worksheet.addRow(['', '', '', '', '', label, value]);
    summaryRow.getCell(6).style = styles.totalLabel;
    
    if (typeof value === 'number') {
      summaryRow.getCell(7).style = styles.totalValue();
    } else {
      summaryRow.getCell(7).style = {
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
