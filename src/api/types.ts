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
  google_drive_link: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  tasks_count?: Record<string, { count: number; amount: number }>; // For task counts by status
  total_receivables?: number;
  total_paid?: number;
  total_outstanding?: number;
}

// --- NEW TYPES FOR PHASE 5 (Tasks & Requirements) ---
export type TaskStatus = 'New' | 'Deferred' | 'Completed';
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
  google_drive_link: string;
  notes?: string;
}

export interface ClientUnpaidAmounts {
  total_receivables: number;
  total_paid: number;
  total_unpaid: number;
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
  amount: number;
  payment_method_id: number;
  paid_at: string; // YYYY-MM-DD
  note: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  payment_method?: {
    id: number;
    name_en: string;
    name_ar: string;
  };
}

export interface StatementItem {
  id: string; // e.g., 'task-123' or 'receivable-45' or 'prepaid-123'
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  type: TaskType;
  task_id: number | null;
  // Below are added to support interactions
  payments?: Payment[]; 
  receivable_id?: number; // The specific ID of the underlying receivable for payment
  remaining_amount?: number; // The specific remaining amount for this receivable
}

// NEW type for the statement response
export interface ClientStatementPaginatedData {
  receivables: StatementItem[]; // The key is 'receivables' for consistency
  pagination: Pagination;
}
export interface Receivable {
  id: number;
  client_id: number;
  task_id: number | null;
  type: TaskType; // ADDED
  description: string;
  amount: number;
  amount_details: AmountDetail[] | null; // ADDED
  notes: string | null;
  due_date: string;
  created_at: string;
  updated_at: string;
  total_paid: number;
  remaining_amount: number;
  payments: Payment[];
  client: { id: string; name: string; phone: string; };
  task?: { id: string; name: string; type: TaskType; };
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