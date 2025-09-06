// src/services/export/exportTypes.ts
import type { Client, Task, PaymentMethod } from '../../api/types';

// Payment allocation detail for receivables
export interface PaymentAllocation {
  id: number;
  amount: number;
  allocated_at: string;
  description?: string;
  payment_method?: PaymentMethod;
  note?: string;
}

// Credit allocation detail
export interface CreditAllocation {
  id: number;
  amount: number;
  allocated_at: string;
  description?: string;
  credit_type?: string;
}

// Statement item with detailed payment/credit allocations
export interface StatementItem {
  id: number;
  description: string;
  debit: number;
  credit: number;
  date: string;
  type: string;
  transaction_type?: 'task' | 'payment' | 'credit' | 'adjustment';
  reference_id?: number;
  details?: {
    payments?: PaymentAllocation[];
    allocations?: CreditAllocation[];
  };
}

// Extended client with receivables summary
export interface ClientWithReceivables extends Client {
  // Additional fields that might not be in the base Client type
  balance: number;
}

// Task with enhanced details for export
export interface TaskExportData extends Task {
  client_name: string;
  client_phone: string;
  service_name: string;
  task_type: string;
  amount_paid: number;
  amount_remaining: number;
  duration_days?: number;
  is_overdue: boolean;
}

// Client credit information
export interface ClientCredit {
  id: number;
  client_id: number;
  credit_date: string;
  amount_granted: number;
  amount_used: number;
  amount_available: number;
  due_date: string;
  status: 'active' | 'expired' | 'used' | 'suspended';
  credit_type: string;
  notes?: string;
}

// === REPORT DATA INTERFACES ===

// Data for the "All Clients" report (تصدير جميع العملاء)
export interface AllClientsReportData {
  clients: ClientWithReceivables[];
  summary: {
    total_clients: number;
    total_receivables: number;
    total_paid: number;
    net_balance: number;
  };
}

// Data for the "All Tasks" report (تصدير جميع المهام)
export interface AllTasksReportData {
  tasks: TaskExportData[];
  summary: {
    total_tasks: number;
    tasks_new: number;
    tasks_in_progress: number;
    tasks_completed: number;
    tasks_cancelled: number;
    total_amount: number;
    total_paid: number;
    total_remaining: number;
    overdue_tasks: number;
  };
}

// Data for the "All Receivables" report (تصدير جميع المستحقات)
export interface AllReceivablesReportData {
  receivables: Array<{
    client_id: number;
    client_name: string;
    client_phone: string;
    total_debit: number;
    total_credit: number;
    net_receivables: number;
    last_transaction_date?: string;
  }>;
  summary: {
    total_debit: number;
    total_credit: number;
    net_receivables: number;
    clients_with_debt: number;
    clients_with_credit: number;
    balanced_clients: number;
  };
}

// Data for a single client's detailed receivables statement (تفاصيل مستحقات العميل)
export interface ClientStatementReportData {
  client: Client;
  clientName: string;
  clientPhone: string;
  statementItems: StatementItem[];
  totals: {
    totalDebit: number;
    totalCredit: number;
    balance: number;
  };
  period: {
    from: string;
    to: string;
  };
}

// Data for client tasks export (مهام العميل)
export interface ClientTasksReportData {
  client: Client;
  tasks: TaskExportData[];
  summary: {
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    new_tasks: number;
    cancelled_tasks: number;
    total_amount: number;
    total_paid: number;
    total_remaining: number;
    average_completion_days: number;
  };
}

// Data for client credits export (ائتمانات العميل)
export interface ClientCreditsReportData {
  client: Client;
  credits: ClientCredit[];
  summary: {
    total_granted: number;
    total_used: number;
    total_available: number;
    active_credits: number;
    expired_credits: number;
    utilization_rate: number;
  };
}

// Generic export options
export interface ExportOptions {
  includeSubTables?: boolean;
  includeSummary?: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
  filterStatus?: string[];
  customFilename?: string;
}
