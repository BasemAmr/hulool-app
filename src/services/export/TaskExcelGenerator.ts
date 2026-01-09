// src/services/export/TaskExcelGenerator.ts
import type { Workbook } from 'exceljs';
import {
  setupWorksheet,
  addReportHeader,
  styles,
  taskStatusStyles,
  applyOverdueConditionalFormatting,
  autoSizeColumns
} from './excelStyles';
import type { AllTasksReportData, ExportOptions } from './exportTypes';
import { formatDateForExcel, formatTaskStatusArabic, formatTaskTypeArabic } from '../../utils/formatUtils';

/**
 * Generate Excel report for all tasks across all clients
 * Implements "تصدير جميع المهام" specification
 */
export function generateAllTasksExcel(
  workbook: Workbook,
  data: AllTasksReportData,
  _options?: ExportOptions
) {
  const { tasks, summary } = data;
  const worksheet = workbook.addWorksheet('المهام - Tasks');

  setupWorksheet(worksheet);

  // Add report header
  const contentStartRow = addReportHeader(worksheet, 'تقرير جميع المهام', 9);

  // Define columns optimized for A4 landscape printing
  worksheet.columns = [
    { header: 'العميل', key: 'clientName', width: 16 },
    { header: 'رقم الجوال', key: 'clientPhone', width: 13 },
    { header: 'الخدمة المقدمة', key: 'serviceName', width: 20 },
    { header: 'النوع', key: 'taskType', width: 12 },
    { header: 'الملاحظات', key: 'notes', width: 20 },
    { header: 'الحالة', key: 'status', width: 10 },
    { header: 'تاريخ بداية الأمر', key: 'startDate', width: 13 },
    { header: 'تاريخ الانتهاء', key: 'endDate', width: 13 },
    { header: 'المبلغ', key: 'amount', width: 12 },
  ];

  // Position headers at content start row
  const headerRow = worksheet.getRow(contentStartRow);
  headerRow.values = [
    'العميل', 'رقم الجوال', 'الخدمة المقدمة', 'النوع', 'الملاحظات',
    'الحالة', 'تاريخ بداية الأمر', 'تاريخ الانتهاء', 'المبلغ'
  ];
  headerRow.eachCell(cell => {
    cell.style = styles.mainHeader;
  });
  headerRow.height = 25;

  // Add task data
  let currentRow = contentStartRow + 1;
  tasks.forEach((task, index) => {
    const row = worksheet.getRow(currentRow);

    const statusArabic = formatTaskStatusArabic(task.status);
    const typeArabic = formatTaskTypeArabic(task.type);

    row.values = [
      task.client_name || '',
      task.client_phone ? `+966${task.client_phone.replace(/^\+?966/, '')}` : '',
      task.task_name || task.service_name || '',
      typeArabic,
      task.notes || '',
      statusArabic,
      formatDateForExcel(task.start_date),
      task.end_date ? formatDateForExcel(task.end_date) : '',
      task.amount || 0,
    ];

    // Apply data cell styling with alternating rows
    const isEvenRow = index % 2 === 1;
    row.getCell(1).style = styles.dataCell(isEvenRow); // Client name
    row.getCell(2).style = styles.dataCellCenter(isEvenRow); // Phone
    row.getCell(3).style = styles.dataCell(isEvenRow); // Service name
    row.getCell(4).style = styles.dataCellCenter(isEvenRow); // Type
    row.getCell(5).style = { ...styles.dataCell(isEvenRow), alignment: { ...styles.dataCell(isEvenRow).alignment, wrapText: true } }; // Notes

    // Status cell with conditional formatting
    const statusCell = row.getCell(6);
    const statusStyle = taskStatusStyles[statusArabic as keyof typeof taskStatusStyles];
    statusCell.style = { ...styles.dataCellCenter(isEvenRow), ...(statusStyle || {}) };

    // Date cells
    row.getCell(7).style = { ...styles.dataCellCenter(isEvenRow), ...styles.dateFormat };
    const endDateCell = row.getCell(8);
    endDateCell.style = { ...styles.dataCellCenter(isEvenRow), ...styles.dateFormat };

    // Apply overdue formatting if applicable
    if (task.end_date && task.is_overdue) {
      applyOverdueConditionalFormatting(endDateCell, task.end_date, task.status);
    }

    // Amount cell
    row.getCell(9).style = { ...styles.dataCellCenter(isEvenRow), ...styles.currency };

    row.height = 20;
    currentRow++;
  });

  // Add summary section
  worksheet.addRow([]); // Spacer
  currentRow++;

  // Summary header
  const summaryHeaderRow = worksheet.addRow(['ملخص التقرير']);
  worksheet.mergeCells(currentRow, 1, currentRow, 9);
  summaryHeaderRow.getCell(1).style = styles.reportTitle;
  currentRow++;

  // Summary statistics
  const summaryItems = [
    ['إجمالي المهام', summary.total_tasks],
    ['مهام جديدة', summary.tasks_new],
    ['مهام جاري تنفيذها', summary.tasks_in_progress],
    ['مهام منجزة', summary.tasks_completed],
    ['مهام ملغية', summary.tasks_cancelled],
    ['مهام متأخرة', summary.overdue_tasks],
    ['إجمالي المبالغ', summary.total_amount],
    ['إجمالي المدفوع', summary.total_paid],
    ['إجمالي المتبقي', summary.total_remaining],
  ];

  summaryItems.forEach(([label, value]) => {
    const summaryRow = worksheet.addRow(['', '', '', '', '', '', '', label, value]);
    summaryRow.getCell(8).style = styles.totalLabel;

    if (typeof value === 'number' && (label.toString().includes('مبلغ') || label.toString().includes('مدفوع') || label.toString().includes('متبقي'))) {
      summaryRow.getCell(9).style = styles.totalValue();
    } else {
      summaryRow.getCell(9).style = {
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
