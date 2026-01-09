// src/services/export/excelStyles.ts
import type { Workbook, Worksheet, Style, Cell } from 'exceljs';
import { saveAs } from 'file-saver';

// --- Color Palette (from your specification) ---
export const COLORS = {
  headerBg: 'FF4472C4',        // Professional Blue RGB(68, 114, 196)
  headerText: 'FFFFFFFF',      // White
  subHeaderBg: 'FF343A40',     // Dark Gray for sub headers
  rowLight: 'FFF2F2F2',        // Light Gray RGB(242, 242, 242) for alternating rows
  border: 'FFBFBFBF',          // Medium Gray RGB(191, 191, 191)
  success: 'FF70AD47',         // Green RGB(112, 173, 71)
  warning: 'FFFFC000',         // Orange RGB(255, 192, 0)
  error: 'FFFF0000',           // Red RGB(255, 0, 0)
  link: 'FF0D6EFD',            // Blue for links
  summaryBg: 'FFD9D9D9',       // Light gray RGB(217, 217, 217) for summary rows
  creditBg: 'FF9BC2E6',        // Light blue for credits
  debitBg: 'FFFFC7CE',         // Light red for debits
  balancedBg: 'FFC6EFCE',      // Light green for balanced accounts
};

// --- Font Settings ---
export const FONTS = {
  default: { name: 'Calibri', size: 11 },
  header: { name: 'Calibri', size: 12, bold: true },
  title: { name: 'Calibri', size: 14, bold: true },
  large: { name: 'Calibri', size: 18, bold: true },
};

// --- Reusable Style Objects ---
export const styles = {
  // Report title style
  reportTitle: {
    font: { ...FONTS.large, color: { argb: COLORS.headerText } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } },
    border: {
      top: { style: 'medium', color: { argb: COLORS.border } },
      left: { style: 'medium', color: { argb: COLORS.border } },
      bottom: { style: 'medium', color: { argb: COLORS.border } },
      right: { style: 'medium', color: { argb: COLORS.border } },
    },
  } as Partial<Style>,

  // Main column headers
  mainHeader: {
    font: { ...FONTS.header, color: { argb: COLORS.headerText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: COLORS.headerText } },
      left: { style: 'thin', color: { argb: COLORS.headerText } },
      bottom: { style: 'thin', color: { argb: COLORS.headerText } },
      right: { style: 'thin', color: { argb: COLORS.headerText } },
    },
  } as Partial<Style>,

  // Sub-table headers
  subHeader: {
    font: { ...FONTS.default, bold: true, color: { argb: 'FF000000' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: COLORS.border } },
      left: { style: 'thin', color: { argb: COLORS.border } },
      bottom: { style: 'thin', color: { argb: COLORS.border } },
      right: { style: 'thin', color: { argb: COLORS.border } },
    },
  } as Partial<Style>,

  // Summary section labels
  totalLabel: {
    font: { ...FONTS.default, bold: true },
    alignment: { horizontal: 'right', vertical: 'middle' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.summaryBg } },
    border: {
      top: { style: 'thin', color: { argb: COLORS.border } },
      left: { style: 'thin', color: { argb: COLORS.border } },
      bottom: { style: 'thin', color: { argb: COLORS.border } },
      right: { style: 'thin', color: { argb: COLORS.border } },
    },
  } as Partial<Style>,

  // Summary values with customizable color
  totalValue: (color: string = 'FF000000') => ({
    font: { ...FONTS.default, bold: true, color: { argb: color } },
    numFmt: '"SAR" #,##0.00',
    alignment: { horizontal: 'center', vertical: 'middle' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.summaryBg } },
    border: {
      top: { style: 'thin', color: { argb: COLORS.border } },
      left: { style: 'thin', color: { argb: COLORS.border } },
      bottom: { style: 'thin', color: { argb: COLORS.border } },
      right: { style: 'thin', color: { argb: COLORS.border } },
    },
  } as Partial<Style>),

  // Final balance (prominent style)
  finalBalance: {
    font: { ...FONTS.title, color: { argb: COLORS.headerText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'medium', color: { argb: COLORS.border } },
      bottom: { style: 'medium', color: { argb: COLORS.border } },
      left: { style: 'medium', color: { argb: COLORS.border } },
      right: { style: 'medium', color: { argb: COLORS.border } },
    },
    numFmt: '"SAR" #,##0.00',
  } as Partial<Style>,

  // Currency formatting
  currency: {
    numFmt: '"SAR" #,##0.00',
    alignment: { horizontal: 'center', vertical: 'middle' },
  } as Partial<Style>,

  // Date formatting
  dateFormat: {
    numFmt: 'dd/mm/yyyy',
    alignment: { horizontal: 'center', vertical: 'middle' },
  } as Partial<Style>,

  // Standard data cell with alternating rows
  dataCell: (isEvenRow: boolean = false) => ({
    font: FONTS.default,
    alignment: { vertical: 'middle', horizontal: 'right', wrapText: true },
    border: {
      top: { style: 'thin', color: { argb: COLORS.border } },
      left: { style: 'thin', color: { argb: COLORS.border } },
      bottom: { style: 'thin', color: { argb: COLORS.border } },
      right: { style: 'thin', color: { argb: COLORS.border } },
    },
    fill: isEvenRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowLight } } : undefined,
  } as Partial<Style>),

  // Center-aligned data cell
  dataCellCenter: (isEvenRow: boolean = false) => ({
    font: FONTS.default,
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { argb: COLORS.border } },
      left: { style: 'thin', color: { argb: COLORS.border } },
      bottom: { style: 'thin', color: { argb: COLORS.border } },
      right: { style: 'thin', color: { argb: COLORS.border } },
    },
    fill: isEvenRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowLight } } : undefined,
  } as Partial<Style>),
};

// --- Task Status Styles ---
export const taskStatusStyles = {
  'جديدة': { // New
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF9C00' } }, // Orange background
    font: { color: { argb: 'FF9C6500' } }, // Dark orange text
  } as Partial<Style>,
  'جاري': { // In Progress
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.balancedBg } }, // Light green
    font: { color: { argb: 'FF006100' } }, // Dark green text
  } as Partial<Style>,
  'منجزة': { // Completed
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.creditBg } }, // Light blue
    font: { color: { argb: 'FF0C4594' } }, // Dark blue text
  } as Partial<Style>,
  'ملغية': { // Cancelled
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.debitBg } }, // Light red
    font: { color: { argb: 'FF9C0006' } }, // Dark red text
  } as Partial<Style>,
};

// --- Credit Status Styles ---
export const creditStatusStyles = {
  'active': {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.balancedBg } },
    font: { color: { argb: 'FF006100' } },
  } as Partial<Style>,
  'expired': {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.debitBg } },
    font: { color: { argb: 'FF9C0006' } },
  } as Partial<Style>,
  'used': {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E2E2' } },
    font: { color: { argb: 'FF666666' } },
  } as Partial<Style>,
  'suspended': {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } },
    font: { color: { argb: 'FF996300' } },
  } as Partial<Style>,
};

// --- Helper Functions ---

// Set up worksheet with RTL and default properties
export const setupWorksheet = (worksheet: Worksheet) => {
  worksheet.views = [{ rightToLeft: true }]; // Enable RTL for Arabic
  worksheet.properties.defaultRowHeight = 20;
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0, // Fit to width, allow multiple pages vertically
    margins: {
      left: 0.5,
      right: 0.5,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    },
    printArea: undefined,
    printTitlesRow: '1:3', // Repeat header rows on each page
  };
};

// Add a report header spanning multiple columns
export const addReportHeader = (worksheet: Worksheet, title: string, columnSpan: number) => {
  const titleRow = worksheet.addRow([title]);
  worksheet.mergeCells(1, 1, 1, columnSpan);
  titleRow.getCell(1).style = styles.reportTitle;
  titleRow.height = 35;

  // Add date/time stamp
  const dateRow = worksheet.addRow([`تاريخ التقرير: ${new Date().toLocaleDateString('en-US')}`]);
  worksheet.mergeCells(2, 1, 2, columnSpan);
  dateRow.getCell(1).style = {
    font: { ...FONTS.default, italic: true },
    alignment: { horizontal: 'center', vertical: 'middle' },
  };

  worksheet.addRow([]); // Spacer row
  return 3; // Return the row number where content should start
};

// Apply conditional formatting for receivables balance
export const applyReceivablesConditionalFormatting = (cell: Cell, balance: number) => {
  let fillColor: string;
  let textColor: string;

  if (balance > 0) {
    // Debt (positive balance = client owes money)
    fillColor = COLORS.debitBg;
    textColor = 'FF9C0006';
  } else if (balance === 0) {
    // Balanced
    fillColor = COLORS.balancedBg;
    textColor = 'FF006100';
  } else {
    // Credit (negative balance = we owe client)
    fillColor = COLORS.creditBg;
    textColor = 'FF0C4594';
  }

  cell.style = {
    ...cell.style,
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } },
    font: { ...cell.font, color: { argb: textColor } },
  };
};

// Apply conditional formatting for overdue dates
export const applyOverdueConditionalFormatting = (cell: Cell, dueDate: string, status: string) => {
  const today = new Date();
  const due = new Date(dueDate);

  if (due < today && status !== 'منجزة' && status !== 'ملغية') {
    cell.style = {
      ...cell.style,
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.debitBg } },
      font: { ...cell.font, color: { argb: 'FF9C0006' } },
    };
  }
};

// Add summary dashboard for client reports
export const addClientSummaryDashboard = (
  worksheet: Worksheet,
  startRow: number,
  summaryData: Record<string, any>
) => {
  const dashboardStartRow = startRow;

  // Create dashboard header
  const dashboardHeaderRow = worksheet.addRow(['ملخص التقرير']);
  worksheet.mergeCells(dashboardStartRow, 1, dashboardStartRow, 6);
  dashboardHeaderRow.getCell(1).style = {
    ...styles.reportTitle,
    font: { ...FONTS.title, color: { argb: COLORS.headerText } },
  };

  let currentRow = dashboardStartRow + 2;

  // Add summary items
  Object.entries(summaryData).forEach(([key, value]) => {
    const summaryRow = worksheet.addRow(['', key, value]);
    summaryRow.getCell(2).style = styles.totalLabel;

    // Apply appropriate formatting based on value type
    if (typeof value === 'number' && key.includes('مبلغ')) {
      summaryRow.getCell(3).style = styles.totalValue();
    } else {
      summaryRow.getCell(3).style = {
        font: { ...FONTS.default, bold: true },
        alignment: { horizontal: 'center' },
      };
    }
    currentRow++;
  });

  return currentRow + 1; // Return next available row
};

// Save workbook to file
export const saveWorkbook = async (workbook: Workbook, filename: string) => {
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
    const finalFilename = `${filename}_${timestamp}.xlsx`;

    saveAs(blob, finalFilename);
  } catch (error) {
    console.error('Error saving Excel file:', error);
    throw new Error('فشل في حفظ ملف Excel');
  }
};

// Auto-size columns based on content with A4 print optimization
export const autoSizeColumns = (worksheet: Worksheet) => {
  worksheet.columns.forEach(column => {
    if (column.eachCell) {
      let maxLength = 0;
      column.eachCell({ includeEmpty: false }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 0;
        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      });
      // Reduced max width for A4 printing (28 instead of 50)
      column.width = Math.min(Math.max(maxLength + 2, 8), 28);
    }
  });
};
