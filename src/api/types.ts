// Generic API Response Structure
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

// REFINED PAGINATION: Generic structure for pagination metadata
interface Pagination {
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
  notes?: string;
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

export interface TaskPayload {
  client_id: number;
  assigned_to_id?: number | null;
  task_name: string;
  type: TaskType;
  amount: number;
  amount_details?: AmountDetail[];
  start_date: string;
  end_date?: string;
  prepaid_amount?: number;
  notes?: string;
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
  start_date?: string;
  end_date?: string;
  prepaid_amount?: number;
  notes?: string;
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
export type ReceivableStatus = 'Due' | 'Pending' | 'Paid';

export interface PaymentMethod {
  id: number;
  code: string;
  name: string;
}

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

export interface ManualReceivablePayload {
  client_id: number;
  type: TaskType;
  description: string;
  amount: number;
  amount_details?: AmountDetail[];
  notes?: string;
  due_date: string;
}

export interface UpdateReceivablePayload {
  type?: TaskType;
  description?: string;
  amount?: number;
  amount_details?: AmountDetail[];
  notes?: string;
  due_date?: string;
}

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