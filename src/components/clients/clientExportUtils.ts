import * as XLSX from 'xlsx';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Client } from '../../api/types';
// Temporarily commented out unused imports
// import { loadFontAsBase64, FONT_PATHS } from '../../utils/fontUtils';

// Configure pdfMake with base fonts
pdfMake.vfs = pdfFonts.vfs;

// Initialize fonts flag
// Temporarily commented out unused variables
// let fontsLoaded: boolean | string = false;

// Function to load Arabic fonts
// const loadArabicFonts = async () => {
//   if (fontsLoaded) return;
  
//   try {
//     // Ensure VFS is initialized
//     if (!pdfMake.vfs) {
//       pdfMake.vfs = {};
//     }

//     const [amiriRegular, amiriBold, amiriItalic, amiriBoldItalic] = await Promise.all([
//       loadFontAsBase64(FONT_PATHS.amiriRegular),
//       loadFontAsBase64(FONT_PATHS.amiriBold),
//       loadFontAsBase64(FONT_PATHS.amiriItalic),
//       loadFontAsBase64(FONT_PATHS.amiriBoldItalic)
//     ]);

//     // Add fonts to virtual file system
//     pdfMake.vfs['Amiri-Regular.ttf'] = amiriRegular;
//     pdfMake.vfs['Amiri-Bold.ttf'] = amiriBold;
//     pdfMake.vfs['Amiri-Italic.ttf'] = amiriItalic;
//     pdfMake.vfs['Amiri-BoldItalic.ttf'] = amiriBoldItalic;

//     // Register fonts with pdfMake
//     pdfMake.fonts = {
//       Roboto: {
//         normal: 'Roboto-Regular.ttf',
//         bold: 'Roboto-Medium.ttf',
//         italics: 'Roboto-Italic.ttf',
//         bolditalics: 'Roboto-MediumItalic.ttf'
//       },
//       Amiri: {
//         normal: 'Amiri-Regular.ttf',
//         bold: 'Amiri-Bold.ttf',
//         italics: 'Amiri-Italic.ttf',
//         bolditalics: 'Amiri-BoldItalic.ttf'
//       }
//     };

//     fontsLoaded = true;
//     console.log('Arabic fonts loaded successfully');
//   } catch (error) {
//     console.error('Failed to load Arabic fonts:', error);
//     // Fallback to default fonts only
//     pdfMake.fonts = {
//       Roboto: {
//         normal: 'Roboto-Regular.ttf',
//         bold: 'Roboto-Medium.ttf',
//         italics: 'Roboto-Italic.ttf',
//         bolditalics: 'Roboto-MediumItalic.ttf'
//       }
//     };
//     // Set a flag to use Roboto instead of Amiri
//     fontsLoaded = 'fallback';
//   }
// };

const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined || amount === null) return '0.00 ريال';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2
  }).format(amount);
};

export const exportClientsToExcel = (clients: Client[]) => {
  // إنشاء مصنف جديد
  const wb = XLSX.utils.book_new();
  
  // إعداد البيانات مع الرؤوس
  const wsData = [
    // العنوان الرئيسي
    ["تقرير العملاء والمستحقات المالية"],
    [`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`],
    [""], // صف فارغ
    
    // رؤوس الجدول
    ["اسم العميل", "رقم الهاتف", "الملاحظات", "المبلغ المستحق (ريال)"],
    
    // صفوف البيانات
    ...clients.map(client => [
      client.name,
      client.phone,
      client.notes || '-',
      client.total_outstanding || 0
    ]),
    
    [""], // صف فارغ
    ["الملخص المالي"],
    ["إجمالي المستحقات:", clients.reduce((sum, client) => sum + (client.total_outstanding || 0), 0)],
    ["عدد العملاء:", clients.length],
    ["متوسط المستحقات:", clients.length > 0 ? Math.round(clients.reduce((sum, client) => sum + (client.total_outstanding || 0), 0) / clients.length) : 0]
  ];

  // إنشاء ورقة العمل
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // تعيين عرض الأعمدة
  ws['!cols'] = [
    { width: 25 }, // اسم العميل
    { width: 18 }, // رقم الهاتف
    { width: 35 }, // الملاحظات
    { width: 20 }  // المبلغ المستحق
  ];

  // دمج الخلايا للعنوان
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // العنوان الرئيسي
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }  // التاريخ
  ];

  // Apply styles and other Excel specific settings...
  // (Excel styles code from the original implementation would go here)

  // إضافة ورقة العمل إلى المصنف
  XLSX.utils.book_append_sheet(wb, ws, "تقرير العملاء");

  // إنشاء وتحميل الملف
  const fileName = `تقرير_العملاء_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// export const exportClientsToPDF = async (clients: Client[]) => {
//   // Load Arabic fonts before creating PDF
//   await loadArabicFonts();
  
//   // Calculate totals
//   const totalOutstanding = clients.reduce((sum, client) => sum + (client.total_outstanding || 0), 0);
//   const avgOutstanding = clients.length > 0 ? totalOutstanding / clients.length : 0;
  
//   // Create document definition
//   const docDefinition = {
//     // Use RTL for Arabic support
//     pageOrientation: 'landscape' as const,
//     rtl: true,
//     defaultStyle: {
//       font: 'Amiri' // Use Arabic-compatible font
//     },
    
//     content: [
//       // Header section
//       {
//         stack: [
//           { text: 'تقرير العملاء والمستحقات المالية', style: 'header' },
//           { text: `تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`, style: 'subheader' }
//         ],
//         alignment: 'center' as const,
//         margin: [0, 0, 0, 20] as [number, number, number, number]
//       },
      
//       // Table
//       {
//         table: {
//           headerRows: 1,
//           widths: ['*', 'auto', 'auto', 'auto'],
//           body: [
//             // Header row
//             [
//               { text: 'اسم العميل', style: 'tableHeader' },
//               { text: 'رقم الهاتف', style: 'tableHeader' },
//               { text: 'الملاحظات', style: 'tableHeader' },
//               { text: 'المبلغ المستحق (ريال)', style: 'tableHeader' }
//             ],
//             // Client rows
//             ...clients.map(client => [
//               client.name,
//               client.phone,
//               client.notes || '-',
//               { text: formatCurrency(client.total_outstanding), alignment: 'center' as const }
//             ])
//           ]
//         }
//       },
      
//       // Summary section
//       {
//         stack: [
//           { text: 'الملخص المالي', style: 'sectionHeader', margin: [0, 20, 0, 10] as [number, number, number, number] },
//           { text: `إجمالي المستحقات: ${formatCurrency(totalOutstanding)}`, margin: [0, 5, 0, 0] as [number, number, number, number] },
//           { text: `عدد العملاء: ${clients.length}`, margin: [0, 5, 0, 0] as [number, number, number, number] },
//           { text: `متوسط المستحقات: ${formatCurrency(avgOutstanding)}`, margin: [0, 5, 0, 0] as [number, number, number, number] }
//         ],
//         margin: [0, 20, 0, 0] as [number, number, number, number]
//       }
//     ],
    
//     styles: {
//       header: {
//         fontSize: 22,
//         bold: true,
//         margin: [0, 0, 0, 10],
//         color: '#2C3E50'
//       },
//       subheader: {
//         fontSize: 14,
//         color: '#34495E',
//         margin: [0, 0, 0, 5]
//       },
//       tableHeader: {
//         bold: true,
//         fontSize: 12,
//         color: 'white',
//         fillColor: '#3498DB',
//         alignment: 'center' as const
//       },
//       sectionHeader: {
//         fontSize: 16,
//         bold: true,
//         color: '#2C3E50',
//         decoration: 'underline'
//       }
//     },
    
//     footer: function(currentPage: number, pageCount: number) {
//       return {
//         columns: [
//           { text: `صفحة ${currentPage} من ${pageCount}`, alignment: 'center' as const }
//         ],
//         margin: [40, 20] as [number, number]
//       };
//     }
//   };
  
//   // Generate and download PDF
//   pdfMake.createPdf(docDefinition).download(`تقرير_العملاء_${new Date().toISOString().split('T')[0]}.pdf`);
// };

export const printClientsReport = (clients: Client[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const totalOutstanding = clients.reduce((sum, client) => sum + (client.total_outstanding || 0), 0);
  const avgOutstanding = clients.length > 0 ? Math.round(totalOutstanding / clients.length) : 0;

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تقرير العملاء</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                direction: rtl;
                text-align: right;
                margin: 20px;
                color: #2c3e50;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #3498db;
                padding-bottom: 20px;
            }
            .header h1 {
                color: #2c3e50;
                font-size: 24px;
                margin-bottom: 10px;
            }
            .header .date {
                color: #7f8c8d;
                font-size: 14px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            th, td {
                padding: 12px;
                text-align: center;
                border: 1px solid #bdc3c7;
            }
            th {
                background-color: #3498db;
                color: white;
                font-weight: bold;
                font-size: 14px;
            }
            tr:nth-child(even) {
                background-color: #f8f9fa;
            }
            tr:hover {
                background-color: #e8f4f8;
            }
            .amount {
                font-weight: bold;
                color: #27ae60;
            }
            .summary {
                background-color: #ecf0f1;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #3498db;
            }
            .summary h3 {
                color: #2c3e50;
                margin-bottom: 15px;
                border-bottom: 2px solid #3498db;
                padding-bottom: 10px;
            }
            .summary-item {
                margin: 10px 0;
                font-size: 16px;
            }
            .summary-item strong {
                color: #27ae60;
            }
            @media print {
                body { margin: 0; }
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>تقرير العملاء والمستحقات المالية</h1>
            <div class="date">تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>اسم العميل</th>
                    <th>رقم الهاتف</th>
                    <th>الملاحظات</th>
                    <th>المبلغ المستحق (ريال)</th>
                </tr>
            </thead>
            <tbody>
                ${clients.map(client => `
                    <tr>
                        <td>${client.name}</td>
                        <td>${client.phone}</td>
                        <td>${client.notes || '-'}</td>
                        <td class="amount">${new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'SAR'
                        }).format(client.total_outstanding || 0)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="summary">
            <h3>الملخص المالي</h3>
            <div class="summary-item">إجمالي المستحقات: <strong>${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'SAR'
            }).format(totalOutstanding)}</strong></div>
            <div class="summary-item">عدد العملاء: <strong>${clients.length}</strong></div>
            <div class="summary-item">متوسط المستحقات: <strong>${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'SAR'
            }).format(avgOutstanding)}</strong></div>
        </div>

        <script>
            window.onload = function() {
                window.print();
                window.onafterprint = function() {
                    window.close();
                };
            };
        </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};