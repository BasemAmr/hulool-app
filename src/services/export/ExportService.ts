// src/services/export/ExportService.ts
import ExcelJS from 'exceljs';
import { saveWorkbook } from './excelStyles';
import { generateAllClientsExcel } from './ClientExcelGenerator';
import { generateAllTasksExcel } from './TaskExcelGenerator';
import { generateAllReceivablesExcel } from './ReceivableExcelGenerator';
import { generateClientStatementExcel } from './ClientStatementGenerator';
import { generateClientTasksExcel } from './ClientTasksGenerator';
import { generateClientCreditsExcel } from './ClientCreditsGenerator';
import type { 
  AllClientsReportData, 
  AllTasksReportData,
  AllReceivablesReportData,
  ClientStatementReportData,
  ClientTasksReportData,
  ClientCreditsReportData,
  ExportOptions 
} from './exportTypes';

class ExportService {
  /**
   * Export all clients with their receivables summary
   * Implementation of "تصدير جميع العملاء" from specifications
   */
  public async exportAllClients(
    data: AllClientsReportData, 
    options?: ExportOptions
  ): Promise<void> {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Set workbook properties
      workbook.creator = 'نظام إدارة الأعمال';
      workbook.lastModifiedBy = 'نظام إدارة الأعمال';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      generateAllClientsExcel(workbook, data, options);
      
      const filename = options?.customFilename || 'تقرير_جميع_العملاء';
      await saveWorkbook(workbook, filename);
    } catch (error) {
      console.error('Error exporting all clients:', error);
      throw new Error('فشل في تصدير تقرير العملاء');
    }
  }

  /**
   * Export all tasks across all clients
   * Implementation of "تصدير جميع المهام" from specifications
   */
  public async exportAllTasks(
    data: AllTasksReportData, 
    options?: ExportOptions
  ): Promise<void> {
    try {
      const workbook = new ExcelJS.Workbook();
      
      workbook.creator = 'نظام إدارة الأعمال';
      workbook.lastModifiedBy = 'نظام إدارة الأعمال';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      generateAllTasksExcel(workbook, data, options);
      
      const filename = options?.customFilename || 'تقرير_جميع_المهام';
      await saveWorkbook(workbook, filename);
    } catch (error) {
      console.error('Error exporting all tasks:', error);
      throw new Error('فشل في تصدير تقرير المهام');
    }
  }

  /**
   * Export receivables summary for all clients
   * Implementation of "تصدير جميع المستحقات" from specifications
   */
  public async exportAllReceivables(
    data: AllReceivablesReportData, 
    options?: ExportOptions
  ): Promise<void> {
    try {
      const workbook = new ExcelJS.Workbook();
      
      workbook.creator = 'نظام إدارة الأعمال';
      workbook.lastModifiedBy = 'نظام إدارة الأعمال';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      generateAllReceivablesExcel(workbook, data, options);
      
      const filename = options?.customFilename || 'تقرير_جميع_المستحقات';
      await saveWorkbook(workbook, filename);
    } catch (error) {
      console.error('Error exporting all receivables:', error);
      throw new Error('فشل في تصدير تقرير المستحقات');
    }
  }

  /**
   * Export detailed client statement with transactions and allocations
   * Implementation of "تفاصيل مستحقات العميل" from specifications
   */
  public async exportClientStatement(
    data: ClientStatementReportData, 
    options?: ExportOptions
  ): Promise<void> {
    try {
      const workbook = new ExcelJS.Workbook();
      
      workbook.creator = 'نظام إدارة الأعمال';
      workbook.lastModifiedBy = 'نظام إدارة الأعمال';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      generateClientStatementExcel(workbook, data, options);
      
      const filename = options?.customFilename || `كشف_حساب_${data.clientName.replace(/\s+/g, '_')}`;
      await saveWorkbook(workbook, filename);
    } catch (error) {
      console.error('Error exporting client statement:', error);
      throw new Error('فشل في تصدير كشف حساب العميل');
    }
  }

  /**
   * Export all tasks for a specific client
   * Implementation of "مهام العميل" from specifications
   */
  public async exportClientTasks(
    data: ClientTasksReportData, 
    options?: ExportOptions
  ): Promise<void> {
    try {
      const workbook = new ExcelJS.Workbook();
      
      workbook.creator = 'نظام إدارة الأعمال';
      workbook.lastModifiedBy = 'نظام إدارة الأعمال';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      generateClientTasksExcel(workbook, data, options);
      
      const filename = options?.customFilename || `مهام_${data.client.name.replace(/\s+/g, '_')}`;
      await saveWorkbook(workbook, filename);
    } catch (error) {
      console.error('Error exporting client tasks:', error);
      throw new Error('فشل في تصدير مهام العميل');
    }
  }

  /**
   * Export client credit information and history
   * Implementation of "ائتمانات العميل" from specifications
   */
  public async exportClientCredits(
    data: ClientCreditsReportData, 
    options?: ExportOptions
  ): Promise<void> {
    try {
      const workbook = new ExcelJS.Workbook();
      
      workbook.creator = 'نظام إدارة الأعمال';
      workbook.lastModifiedBy = 'نظام إدارة الأعمال';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      generateClientCreditsExcel(workbook, data, options);
      
      const filename = options?.customFilename || `ائتمانات_${data.client.name.replace(/\s+/g, '_')}`;
      await saveWorkbook(workbook, filename);
    } catch (error) {
      console.error('Error exporting client credits:', error);
      throw new Error('فشل في تصدير ائتمانات العميل');
    }
  }

  /**
   * Batch export multiple reports for a client
   * Useful for comprehensive client analysis
   */
  public async exportClientComprehensiveReport(
    clientStatementData: ClientStatementReportData,
    clientTasksData: ClientTasksReportData,
    clientCreditsData?: ClientCreditsReportData,
    options?: ExportOptions
  ): Promise<void> {
    try {
      const workbook = new ExcelJS.Workbook();
      
      workbook.creator = 'نظام إدارة الأعمال';
      workbook.lastModifiedBy = 'نظام إدارة الأعمال';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      // Generate multiple sheets in the same workbook
      generateClientStatementExcel(workbook, clientStatementData, options);
      generateClientTasksExcel(workbook, clientTasksData, options);
      
      if (clientCreditsData) {
        generateClientCreditsExcel(workbook, clientCreditsData, options);
      }
      
      const filename = options?.customFilename || `تقرير_شامل_${clientStatementData.clientName.replace(/\s+/g, '_')}`;
      await saveWorkbook(workbook, filename);
    } catch (error) {
      console.error('Error exporting comprehensive client report:', error);
      throw new Error('فشل في تصدير التقرير الشامل للعميل');
    }
  }
}

// Export a singleton instance
export const exportService = new ExportService();
