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
// Add other paginated data types (e.g., ReceivablePaginatedData) as needed in future phases

// Authentication Data Structures
export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  roles: string[];
  capabilities: Record<string, boolean>;
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
  type: ClientType;
  google_drive_link: string;
  created_at: string;
  updated_at: string;
  tasks_count?: Record<string, { count: number; amount: number }>; // For task counts by status
  total_receivables?: number;
  total_paid?: number;
  total_outstanding?: number;
  credit_balance?: number;
}

// Client type enum
export type ClientType = 'Government' | 'RealEstate' | 'Accounting' | 'Other';

// --- NEW TYPES FOR PHASE 5 (Tasks & Requirements) ---
export type TaskStatus = 'New' | 'Deferred' | 'Completed' | 'Cancelled';
export type TaskType = 'Government' | 'RealEstate' | 'Accounting' | 'Other';

// --- Tag Types ---

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
  // temp_id is used for client-side unique key before saving to backend
  temp_id?: string;
}


export interface Task {
  id: number;
  client_id: number;
  task_name: string | null;
  type: TaskType;
  status: TaskStatus;
  amount: number;
  amount_details: AmountDetail[] | null; // ADDED
  start_date: string;
  end_date: string | null;
  prepaid_amount: number;
  prepaid_receivable_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client: Client;
  requirements: Requirement[];
  receivable: Receivable | null;
  prepaid_receivable: Receivable | null;
  tags: Tag[];
}

// --- Payload Types ---
export interface ClientPayload {
  name: string;
  phone: string;
  type: ClientType;
  google_drive_link: string;
}

export interface ClientUnpaidAmounts {
  total_receivables: number;
  total_paid: number;
  total_unpaid: number;
}

// Client counts by type
export interface ClientCountsByType {
  Government: number;
  RealEstate: number;
  Accounting: number;
  Other: number;
}

export interface TaskPayload {
  client_id: number;
  task_name?: string;
  type: TaskType;
  amount: number;
  start_date: string;
  end_date?: string;
  prepaid_amount?: number;
  notes?: string;
  requirements?: { requirement_text: string; is_provided: boolean }[];
  amount_details?: AmountDetail[];
  tags?: number[]; // Array of tag IDs
}

// Payload for updating a task, including existing requirements
export interface UpdateTaskPayload {
  client_id?: number;
  task_name?: string;
  type?: TaskType;
  status?: TaskStatus;
  amount?: number;
  start_date?: string;
  end_date?: string;
  prepaid_amount?: number;
  notes?: string;
  requirements?: { id?: number; requirement_text: string; is_provided: boolean }[];
  amount_details?: AmountDetail[];
  tags?: number[]; // Array of tag IDs
}

// Payload for updating requirements specifically
export interface UpdateRequirementsPayload {
  task_id: number;
  requirements: {
    id?: number; // Optional for new requirements
    requirement_text: string;
    is_provided: boolean;
  }[];
}

// Payload for updating task status
export interface UpdateTaskStatusPayload {
  task_id: number;
  status: TaskStatus;
}


// --- NEW TYPES FOR PHASE 6 (Receivables & Payments) ---
export type ReceivableStatus = 'Due' | 'Pending' | 'Paid';

export interface PaymentMethod {
  id: number;
  code: string;
  name: string; // The backend provides the correct language name (e.g., name_ar)
}

export interface Payment {
  id: number;
  receivable_id: number;
  created_by: number;
  amount: number;
  paid_at: string; // YYYY-MM-DD
  note: string | null;
  payment_method_id: number | null;
  created_at: string;
  updated_at: string;
  // Enriched data from API
  payment_method?: {
    id: number;
    name_en: string;
    name_ar: string;
  };
  client_id?: number; // ADD THIS LINE (optional because it's derived)
  receivable?: {
    id: string;
    description: string;
    amount: string;
    due_date: string;
  };
}

// This is the primary type for the new client statement view
export interface StatementItem {
  id: string; // "task_1", "manual_3", etc.
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  // These fields are crucial for enabling actions from the statement
  type: TaskType;
  task_id: number | null;
  receivable_id?: number;
  remaining_amount?: number;
  payments?: Payment[]; // Optional detailed payments
  created_at?: string;
  details?: {
    receivables?: any[];
    payments?: Payment[];
    allocations?: any[];
  };
}


// NEW type for the statement response
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
// --- Payload Types ---
export interface CompleteTaskPayload {
  is_paid: boolean;
  // The following are only needed if is_paid is true
  is_full_payment?: boolean;
  payment_amount?: number;
  payment_method_id?: number;
  payment_note?: string;
  paid_at?: string; // YYYY-MM-DD
  // This is needed if is_paid is false
  due_date?: string; // YYYY-MM-DD
}

// Response type for completing a task (includes receivable id and optional payment)
export interface CompleteTaskResponse {
  id: number; // task id
  status: TaskStatus;
  receivable_id?: number;
  task?: Task;
  payment?: Payment;
}

export interface ManualReceivablePayload {
  client_id: number;
  type: TaskType; // ADDED
  description: string;
  amount: number;
  amount_details?: AmountDetail[]; // ADDED
  notes?: string;
  due_date: string;
}

export interface PaymentPayload {
  receivable_id: number;
  amount: number;
  payment_method_id: number;
  paid_at: string; // YYYY-MM-DD
  note?: string;
}

// --- Paginated Data ---
export interface ReceivablePaginatedData {
  receivables: Receivable[];
  pagination: Pagination;
}

export interface PaymentPaginatedData {
  payments: Payment[]; // Key as returned by API
  pagination: Pagination;
}

export interface DashboardStats {
  total_clients: number;
  total_tasks: number;
  new_tasks: number;
  deferred_tasks: number;
  completed_tasks: number;
  late_tasks: number; // Corrected
  late_receivables: number; // Corrected
}


// Add these interfaces
export interface ClientCredit {
  id: number;
  client_id: number;
  amount: number;
  description: string;
  received_at: string;
  allocated_amount: number;
  remaining_amount: number; // Calculated
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
  amount?: number; // Optional: apply a specific amount, otherwise apply max possible
  note?: string;
  paid_at?: string; // ISO date string
}

export interface CreditAllocation {
  id: number;
  credit_id: number;
  receivable_id: number;
  amount: number;
  allocated_at: string;
  allocated_by: number;
  description?: string; // Enriched
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
  new_amount?: number; // Required if action is 'reduce_allocation'
}

export interface AllocationResolution {
  allocation_id: number;
  action: 'convert_to_payment' | 'delete_allocation';
  payment_method_id?: number; // Required if action is 'convert_to_payment'
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