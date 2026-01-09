import { create } from 'zustand';
import type {
  Client,
  Task,
  Receivable,
  Tag,
  ClientCredit,
  PrepaidConflictData,
  TaskAmountConflictData,
  TaskCancellationAnalysis,
  ConcurrentModificationData,
  Employee,
  Invoice,
  UnifiedAccount,
  TransactionDirection
} from '../api/types';

// Define all possible modals in the app.
// We will add more types like 'task' in later phases.
export type ModalType = 'clientForm' | 'confirmDelete' | 'taskForm' | 'requirements' | 'manualReceivable' | 'clientReceivables' | 'paymentForm' | 'paymentHistory' | 'clientSearch' | 'tagForm' | 'tagManagement' | 'selectReceivableForPayment' | 'taskCompletion' | 'amountDetails' | 'subtasksModal' | 'taskSelection' | 'taskDetails' | 'taskSubtasks' | 'recordCreditModal' | 'applyCreditModal' | 'clientCreditHistory' | 'creditEdit' | 'creditDelete' | 'allocationEdit' | 'allocationDelete' | 'paymentEdit' | 'paymentDelete' | 'editReceivable' | 'deleteReceivable' | 'clientReceivablesEdit' | 'urgentAlert' | 'prepaidConflict' | 'taskAmountConflict' | 'taskCancellation' | 'concurrentModification' | 'assignTask' | 'approval' | 'employeePayout' | 'editEmployeePayout' | 'editTaskExpense' | 'submitForReview' | 'employeeBorrow' | 'invoiceForm' | 'recordPayment' | 'accountLedger' | 'invoiceDetails' | 'applyCreditToInvoice' | 'manualTransaction' | 'createInvoice' | 'journalEntryDetails' | 'taskRestore' | 'taskRestoreValidation' | 'taskAmountEdit' | 'invoiceEdit' | 'invoiceCancel' | 'invoiceDelete' | 'transactionEdit' | 'transactionDelete';

// Define the props each modal type can receive.
interface ModalProps {
  clientForm: { clientToEdit?: Client };
  taskForm: {
    taskToEdit?: Task;
    // Pre-populate client if adding a task from the client page
    client?: Client;
  };
  requirements: { task: Task };
  confirmDelete: {
    title: string;
    message: string;
    onConfirm: () => void;
  };
  manualReceivable: { client_id?: number; client?: Client }; // Allow predefined client
  clientReceivables: { client: Client };
  payment: { receivable: Receivable };
  paymentForm: { receivable: Receivable; isRequired?: boolean };
  paymentHistory: { receivable: Receivable };
  clientSearch: {};
  tagForm: { tagToEdit?: Tag };
  tagManagement: {};
  selectReceivableForPayment: {
    clientId: number;
  };
  taskCompletion: { task: Task };
  amountDetails: { task: Task };
  subtasksModal: {
    subtasks: any[];
    onSave: (subtasks: any[]) => void;
  };
  taskSelection: { tagId: number };
  taskDetails: { task: Task };
  taskSubtasks: { task: Task };

  recordCreditModal: { client?: Client }; // Optional client to pre-select
  urgentAlert: { taskId?: number }; // Optional taskId to pre-select

  applyCreditModal: { receivable: Receivable; availableCredit: number; paymentToReplace?: any };
  clientCreditHistory: { clientId: number; clientName: string };
  creditEdit: { credit: ClientCredit; clientId: number };
  creditDelete: { credit: ClientCredit; clientId: number };
  allocationEdit: { allocation: any; clientId: number };
  allocationDelete: { allocation: any; clientId: number };
  paymentEdit: { payment: any; receivable: any };
  paymentDelete: { payment: any };
  editReceivable: { receivable: Receivable };
  deleteReceivable: { receivable: Receivable };
  clientReceivablesEdit: { clientId: number };

  // NEW CONFLICT RESOLUTION MODALS
  prepaidConflict: {
    taskId: number;
    conflictData: PrepaidConflictData;
    newPrepaidAmount: number;
    onResolved: () => void;
  };
  taskAmountConflict: {
    taskId: number;
    conflictData: TaskAmountConflictData;
    newTaskAmount: number;
    onResolved: () => void;
  };
  taskCancellation: {
    taskId: number;
    analysisData: TaskCancellationAnalysis;
    onResolved: () => void;
  };
  concurrentModification: {
    conflictData: ConcurrentModificationData;
    onRetry: (useCurrentData: boolean) => void;
    onCancel: () => void;
  };
  assignTask: { task: Task };
  approval: { task: Task };
  employeePayout: { employee: Employee; onSuccess?: () => void };
  editEmployeePayout: { employee: Employee; transaction: any };
  editTaskExpense: { task: Task; transaction?: any };
  submitForReview: { task: Task };
  employeeBorrow: { employee: Employee; onSuccess?: () => void };

  // NEW INVOICE/LEDGER MODALS
  invoiceForm: { client?: Client; client_id?: number };
  recordPayment: {
    invoiceId?: number;
    invoice?: Invoice;
    amountDue?: number;
    clientId?: number;
    clientName?: string;
    initialPaymentAmount?: number;
  };
  accountLedger: { clientId: number; clientName?: string; filter?: 'all' | 'invoices' | 'payments' | 'credits' };
  invoiceDetails: { invoice?: Invoice; invoiceId?: number; isEmployeeView?: boolean };
  applyCreditToInvoice: { invoice: Invoice; availableCredit: number };

  // FINANCIAL CENTER MODALS
  manualTransaction: {
    preselectedAccount?: UnifiedAccount;
    direction?: 'payout' | 'repayment';
    accountType?: 'employee' | 'client'; // Freeze to this type if provided
  };
  createInvoice: { client?: Client; client_id?: number };
  journalEntryDetails: { transactionId: number; accountType: string; accountId: number };

  // NEW VALIDATION/CASCADE MODALS
  taskRestore: { task: Task };
  taskAmountEdit: { task: Task };
  invoiceEdit: { invoice: Invoice };
  invoiceCancel: { invoice: Invoice };
  invoiceDelete: { invoice: Invoice };
  transactionEdit: { transaction: any };
  transactionDelete: { transaction: any };
  taskRestoreValidation: {
    taskId: number;
    validation?: {
      allowed: boolean;
      consequences: any; // Using any for simplicity or import the type
    };
  };
}

interface ModalState {
  isOpen: boolean;
  modalType: ModalType | null;
  props: any; // Using `any` here is pragmatic for a generic store
}

interface ModalActions {
  openModal: <T extends ModalType>(type: T, props?: ModalProps[T]) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState & ModalActions>((set) => ({
  isOpen: false,
  modalType: null,
  props: {},
  openModal: (type, props) => set({ isOpen: true, modalType: type, props }),
  closeModal: () => set({ isOpen: false, modalType: null, props: {} }),
}));

