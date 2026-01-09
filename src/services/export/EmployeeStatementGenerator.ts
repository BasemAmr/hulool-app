// src/services/export/EmployeeStatementGenerator.ts
import type { Workbook } from 'exceljs';
import {
    setupWorksheet,
    addReportHeader,
    styles,
    applyReceivablesConditionalFormatting,
    autoSizeColumns,
    COLORS
} from './excelStyles';
import type { EmployeeStatementReportData, ExportOptions } from './exportTypes';
import { formatDateForExcel } from '../../utils/formatUtils';

/**
 * Generate Excel report for employee financial statement
 * Implements "كشف حساب الموظف" specification
 */
export function generateEmployeeStatementExcel(
    workbook: Workbook,
    data: EmployeeStatementReportData,
    options?: ExportOptions
) {
    const { employeeName, period, openingBalance, transactions, summary } = data;
    const worksheet = workbook.addWorksheet(`كشف حساب - ${employeeName}`);

    setupWorksheet(worksheet);

    // Add report header
    const reportTitle = `كشف حساب الموظف: ${employeeName}`;
    const contentStartRow = addReportHeader(worksheet, reportTitle, 6);

    // Add period information
    const periodRow = worksheet.addRow([`الفترة: ${period.month_name} ${period.year}`]);
    worksheet.mergeCells(contentStartRow + 1, 1, contentStartRow + 1, 6);
    periodRow.getCell(1).style = {
        font: { bold: true, size: 12 },
        alignment: { horizontal: 'center' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } },
    };

    worksheet.addRow([]); // Spacer

    // Define table columns
    const tableStartRow = contentStartRow + 4;

    // Table headers
    const headerRow = worksheet.getRow(tableStartRow);
    headerRow.values = ['اسم العميل', 'البيان', 'المدين', 'الدائن', 'الرصيد', 'التاريخ'];
    headerRow.eachCell(cell => {
        cell.style = styles.mainHeader;
    });
    headerRow.height = 25;

    // Set column widths optimized for A4 landscape printing
    worksheet.getColumn(1).width = 18; // Client name
    worksheet.getColumn(2).width = 28; // Description
    worksheet.getColumn(3).width = 12; // Debit
    worksheet.getColumn(4).width = 12; // Credit
    worksheet.getColumn(5).width = 12; // Balance
    worksheet.getColumn(6).width = 12; // Date

    let currentRow = tableStartRow + 1;

    // Opening Balance Row
    const openingRow = worksheet.getRow(currentRow);
    openingRow.values = [
        '-',
        'رصيد افتتاحي',
        openingBalance.total_debit > 0 ? openingBalance.total_debit : '-',
        openingBalance.total_credit > 0 ? openingBalance.total_credit : '-',
        openingBalance.balance,
        '-'
    ];

    // Style opening balance row
    openingRow.eachCell((cell, colNumber) => {
        const baseStyle = styles.dataCell(false);
        cell.style = {
            ...baseStyle,
            font: { ...baseStyle.font, bold: true },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } }, // Light green
        };

        if (colNumber === 3 && openingBalance.total_debit > 0) {
            cell.style = { ...cell.style, font: { ...cell.font, color: { argb: 'FF006100' }, bold: true }, numFmt: '#,##0.00' };
        }
        if (colNumber === 4 && openingBalance.total_credit > 0) {
            cell.style = { ...cell.style, font: { ...cell.font, color: { argb: 'FF9C0006' }, bold: true }, numFmt: '#,##0.00' };
        }
        if (colNumber === 5) {
            cell.style = { ...cell.style, numFmt: '#,##0.00' };
            applyReceivablesConditionalFormatting(cell, openingBalance.balance);
        }
    });
    openingRow.height = 22;
    currentRow++;

    // Transaction Rows
    transactions.forEach((transaction, index) => {
        const isEvenRow = index % 2 === 1;
        const row = worksheet.getRow(currentRow);

        const debitValue = transaction.direction === 'income' ? transaction.amount : null;
        const creditValue = transaction.direction === 'expense' ? transaction.amount : null;

        row.values = [
            transaction.client_name || (transaction.direction === 'income' ? 'سند قبض' : 'سند صرف'),
            transaction.description,
            debitValue || '-',
            creditValue || '-',
            transaction.running_balance,
            formatDateForExcel(transaction.date)
        ];

        // Apply styles
        row.eachCell((cell, colNumber) => {
            const baseStyle = styles.dataCell(isEvenRow);
            cell.style = baseStyle;

            // Client name column - bold
            if (colNumber === 1) {
                cell.style = { ...baseStyle, font: { ...baseStyle.font, bold: true } };
            }

            // Debit column - green for income
            if (colNumber === 3 && debitValue) {
                cell.style = {
                    ...styles.dataCellCenter(isEvenRow),
                    font: { bold: true, color: { argb: 'FF006100' } },
                    numFmt: '#,##0.00'
                };
            } else if (colNumber === 3) {
                cell.style = styles.dataCellCenter(isEvenRow);
            }

            // Credit column - red for expense
            if (colNumber === 4 && creditValue) {
                cell.style = {
                    ...styles.dataCellCenter(isEvenRow),
                    font: { bold: true, color: { argb: 'FF9C0006' } },
                    numFmt: '#,##0.00'
                };
            } else if (colNumber === 4) {
                cell.style = styles.dataCellCenter(isEvenRow);
            }

            // Balance column with conditional formatting
            if (colNumber === 5) {
                cell.style = { ...styles.dataCellCenter(isEvenRow), numFmt: '#,##0.00', font: { bold: true } };
                applyReceivablesConditionalFormatting(cell, transaction.running_balance);
            }

            // Date column - centered
            if (colNumber === 6) {
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
        'الإجماليات',
        summary.total_to_date_income,
        summary.total_to_date_expenses,
        summary.closing_balance,
        '-'
    ];

    totalsRow.eachCell((cell, colNumber) => {
        cell.style = {
            font: { bold: true, size: 12 },
            alignment: { horizontal: 'center', vertical: 'middle' },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } },
            border: {
                top: { style: 'medium', color: { argb: COLORS.border } },
                left: { style: 'thin', color: { argb: COLORS.border } },
                bottom: { style: 'medium', color: { argb: COLORS.border } },
                right: { style: 'thin', color: { argb: COLORS.border } },
            },
        };

        if (colNumber === 3) {
            cell.style = { ...cell.style, font: { ...cell.font, color: { argb: 'FF006100' } }, numFmt: '#,##0.00' };
        }
        if (colNumber === 4) {
            cell.style = { ...cell.style, font: { ...cell.font, color: { argb: 'FF9C0006' } }, numFmt: '#,##0.00' };
        }
        if (colNumber === 5) {
            cell.style = { ...cell.style, numFmt: '#,##0.00' };
            applyReceivablesConditionalFormatting(cell, summary.closing_balance);
        }
    });
    totalsRow.height = 25;

    // Auto-size columns for better readability
    autoSizeColumns(worksheet);

    return worksheet;
}
