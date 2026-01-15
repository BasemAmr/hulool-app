// Generic API Response Structure
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

// REFINED PAGINATION: Generic structure for pagination metadata
export interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Specific Paginated Data structures, matching API response keys
export interface ClientPaginatedData {
  clients: Client[]; // Key as returned by API for clients endpoint
  pagination: Pagination;
}

export interface TaskPaginatedData {
  tasks: Task[]; // Key as returned by API for tasks endpoint
  pagination: Pagination;
}

// Authentication Data Structures
export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  employee_id: number | null;
  commission_rate: number | null;
  roles: string[];
  capabilities: Record<string, boolean>;
}

// Employee Management Types
export interface Employee {
  id: number;
  user_id: number;
  commission_rate: number;
  created_at: string;
  user_login: string;
  user_email: string;
  display_name: string;
}

export interface CreateEmployeeRequest {
  user_id: number;
  commission_rate?: number;
}

export interface UpdateEmployeeRequest {
  commission_rate?: number;
}

export interface EmployeePaginatedData {
  employees: Employee[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
}

// User Management Types
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  display_name?: string;
  role?: string;
}

export interface UpdateUserCapabilitiesRequest {
  userId: number;
  capabilities: {
    tm_manage_users?: boolean;
    tm_delete_any_task?: boolean;
    tm_delete_any_receivable?: boolean;
    tm_delete_any_payment?: boolean;
    tm_view_receivables_amounts?: boolean;
    tm_view_paid_receivables?: boolean;
    tm_view_overdue_receivables?: boolean;
    tm_view_all_receivables?: boolean;
  };
}

export interface NonceData {
  nonce: string;
  expires: number;
}

export interface AuthCheckResponse {
  authenticated: boolean;
  nonce_valid: boolean;
  has_permissions: boolean;
  user_id: number;
  timestamp: number;
}

// Core Data Models
export interface Client {
  id: number;
  name: string;
  phone: string;
  region_id: number | null;
  region_name?: string | null;
  google_drive_link: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  tasks_count?: Record<string, { count: number; amount: number }>; // For task counts by status
  total_receivables?: number;
  total_paid?: number;
  total_outstanding?: number;
  credit_balance?: number;
}

export interface ClientPayload {
  name: string;
  phone: string;
  region_id?: number | null;
  google_drive_link?: string;
  notes?: string | null;
}


export interface ClientUnpaidAmounts {
  client_id: number;
  client_name: string;
  total_unpaid: number;
  total_overdue: number;
  total_pending: number;
}

// Region Types
export interface Region {
  id: number;
  name: string;
  created_at: string;
  client_count?: number; // For usage statistics
}

export interface RegionPayload {
  name: string;
}

// Legacy type for backward compatibility - will be removed
export interface ClientCountsByType {
  Government: number;
  RealEstate: number;
  Accounting: number;
  Other: number;
}

// Legacy type for backward compatibility - will be removed
export type ClientType = 'Government' | 'RealEstate' | 'Accounting' | 'Other';

// Tag Types
export interface Tag {
  id: number;
  name: string;
  color: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface AmountDetail {
  description: string;
  amount: number;
}

export interface Requirement {
  id?: number; // Optional for new requirements
  task_id?: number; // Optional for new requirements
  requirement_text: string;
  is_provided: boolean;
  temp_id?: string;
}

export interface Task {
  id: number;
  client_id: number;
  assigned_to_id: number | null;
  task_name: string | null;
  type: TaskType;
  status: TaskStatus;
  amount: number;
  amount_details: AmountDetail[] | null;
  subtasks?: any[];
  start_date: string;
  end_date: string | null;
  prepaid_amount: number;
  prepaid_receivable_id: number | null;
  expense_amount?: number;

  notes: string | null;
  created_at: string;
  updated_at: string;
  client: Client;
  requirements: Requirement[];
  receivable: Receivable | null;
  prepaid_receivable: Receivable | null;
  tags: Tag[];
}

/**
 * Invoice totals aggregated from all invoices for a task
 * Used in pending review tasks table
 */
export interface InvoiceTotals {
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
}

/**
 * Task with aggregated invoice payment data
 * Used for pending review tasks table to avoid N+1 queries
 */
export interface TaskWithInvoiceData extends Task {
  invoice_totals: InvoiceTotals;
  assigned_employee_name?: string;
}

/**
 * Response structure for pending review tasks with invoice data
 */
export interface PendingReviewTasksData {
  tasks: TaskWithInvoiceData[];
  pagination: Pagination;
}

export interface TaskPayload {
  client_id: number;
  assigned_to_id?: number | null;
  task_name: string;
  type: TaskType;
  amount: number;
  amount_details?: AmountDetail[];
  subtasks?: any[];
  start_date: string;
  end_date?: string;
  prepaid_amount?: number;
  notes?: string; // Added optional notes

  requirements?: Requirement[];
  tag_ids?: number[];
  tags?: string[];
}

export interface UpdateTaskPayload {
  assigned_to_id?: number | null;
  task_name?: string;
  type?: TaskType;
  amount?: number;
  amount_details?: AmountDetail[];
  subtasks?: any[];
  start_date?: string;
  end_date?: string;
  prepaid_amount?: number;
  notes?: string; // Added optional notes

  requirements?: Requirement[];
  tag_ids?: number[];
  tags?: string[];
  expected_updated_at?: string; // For optimistic locking
}

export interface UpdateRequirementsPayload {
  task_id: number;
  requirements: Requirement[];
}

export type TaskStatus = 'New' | 'Deferred' | 'Pending Review' | 'Completed' | 'Cancelled';
export type TaskType = 'Government' | 'RealEstate' | 'Accounting' | 'Other';

// Receivables & Payments Types
/**
 * @deprecated The receivable system is being replaced by the Invoice/Ledger system.
 * Use InvoiceStatus instead.
 */
export type ReceivableStatus = 'Due' | 'Pending' | 'Paid';

export interface PaymentMethod {
  id: number;
  code: string;
  name: string;
}

/**
 * @deprecated Use InvoicePayment instead. The Payment type is linked to receivables 
 * which are being replaced by invoices. Use InvoicePayment for invoice-linked payments.
 */
export interface Payment {
  id: number;
  receivable_id: number;
  created_by: number;
  amount: number;
  paid_at: string;
  note: string | null;
  payment_method_id: number | null;
  created_at: string;
  updated_at: string;
  payment_method?: {
    id: number;
    name_en: string;
    name_ar: string;
  };
  client_id?: number;
  receivable?: {
    id: string;
    description: string;
    amount: string;
    due_date: string;
  };
}

export interface StatementItem {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  type: TaskType;
  task_id: number | null;
  receivable_id?: number;
  remaining_amount?: number;
  payments?: Payment[];
  created_at?: string;
  details?: {
    receivables?: any[];
    payments?: Payment[];
    allocations?: any[];
  };
}

export interface ClientStatementPaginatedData {
  statementItems: StatementItem[];
  totals: {
    totalDebit: number;
    totalCredit: number;
    balance: number;
  };
}

/**
 * @deprecated Use Invoice instead. The Receivable entity is being replaced by Invoice.
 * Invoices use a double-entry ledger system for accurate financial tracking.
 */
export interface Receivable {
  id: number;
  client_id: number | string;
  task_id: number | string | null;
  reference_receivable_id: number | string | null;
  prepaid_receivable_id?: number | string | null;
  created_by: number | string;
  type: TaskType | string;
  description: string;
  amount: number;
  original_amount: number | null;
  amount_details: AmountDetail[] | null | string;
  adjustment_reason: string | null;
  notes: string | null;
  due_date: string;
  created_at: string;
  updated_at: string;
  client_name: string;
  client_phone: string;
  task_name: string | null;
  task_type: string | null;
  total_paid: number;
  remaining_amount: number;
  is_overdue?: boolean;
  payments: Payment[];
  allocations: CreditAllocation[];
  client: Partial<Client>;
  task?: Partial<Task>;
}

// Payload Types
export interface CompleteTaskPayload {
  is_paid: boolean;
  is_full_payment?: boolean;
  payment_amount?: number;
  payment_method_id?: number;
  payment_note?: string;
  paid_at?: string;
  due_date?: string;
}

export interface CompleteTaskResponse {
  id: number;
  status: TaskStatus;
  receivable_id?: number;
  task?: Task;
  payment?: Payment;
}

/**
 * @deprecated Use CreateInvoicePayload instead.
 */
export interface ManualReceivablePayload {
  client_id: number;
  type: TaskType;
  description: string;
  amount: number;
  amount_details?: AmountDetail[];

  due_date: string;
  notes?: string;
}

/**
 * @deprecated Use UpdateInvoicePayload instead.
 */
export interface UpdateReceivablePayload {
  type?: TaskType;
  description?: string;
  amount?: number;
  amount_details?: AmountDetail[];

  due_date?: string;
  notes?: string;
}

/**
 * @deprecated Use RecordInvoicePaymentPayload instead.
 * Payments now target invoices via POST /invoices/{id}/payments
 */
export interface PaymentPayload {
  receivable_id: number;
  amount: number;
  payment_method_id: number;
  paid_at: string;
  note?: string;
}

// Receivable Deletion Conflict Types
export interface ReceivableDeletionConflictData {
  has_payments: boolean;
  has_allocations: boolean;
  total_payments: number;
  total_allocations: number;
  payments: Payment[];
  allocations: CreditAllocation[];
}

export interface PaymentDecision {
  payment_id: number;
  action: 'keep' | 'delete' | 'convert_to_credit' | 'reduce_to_X';
  new_amount?: number;
  refund_amount?: number;
  credit_description?: string;
}

export interface AllocationDecision {
  allocation_id: number;
  action: 'keep' | 'remove' | 'transfer_to_credit';
  transfer_description?: string;
}

export interface OverpaymentData {
  receivable_id: number;
  overpayment_amount: number;
  remaining_amount: number;
  decisions: {
    convert_to_credit?: boolean;
    credit_description?: string;
    refund_amount?: number;
  };
}

export interface ResolutionOption {
  label: string;
  description: string;
  recommended?: boolean;
  available?: boolean;
}

export interface EnhancedOverpaymentData {
  receivable_id: number;
  current_amount: number;
  new_amount: number;
  total_paid: number;
  surplus: number;
  payments: any[];
  allocations: any[];
  resolution_options: {
    auto_reduce_payments: ResolutionOption;
    auto_reduce_latest: ResolutionOption;
    convert_surplus_to_credit: ResolutionOption;
    manual_resolution: ResolutionOption;
  };
}

// Paginated Data
export interface ReceivablePaginatedData {
  receivables: Receivable[];
  pagination: Pagination;
}

export interface PaymentPaginatedData {
  payments: Payment[];
  pagination: Pagination;
}

export interface DashboardStats {
  total_clients: number;
  total_tasks: number;
  new_tasks: number;
  deferred_tasks: number;
  completed_tasks: number;
  late_tasks: number;
  late_receivables: number;
}

// Client Credit Types
export interface ClientCredit {
  id: number;
  client_id: number;
  amount: number;
  description: string;
  received_at: string;
  allocated_amount: number;
  remaining_amount: number;
}

export interface RecordCreditPayload {
  client_id: number;
  amount: number;
  description: string;
  payment_method_id: number;
  received_at: string;
}

export interface ApplyCreditPayload {
  receivableId: number;
  amount?: number;
  note?: string;
  paid_at?: string;
}

export interface CreditAllocation {
  id: number;
  credit_id: number;
  receivable_id: number;
  amount: number;
  allocated_at: string;
  allocated_by: number;
  description?: string;
}

export interface CreditReductionConflictData {
  new_amount: number;
  allocated_amount: number;
  deficit: number;
  allocations: CreditAllocation[];
}

export interface CreditDeletionConflictData {
  allocated_amount: number;
  allocations: CreditAllocation[];
}

export interface AllocationAdjustment {
  allocation_id: number;
  action: 'keep' | 'reduce_allocation' | 'remove_allocation';
  new_amount?: number;
}

export interface AllocationResolution {
  allocation_id: number;
  action: 'convert_to_payment' | 'delete_allocation';
  payment_method_id?: number;
}

export interface ClientSummary {
  client_id: number;
  client_name: string;
  client_phone: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  receivables_count: number;
  total_receivables?: number;
  total_paid?: number;
  total_outstanding?: number;
}

// Receivable Deletion Resolution Payload
export interface ReceivableDeletionResolution {
  payment_decisions?: PaymentDecision[];
  allocation_decisions?: AllocationDecision[];
  overpayment_resolution?: OverpaymentData;
}

// ========================================
// NEW TYPES FOR TASK CONFLICT RESOLUTION
// ========================================

// Conflict Response Types
export interface ConflictResponse<T> {
  success: false;
  code: string;
  message: string;
  data: T;
}

// Prepaid Amount Conflict Data
export interface PrepaidConflictData {
  conflict_type: 'prepaid_amount_change_conflict';
  current_prepaid_amount: number;
  new_prepaid_amount: number;
  total_paid: number;
  task_amount: number;
  conflicts: PrepaidConflict[];
  financial_records: {
    payments: EnrichedPayment[];
    allocations: EnrichedAllocation[];
  };
  resolution_options: ResolutionOptions;
}

export interface PrepaidConflict {
  type: 'overpayment' | 'prepaid_elimination' | 'negative_main_receivable';
  severity: 'high' | 'medium' | 'low';
  message: string;
  surplus?: number;
  affected_amount?: number;
  calculated_main_amount?: number;
}

// Task Amount Conflict Data  
export interface TaskAmountConflictData {
  conflict_type: 'main_receivable_overpayment';
  current_task_amount: number;
  new_task_amount: number;
  current_main_receivable_amount: number;
  calculated_new_main_amount: number;
  main_receivable_paid: number;
  surplus: number;
  main_receivable_id: number;
  financial_records: {
    payments: EnrichedPayment[];
    allocations: EnrichedAllocation[];
  };
}

// Task Cancellation Conflict Data
export interface TaskCancellationConflictData {
  conflict_type: 'task_cancellation_conflict';
  task_id: number;
  prepaid_receivable: ReceivableFinancialState | null;
  main_receivable: ReceivableFinancialState | null;
  total_funds_involved: number;
}

// Task Cancellation Analysis
export interface TaskCancellationAnalysis {
  task_id: number;
  prepaid_receivable: ReceivableFinancialState | null;
  main_receivable: ReceivableFinancialState | null;
  total_funds_involved: number;
}

export interface ReceivableFinancialState {
  receivable_id: number;
  amount: number;
  total_paid: number;
  balance: number;
  payments: EnrichedPayment[];
  allocations: EnrichedAllocation[];
}

// Enhanced Payment/Allocation Types with Context
export interface EnrichedPayment extends Payment {
  payment_method_name?: string;
  created_by_name?: string;
}

export interface EnrichedAllocation extends CreditAllocation {
  credit_description?: string;
  credit_received_at?: string;
}

// Resolution Options
export interface ResolutionOptions {
  payments?: Record<number, PaymentResolutionOption>;
  allocations?: Record<number, AllocationResolutionOption>;
}

export interface PaymentResolutionOption {
  current_amount: number;
  available_actions: string[];
  recommendations: string[];
}

export interface AllocationResolutionOption {
  current_amount: number;
  available_actions: string[];
  credit_source: number;
}

// Decision Types for Resolution
export interface PrepaidResolutionDecisions {
  receivable_decision?: string;
  payment_decisions?: PrepaidPaymentDecision[];
  allocation_decisions?: PrepaidAllocationDecision[];
}

export interface PrepaidPaymentDecision {
  payment_id: number;
  action: 'keep' | 'delete' | 'convert_to_credit' | 'reduce_to' | 'split_payment';
  new_amount?: number;
  keep_amount?: number;
  surplus_action?: 'convert_to_credit';
}

export interface PrepaidAllocationDecision {
  allocation_id: number;
  action: 'keep' | 'return_to_credit' | 'delete_allocation';
}

export interface MainReceivableDecisions {
  payment_decisions: MainReceivablePaymentDecision[];
  allocation_decisions: MainReceivableAllocationDecision[];
}

export interface MainReceivablePaymentDecision {
  payment_id: number;
  action: 'keep' | 'delete' | 'convert_to_credit' | 'reduce_to';
  new_amount?: number;
}

export interface MainReceivableAllocationDecision {
  allocation_id: number;
  action: 'keep' | 'return_to_credit' | 'delete_allocation';
}

// Task Cancellation Decisions
export interface TaskCancellationDecisions {
  prepaid_receivable_decisions?: {
    payment_decisions: PrepaidPaymentDecision[];
    allocation_decisions: PrepaidAllocationDecision[];
  };
  main_receivable_decisions?: {
    payment_decisions: MainReceivablePaymentDecision[];
    allocation_decisions: MainReceivableAllocationDecision[];
  };
  task_action: 'cancel' | 'delete';
}

// Resolution Summary Types
export interface ResolutionSummary {
  task?: Task;
  resolution_summary: {
    payments_processed?: ProcessedPayment[];
    allocations_processed?: ProcessedAllocation[];
    credits_created?: CreatedCredit[];
    financial_impact?: FinancialImpact;
    prepaid_resolution?: any;
    main_resolution?: any;
    task_action?: string;
  };
}

export interface ProcessedPayment {
  payment_id: number;
  original_amount: number;
  action: string;
  status: string;
  new_amount?: number;
  surplus_handled?: number;
  credit_created?: CreatedCredit;
}

export interface ProcessedAllocation {
  allocation_id: number;
  original_amount: number;
  action: string;
  status: string;
  returned_to_credit_id?: number;
}

export interface CreatedCredit {
  credit_id: number;
  amount: number;
}

export interface FinancialImpact {
  task_amount_updated?: {
    old_amount: number;
    new_amount: number;
  };
  main_receivable_updated?: {
    receivable_id: number;
    old_amount: number;
    new_amount: number;
  };
  prepaid_eliminated?: boolean;
}

// Concurrent Modification Error
export interface ConcurrentModificationData {
  expected_updated_at: string;
  current_updated_at: string;
  current_task_data: Task;
}

// Employee Receivables Summary Types
export interface EmployeeReceivablesClient {
  id: string;
  name: string;
  phone: string;
  region_id: string | null;
  google_drive_link: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  total_receivables: string;
  total_paid: string;
  total_outstanding: string;
  receivables_count: string;
}

export interface EmployeeReceivablesData {
  clients: EmployeeReceivablesClient[];
  pagination: Pagination;
}

// ========================================
// NEW INVOICE & LEDGER TYPES
// ========================================
// These types replace the deprecated Receivable-centric model.
// The backend now uses an Invoice/Ledger system with double-entry accounting.

/**
 * Invoice status values
 * - draft: Created but not sent to client
 * - pending: Sent/awaiting payment (maps to old "Due")
 * - partially_paid: Some payments received
 * - paid: Fully paid
 * - overdue: Past due date with outstanding balance
 * - cancelled: Invoice cancelled/voided
 */
export type InvoiceStatus = 'draft' | 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

/**
 * Payment status values for quick filtering
 */
export type InvoicePaymentStatus = 'Unpaid' | 'Partial' | 'Paid';

/**
 * Invoice line item for itemized invoices
 */
export interface InvoiceLineItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

/**
 * Invoice payment record (linked to invoice, not receivable)
 */
export interface InvoicePayment {
  id: number;
  invoice_id: number;
  created_by: number;
  amount: number;
  paid_at: string;
  note: string | null;
  payment_method_id: number | null;
  reference_number?: string | null;
  created_at: string;
  updated_at: string;
  payment_method?: {
    id: number;
    name_en: string;
    name_ar: string;
  };
}

/**
 * Invoice entity - replaces Receivable
 * Maps to InvoiceDTO from backend
 */
export interface Invoice {
  id: number;
  invoice_number?: string;
  client_id: number;
  task_id: number | null;
  created_by: number;
  employee_user_id?: number;
  type: TaskType;
  status: InvoiceStatus;
  description: string;
  notes: string | null;

  // Financial fields
  amount: number;
  total_amount?: number; // Alias used by some endpoints
  paid_amount: number;
  amount_paid?: number; // Alias used by some endpoints
  remaining_amount: number;
  amount_due?: number; // Alias used by some endpoints

  // Dates
  due_date: string;
  issued_date?: string;
  paid_date?: string | null;
  created_at: string;
  updated_at: string;

  // Migration reference
  original_receivable_id?: number | null;

  // Prepaid flag (for prepaid invoices)
  is_prepaid?: boolean;

  // Computed flags
  is_fully_paid?: boolean;
  is_partially_paid?: boolean;
  is_overdue?: boolean;

  // Related entities
  line_items?: InvoiceLineItem[];
  payments?: InvoicePayment[];
  allocations?: CreditAllocation[];
  client?: Partial<Client>;
  client_name?: string;
  client_phone?: string;
  task?: Partial<Task>;
  employee_name?: string;
}

/**
 * Payload for creating a new invoice
 */
export interface CreateInvoicePayload {
  client_id: number;
  employee_user_id?: number;
  type: TaskType;
  description: string;
  amount: number;
  total_amount?: number;
  line_items?: InvoiceLineItem[];
  due_date: string;

  task_id?: number;
  notes?: string;
}

/**
 * Payload for updating an invoice
 */
export interface UpdateInvoicePayload {
  type?: TaskType;
  status?: InvoiceStatus;
  description?: string;
  amount?: number;
  total_amount?: number;
  line_items?: InvoiceLineItem[];
  due_date?: string;

}

/**
 * Payload for recording a payment on an invoice
 */
export interface RecordInvoicePaymentPayload {
  amount: number;
  payment_method_id: number;
  paid_at: string;
  note?: string;
  reference_number?: string;
}

/**
 * Payload for applying credit to an invoice
 */
export interface ApplyCreditToInvoicePayload {
  amount: number;
  credit_id: number;
}

/**
 * Response from recording a payment
 */
export interface RecordPaymentResponse {
  payment_id: number;
  invoice_id: number;
  amount: number;
  payment_method?: string;
  paid_at: string;
  invoice_status: InvoiceStatus;
  invoice_remaining: number;
}

/**
 * Response from applying credit
 */
export interface ApplyCreditResponse {
  invoice_id: number;
  credit_applied: number;
  new_amount_due: number;
  allocation_id: number;
}

/**
 * Invoice statistics for dashboard
 */
export interface InvoiceStats {
  total_invoices: number;
  draft_count: number;
  sent_count: number;
  paid_count: number;
  overdue_count: number;
  cancelled_count: number;
  total_amount: number;
  total_paid: number;
  total_outstanding: number;
  average_invoice_value?: number;
}

/**
 * Paginated invoice data
 */
export interface InvoicePaginatedData {
  invoices: Invoice[];
  pagination: Pagination;
}

// ========================================
// ACCOUNT / LEDGER TYPES
// ========================================
// Double-entry ledger system for tracking all financial transactions

/**
 * Account types in the ledger system
 */
export type AccountType = 'client' | 'employee' | 'company';

/**
 * Transaction types in the ledger
 */
export type TransactionType =
  | 'INVOICE_CREATED'
  | 'INVOICE_GENERATED'
  | 'PAYMENT_RECEIVED'
  | 'CREDIT_RECEIVED'
  | 'CREDIT_APPLIED'
  | 'CREDIT_ALLOCATED'
  | 'ADJUSTMENT'
  | 'REVERSAL'
  | 'COMMISSION'
  | 'SALARY'
  | 'EXPENSE'
  | 'INCOME';

/**
 * Direction of a transaction (affects balance calculation)
 */
export type TransactionDirection = 'debit' | 'credit';

/**
 * Financial transaction in the ledger
 * Maps to FinancialTransactionDTO
 */
export interface FinancialTransaction {
  id: number;
  account_type: AccountType;
  account_id: number;
  client_id?: number;
  transaction_type: TransactionType;
  description: string;
  amount: number;
  direction?: TransactionDirection;
  balance_after: number;
  related_object_type?: string;
  related_object_id?: number;
  transaction_date?: string;
  created_by?: number;
  created_at: string;
  metadata?: Record<string, any>;
}

/**
 * Account balance summary
 */
export interface AccountBalance {
  account_type: AccountType;
  account_id: number;
  name?: string;
  current_balance: number;
  total_credits: number;
  total_debits: number;
  total_invoiced?: number;
  total_paid?: number;
  last_updated: string;
}

/**
 * Account statistics
 */
export interface AccountStats {
  current_balance: number;
  total_income: number;
  total_expense: number;
  transaction_count: number;
  last_transaction_date: string | null;
}

/**
 * Transaction summary by type
 */
export interface TransactionSummary {
  [transactionType: string]: {
    count: number;
    total: number;
  };
}

/**
 * Client balance with additional info
 */
export interface ClientAccountBalance {
  client_id: number | string;
  client_name?: string;
  client_phone?: string;
  name?: string;
  type?: string;
  balance?: number;
  current_balance?: number;
  total_outstanding?: number | string;
  total_debit?: number | string;
  total_credit?: number | string;
  total_invoiced?: number;
  total_paid?: number;
  total_receivables?: number | string;
  transaction_count?: number | string;
  latest_transaction_date?: string;
}

/**
 * Total balance statistics across all clients
 */
export interface ClientsTotalStats {
  total_clients: number;
  total_balance: number;
  total_invoiced: number;
  total_paid: number;
  average_balance_per_client: number;
}

/**
 * Total unpaid statistics
 */
export interface TotalUnpaidStats {
  total_unpaid: number;
  clients_with_outstanding: number;
  oldest_invoice_date: string | null;
}

/**
 * Payment statistics by method
 */
export interface PaymentMethodStats {
  [methodName: string]: {
    count: number;
    total: number;
    average: number;
  };
}

/**
 * Daily payment totals
 */
export interface DailyPaymentTotal {
  date: string;
  total: number;
  count: number;
}

/**
 * Paginated account history response
 */
export interface AccountHistoryPaginatedData {
  transactions: FinancialTransaction[];
  pagination: Pagination;
  balance?: number;
  total_debits?: number;
  total_credits?: number;
}

/**
 * Paginated client balances response
 */
export interface ClientBalancesPaginatedData {
  clients: ClientAccountBalance[];
  pagination: Pagination;
}

/**
 * Balance verification result
 */
export interface BalanceVerification {
  is_valid: boolean;
  reported_balance: number;
  calculated_balance: number;
  difference: number;
  issues: string[];
}

/**
 * Balance recalculation result
 */
export interface BalanceRecalculation {
  new_balance: number;
  old_balance: number;
  adjustment: number;
  recalculated_at: string;
}

// ========================================
// FINANCIAL CENTER TYPES
// ========================================

/**
 * Pending item types
 */
export type PendingItemType = 'commission' | 'payout_approval' | 'invoice_payment';
export type PendingItemStatus = 'pending' | 'approved' | 'rejected' | 'finalized';

/**
 * Pending item in the financial system
 */
export interface PendingItem {
  id: number;
  item_type: PendingItemType;
  related_entity: string | null;
  related_id: number | null;
  account_type: AccountType | null;
  account_id: number | null;
  expected_amount: number;
  status: PendingItemStatus;
  assigned_to: number | null;
  notes: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: number | null;
  days_pending?: number;
  // Joined data
  account_name?: string;
  related_name?: string;
  client_name?: string | null;
  invoice_status?: string | null;
  invoice_payment_progress?: number | null;
}

/**
 * Pending items list response
 */
export interface PendingItemsResponse {
  items: PendingItem[];
  count: number;
}

/**
 * Pending items summary by status
 */
export interface PendingItemsSummary {
  pending: number;
  approved: number;
  rejected: number;
  finalized: number;
  total: number;
  by_type: {
    commission: number;
    payout_approval: number;
    invoice_payment: number;
  };
}

/**
 * Create pending item payload
 */
export interface CreatePendingItemPayload {
  item_type: PendingItemType;
  related_entity?: string;
  related_id?: number;
  account_type: AccountType;
  account_id: number;
  expected_amount: number;
  assigned_to?: number;

}

/**
 * Unified account in accounts overview
 */
export interface UnifiedAccount {
  type: AccountType;
  id: number;
  name: string;
  email: string | null;
  balance: number;
  last_activity: string | null;
  pending_count: number;
  pending_amount: number;
}

/**
 * Unified accounts list response
 */
export interface UnifiedAccountsResponse {
  accounts: UnifiedAccount[];
  summary: {
    total_employee_balance: number;
    total_client_balance: number;
    total_company_balance: number;
    pending_commissions: number;
    account_count: number;
  };
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
}

/**
 * Manual transaction types
 */
export type ManualTransactionType = 'adjustment' | 'transfer' | 'payout' | 'repayment';

/**
 * Create manual transaction payload
 */
export interface CreateManualTransactionPayload {
  type: ManualTransactionType;
  // For adjustments
  account_type?: AccountType;
  account_id?: number;
  direction?: TransactionDirection;  // Required for adjustments
  // For transfers
  from_account_type?: AccountType;
  from_account_id?: number;
  to_account_type?: AccountType;
  to_account_id?: number;
  // For payout/repayment (single account transactions)
  category?: 'salary' | 'commission' | 'loan' | 'expense' | 'advance_repayment' | 'loan_repayment' | 'other';
  // Common fields
  amount: number;
  description: string;
  effective_date?: string;
  notes?: string;
}

/**
 * Invoice aging bucket
 */
export interface AgingBucket {
  count: number;
  amount: number;
  invoices?: {
    id: string;
    client_name: string;
    amount: number;
    paid_amount: number;
    balance: number;
    due_date: string;
    days_overdue: number;
  }[];
}

/**
 * Invoice aging analysis response
 */
export interface InvoiceAgingAnalysis {
  current: AgingBucket;
  '30_days': AgingBucket;
  '60_days': AgingBucket;
  '90_plus': AgingBucket;
  total_outstanding?: number;
  clients?: {
    client_id: number | string;
    client_name: string;
    current: number;
    '30_days': number;
    '60_days': number;
    '90_plus': number;
    total: number;
  }[];
}

// ========================================
// DEPRECATION NOTICES
// ========================================

/**
 * @deprecated Use Invoice instead. Receivables are being migrated to the Invoice system.
 * This type will be removed in a future version.
 */
// Receivable interface is marked deprecated above in its original location

/**
 * @deprecated Use RecordInvoicePaymentPayload instead. 
 * Payments now target invoices, not receivables.
 */
// PaymentPayload interface is marked deprecated above in its original location
// Transaction Management Types
export interface UpdateTransactionPayload {
  debit?: number;
  credit?: number;
  description?: string;
  transaction_date?: string;
  account_type?: 'client' | 'employee' | 'company';
  account_id?: number;
  reason?: string;
}

export interface TransactionValidationResult {
  allowed: boolean;
  warnings: string[];
  errors: string[];
  consequences: {
    transaction_summary?: {
      old_debit: number;
      new_debit: number;
      old_credit: number;
      new_credit: number;
      amount_change: number;
    };
    paired_transaction: {
      transaction_id: number;
      account_type: string;
      account_id: number;
      account_name: string;
      will_be_updated: boolean;
      old_amount: number;
      new_amount: number;
    } | null;
    balance_recalculations: Array<{
      account_type: string;
      account_id: number;
      account_name: string;
      reason: string;
      current_balance: number;
      estimated_new_balance: number;
    }>;
    invoice_impact?: {
      invoice_id: number;
      invoice_description: string;
      current_status: string;
      current_amount: number;
      current_paid: number;
      current_remaining: number;
      new_paid: number;
      new_remaining: number;
      status_will_change: boolean;
      new_status: string;
    };
  };
}

export interface CascadeResult {
  success: boolean;
  data: {
    updated_transactions: number[];
    updated_invoices?: number[];
    balance_recalculations: Array<{
      account_type: string;
      account_id: number;
    }>;
  };
  message?: string;
}

export interface TaskValidationResult {
  allowed: boolean;
  warnings: string[];
  errors: string[];
  consequences: {
    task_summary?: {
      old_amount: number;
      new_amount: number;
      old_prepaid: number;
      new_prepaid: number;
      old_final_invoice: number;
      new_final_invoice: number;
      client_name: string;
    };
    invoice_changes: Array<{
      invoice_id: number;
      invoice_type: string;
      invoice_description: string;
      old_amount: number;
      new_amount: number;
      current_status: string;
      current_paid: number;
      reason: string;
    }>;
    transaction_changes: Array<{
      transaction_id: number;
      type: string;
      old_amount: number;
      new_amount: number;
    }>;
    prepaid_sync: {
      required: boolean;
      old_prepaid: number;
      new_prepaid: number;
    } | null;
    balance_recalculations: Array<{
      account_type: string;
      account_id: number;
      account_name: string;
      reason: string;
      current_balance: number;
      estimated_change: number;
    }>;
  };
}

export interface InvoiceValidationResult {
  allowed: boolean;
  warnings: string[];
  errors: string[];
  consequences: {
    invoice_summary?: {
      old_amount: number;
      new_amount: number;
      current_paid: number;
      current_remaining: number;
      new_remaining: number;
      current_status: string;
      new_status: string;
      status_will_change: boolean;
    };
    transactions_affected: Array<{
      transaction_id: number;
      type: string;
      account_type: string;
      account_name: string;
      old_debit: number;
      new_debit: number;
      old_credit: number;
      new_credit: number;
    }>;
    allocations_affected: Array<any>;
    balance_recalculations: Array<{
      account_type: string;
      account_id: number;
      account_name: string;
      reason: string;
      current_balance: number;
      estimated_change: number;
    }>;
  };
}
