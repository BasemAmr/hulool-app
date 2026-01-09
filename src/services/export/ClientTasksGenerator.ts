// src/services/export/ClientTasksGenerator.ts
import type { Workbook } from 'exceljs';
import {
  setupWorksheet,
  addReportHeader,
  addClientSummaryDashboard,
  styles,
  taskStatusStyles,
  applyOverdueConditionalFormatting,
  autoSizeColumns
} from './excelStyles';
import type { ClientTasksReportData, ExportOptions } from './exportTypes';
import { formatDateForExcel, formatTaskStatusArabic, formatTaskTypeArabic, calculateDurationDays } from '../../utils/formatUtils';

/**
 * Generate Excel report for all tasks of a specific client
 * Implements "مهام العميل" specification with enhanced dashboard
 */
export function generateClientTasksExcel(
  workbook: Workbook,
  data: ClientTasksReportData,
  _options?: ExportOptions
) {
  const { client, tasks, summary } = data;
  const worksheet = workbook.addWorksheet(`${client.name} - المهام`);

  setupWorksheet(worksheet);

  // Add report header
  const reportTitle = `تقرير مهام العميل: ${client.name}`;
  const contentStartRow = addReportHeader(worksheet, reportTitle, 10);

  // Add summary dashboard at the top
  const summaryData = {
    'إجمالي المهام': summary.total_tasks,
    'مهام منجزة': summary.completed_tasks,
    'مهام قيد التنفيذ': summary.in_progress_tasks,
    'مهام جديدة': summary.new_tasks,
    'مهام ملغية': summary.cancelled_tasks,
    'إجمالي المبالغ': summary.total_amount,
    'إجمالي المدفوع': summary.total_paid,
    'المتبقي': summary.total_remaining,
    'متوسط أيام الإنجاز': summary.average_completion_days,
  };

  const dashboardEndRow = addClientSummaryDashboard(worksheet, contentStartRow, summaryData);

  // Define columns for task table (enhanced as per specification)
  worksheet.columns = [
    { header: 'رقم المهمة', key: 'taskNumber', width: 12 },
    { header: 'الخدمة المقدمة', key: 'serviceName', width: 25 },
    { header: 'النوع', key: 'taskType', width: 15 },
    { header: 'تاريخ البداية', key: 'startDate', width: 12 },
    { header: 'تاريخ الانتهاء', key: 'endDate', width: 12 },
    { header: 'المدة (أيام)', key: 'durationDays', width: 10 },
    { header: 'الحالة', key: 'status', width: 12 },
    { header: 'المبلغ', key: 'amount', width: 15 },
    { header: 'المدفوع', key: 'amountPaid', width: 15 },
    { header: 'المتبقي', key: 'amountRemaining', width: 15 },
  ];

  // Task table headers
  const taskTableStartRow = dashboardEndRow + 2;
  const headerRow = worksheet.getRow(taskTableStartRow);
  headerRow.values = [
    'رقم المهمة', 'الخدمة المقدمة', 'النوع', 'تاريخ البداية', 'تاريخ الانتهاء',
    'المدة (أيام)', 'الحالة', 'المبلغ', 'المدفوع', 'المتبقي'
  ];
  headerRow.eachCell(cell => {
    cell.style = styles.mainHeader;
  });
  headerRow.height = 25;

  // Add task data
  let currentRow = taskTableStartRow + 1;
  tasks.forEach((task, index) => {
    const row = worksheet.getRow(currentRow);

    const statusArabic = formatTaskStatusArabic(task.status);
    const typeArabic = formatTaskTypeArabic(task.type);
    const duration = task.end_date ? calculateDurationDays(task.start_date, task.end_date) : null;

    row.values = [
      task.id, // Auto-increment task number
      task.task_name || task.service_name || '',
      typeArabic,
      formatDateForExcel(task.start_date),
      task.end_date ? formatDateForExcel(task.end_date) : '',
      duration,
      statusArabic,
      task.amount || 0,
      task.amount_paid || 0,
      task.amount_remaining || 0,
    ];

    // Apply data cell styling with alternating rows
    const isEvenRow = index % 2 === 1;

    // Task number and service name
    row.getCell(1).style = styles.dataCellCenter(isEvenRow);
    row.getCell(2).style = { ...styles.dataCell(isEvenRow), alignment: { ...styles.dataCell(isEvenRow).alignment, wrapText: true } };

    // Type and dates
    row.getCell(3).style = styles.dataCellCenter(isEvenRow);
    row.getCell(4).style = { ...styles.dataCellCenter(isEvenRow), ...styles.dateFormat };

    // End date with overdue formatting
    const endDateCell = row.getCell(5);
    endDateCell.style = { ...styles.dataCellCenter(isEvenRow), ...styles.dateFormat };
    if (task.end_date && task.is_overdue) {
      applyOverdueConditionalFormatting(endDateCell, task.end_date, task.status);
    }

    // Duration
    row.getCell(6).style = styles.dataCellCenter(isEvenRow);

    // Status with conditional formatting
    const statusCell = row.getCell(7);
    const statusStyle = taskStatusStyles[statusArabic as keyof typeof taskStatusStyles];
    statusCell.style = { ...styles.dataCellCenter(isEvenRow), ...(statusStyle || {}) };

    // Amount columns
    row.getCell(8).style = { ...styles.dataCellCenter(isEvenRow), ...styles.currency };
    row.getCell(9).style = {
      ...styles.dataCellCenter(isEvenRow),
      ...styles.currency,
      font: { ...styles.currency.font, color: { argb: 'FF006100' } } // Green for paid
    };
    row.getCell(10).style = {
      ...styles.dataCellCenter(isEvenRow),
      ...styles.currency,
      font: { ...styles.currency.font, color: { argb: 'FF9C0006' } } // Red for remaining
    };

    row.height = 20;
    currentRow++;
  });

  // Add task summary section
  worksheet.addRow([]); // Spacer
  currentRow++;

  // Final summary header
  const finalSummaryHeaderRow = worksheet.addRow(['ملخص إجمالي المهام']);
  worksheet.mergeCells(currentRow, 1, currentRow, 10);
  finalSummaryHeaderRow.getCell(1).style = styles.reportTitle;
  currentRow++;

  // Final summary data
  const finalSummaryItems = [
    ['إجمالي عدد المهام', '', '', '', '', '', '', summary.total_tasks],
    ['إجمالي المبالغ', '', '', '', '', '', '', summary.total_amount],
    ['إجمالي المدفوع', '', '', '', '', '', '', summary.total_paid],
    ['إجمالي المتبقي', '', '', '', '', '', '', summary.total_remaining],
  ];

  finalSummaryItems.forEach(([label, , , , , , , value]) => {
    const summaryRow = worksheet.addRow([label, '', '', '', '', '', '', value]);
    summaryRow.getCell(1).style = styles.totalLabel;

    if (typeof value === 'number' && label.toString().includes('مبلغ')) {
      summaryRow.getCell(8).style = styles.totalValue();
    } else {
      summaryRow.getCell(8).style = {
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
