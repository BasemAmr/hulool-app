import ExcelJS, { type Style } from 'exceljs';
import { saveAs } from 'file-saver';
import { formatDate } from '../../utils/dateUtils';
import type { Receivable, TaskType, StatementItem } from '../../api/types';
import { pdf } from '@react-pdf/renderer';
import ReceivablesPDFDocument from './ReceivablesPDFDocument';

interface ReportTotals {
    totalDebit: number;
    totalCredit: number;
    totalNet: number;
}

/**
 * Exports receivables data to a styled Excel file.
 * Replicates the structure of the ClientReceivablesTable component.
 *
 * @param {Receivable[]} receivables - The array of receivable objects.
 * @param {string} clientName - The name of the client for the report title.
 * @param {ReportTotals} totals - An object containing totalDebit, totalCredit, and totalNet.
 * @param {TFunction} t - The translation function from i18next.
 */
// NOTE: This function now supports BOTH raw Receivable[] and StatementItem[] (combined statement rows)
// It auto-detects by checking for 'debit' & 'credit' keys.
export const exportToExcel = async (receivables: (Receivable | StatementItem)[], clientName: string, totals: ReportTotals) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${clientName} - كشف حساب`);

    // --- Setup: RTL and Column Widths ---
    worksheet.views = [{ rightToLeft: true }];
    worksheet.columns = [
        { key: 'description', width: 40 },
        { key: 'debit', width: 15 },
        { key: 'credit', width: 15 },
        { key: 'balance', width: 15 },
        { key: 'notes', width: 30 },
        { key: 'date', width: 15 },
        { key: 'source', width: 25 },
        { key: 'type', width: 15 },
    ];

    // --- Helper Functions and Styles ---
    const formatCurrency = (amount: number | null | undefined): number => {
        return Number(amount) || 0; // Ensure it's always a number for Excel
    };

    const getTypeBadgeText = (type: TaskType): string => {
        const badgeText: Record<TaskType, string> = {
            Accounting: 'محاسبة',
            RealEstate: 'عقاري',
            Government: 'حكومي',
            Other: 'أخرى',
        };
        return badgeText[type] || badgeText.Other;
    };

    // FIX: Define styles with Partial<Style> to satisfy TypeScript's strict checks
    const titleStyle: Partial<Style> = {
        font: { size: 18, bold: true, color: { argb: 'FFFFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D6EFD' } },
    };

    const mainHeaderStyle: Partial<Style> = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF343A40' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
            top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        },
    };

    const paymentHeaderStyle: Partial<Style> = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C757D' } },
        alignment: { horizontal: 'center' },
        border: {
            top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' },
        },
    };

    const totalLabelStyle: Partial<Style> = {
        font: { bold: true },
        alignment: { horizontal: 'right' },
    };

    const finalBalanceStyle: Partial<Style> = {
        font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D6EFD' } },
        alignment: { horizontal: 'center' },
        border: { top: { style: 'thin' }, bottom: { style: 'thin' } },
    };

    // --- 1. Main Title ---
    worksheet.mergeCells('A1:H1');
    const reportTitleCell = worksheet.getCell('A1');
    reportTitleCell.value = `كشف حساب للعميل ${clientName}`;
    reportTitleCell.style = titleStyle;
    worksheet.getRow(1).height = 30;
    worksheet.addRow([]); // Spacer

    // --- 2. Main Table Header ---
    const mainHeaderRow = worksheet.addRow([
        'الوصف', 'المدين', 'الدائن', 'الرصيد',
        'ملاحظات', 'تاريخ الأمر', 'مصدر الأمر', 'النوع',
    ]);
    mainHeaderRow.eachCell((cell) => { cell.style = mainHeaderStyle; });
    mainHeaderRow.height = 25;

    // --- 3. Data Rows (Receivables and Payments) ---
    receivables.forEach((item) => {
        // Dynamic field resolution (StatementItem vs Receivable)
        const isStatement = Object.prototype.hasOwnProperty.call(item, 'debit');
        const description = (item as any).description;
        const debit = isStatement ? (item as StatementItem).debit : (item as Receivable).amount;
        const credit = isStatement ? (item as StatementItem).credit : (item as Receivable).total_paid;
        const balance = isStatement ? (item as StatementItem).balance : (item as Receivable).remaining_amount;
        const dateRaw = (item as any).date || (item as any).created_at;
        const payments = (item as any).payments || [];
        const typeVal = (item as any).type;
        const notes = (item as any).notes || '—';
        const sourceName = (item as any).client?.name || clientName;

        const receivableRow = worksheet.addRow({
            description,
            debit: formatCurrency(debit),
            credit: formatCurrency(credit),
            balance: formatCurrency(balance),
            notes,
            date: dateRaw ? formatDate(dateRaw) : '—',
            source: sourceName,
            type: getTypeBadgeText(typeVal as TaskType),
        });

        receivableRow.getCell('debit').font = { color: { argb: 'FFDC3545' }, bold: true };
        receivableRow.getCell('credit').font = { color: { argb: 'FF198754' }, bold: true };
        receivableRow.getCell('balance').font = { color: { argb: 'FF0D6EFD' }, bold: true };
        receivableRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.alignment = { vertical: 'middle', horizontal: colNumber > 1 ? 'center' : 'right' };
            cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } };
            const colKey = worksheet.columns[colNumber - 1].key;
            if (typeof colKey === 'string' && ['debit', 'credit', 'balance'].includes(colKey)) {
                cell.numFmt = '#,##0.00 "SAR"';
            }
        });

        if (payments && payments.length > 0) {
            worksheet.addRow([]);
            const paymentTitleRow = worksheet.addRow(['', 'تفاصيل المدفوعات']);
            worksheet.mergeCells(paymentTitleRow.number, 2, paymentTitleRow.number, 5);
            paymentTitleRow.getCell(2).style = {
                font: { bold: true, color: { argb: 'FF6C757D' } },
                alignment: { horizontal: 'center' },
            };

            const paymentHeader = worksheet.addRow(['', 'المبلغ', 'ملاحظات', 'التاريخ', 'طريقة الدفع']);
            for (let i = 2; i <= 5; i++) {
                paymentHeader.getCell(i).style = paymentHeaderStyle;
            }

            payments.forEach((payment: any) => {
                const paymentRow = worksheet.addRow([
                    '',
                    formatCurrency(payment.amount),
                    payment.note || '—',
                    payment.paid_at ? formatDate(payment.paid_at) : '—',
                    payment.payment_method?.name_ar || 'غير محدد',
                ]);
                paymentRow.getCell(2).font = { color: { argb: 'FF198754' } };
                paymentRow.getCell(2).numFmt = '#,##0.00 "SAR"';
                for (let i = 2; i <= 5; i++) {
                    const cell = paymentRow.getCell(i);
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
                    cell.alignment = { horizontal: 'center' };
                    cell.border = {
                        left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
                        right: { style: 'thin', color: { argb: 'FFEEEEEE' } },
                    };
                }
            });
            worksheet.addRow([]);
        }
    });

    // --- 4. Totals Summary Section ---
    worksheet.addRow([]);
    const totalsHeaderRow = worksheet.addRow(['', '', '', '', 'ملخص']);
    worksheet.mergeCells(totalsHeaderRow.number, 5, totalsHeaderRow.number, 8);
    totalsHeaderRow.getCell(5).style = { font: { bold: true, size: 14 }, alignment: { horizontal: 'center' } };

    const totalDebitRow = worksheet.addRow(['', '', '', '', 'إجمالي المدين', formatCurrency(totals.totalDebit)]);
    totalDebitRow.getCell(5).style = totalLabelStyle;
    totalDebitRow.getCell(6).numFmt = '#,##0.00 "SAR"';
    totalDebitRow.getCell(6).font = { bold: true, color: { argb: 'FFDC3545' } };

    const totalCreditRow = worksheet.addRow(['', '', '', '', 'إجمالي الدائن', formatCurrency(totals.totalCredit)]);
    totalCreditRow.getCell(5).style = totalLabelStyle;
    totalCreditRow.getCell(6).numFmt = '#,##0.00 "SAR"';
    totalCreditRow.getCell(6).font = { bold: true, color: { argb: 'FF198754' } };

    const finalBalanceRow = worksheet.addRow(['', '', '', '', 'الرصيد النهائي', formatCurrency(totals.totalNet)]);
    worksheet.mergeCells(finalBalanceRow.number, 5, finalBalanceRow.number, 6);
    finalBalanceRow.getCell(5).style = finalBalanceStyle;
    finalBalanceRow.getCell(5).numFmt = '#,##0.00 "SAR"';
    finalBalanceRow.height = 25;

    // --- 5. Generate and Download File ---
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `كشف_حساب_${clientName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Exports receivables data to a styled PDF file using React-PDF
 */
export const exportToPDF = async (receivables: (Receivable | StatementItem)[], clientName: string, totals: ReportTotals) => {
    try {
        console.log("Generating PDF with React-PDF...");
        
        // Import React dynamically
        const React = await import('react');
        
        // Generate PDF blob using the PDF component
        const pdfElement = React.createElement(ReceivablesPDFDocument, {
            receivables,
            clientName,
            totals
        });
        
        // @ts-ignore - Suppress type checking for React component
        const blob = await pdf(pdfElement as any).toBlob();
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${clientName}_كشف_حساب_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log("PDF generated and downloaded successfully");
    } catch (error) {
        console.error("PDF generation error:", error);
        alert("Failed to generate PDF. Please check console for details.");
    }
};