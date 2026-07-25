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
  TransactionDirection,
  CashBox,
  CashBoxVoucher,
  TreasuryAccount
} from '@/api/types';

// Define all possible modals in the app.
export type ModalType = 'clientForm' | 'confirmDelete' | 'taskForm' | 'requirements' | 'manualReceivable' | 'clientReceivables' | 'paymentForm' | 'paymentHistory' | 'clientSearch' | 'tagForm' | 'tagManagement' | 'selectReceivableForPayment' | 'taskCompletion' | 'amountDetails' | 'subtasksModal' | 'taskSelection' | 'taskDetails' | 'taskSubtasks' | 'recordCreditModal' | 'applyCreditModal' | 'clientCreditHistory' | 'creditEdit' | 'creditDelete' | 'allocationEdit' | 'allocationDelete' | 'paymentEdit' | 'paymentDelete' | 'editReceivable' | 'deleteReceivable' | 'clientReceivablesEdit' | 'urgentAlert' | 'prepaidConflict' | 'taskAmountConflict' | 'taskCancellation' | 'concurrentModification' | 'assignTask' | 'approval' | 'employeePayout' | 'editEmployeePayout' | 'editTaskExpense' | 'submitForReview' | 'employeeBorrow' | 'invoiceForm' | 'recordPayment' | 'recordBatchPayment' | 'accountLedger' | 'invoiceDetails' | 'applyCreditToInvoice' | 'manualTransaction' | 'createInvoice' | 'journalEntryDetails' | 'taskRestore' | 'taskRestoreValidation' | 'taskAmountEdit' | 'invoiceEdit' | 'invoiceCancel' | 'invoiceDelete' | 'transactionEdit' | 'transactionDelete' | 'createEmployee' | 'employeeCredentials' | 'deleteEmployee' | 'employeeDeletionPreview' | 'cashBoxForm' | 'reassignCashBoxEmployee' | 'recordVoucher' | 'voucherEdit' | 'voucherDetails' | 'unifiedTransaction' | 'treasuryCreateAccount' | 'treasuryEditAccount' | 'treasuryPermissions' | 'categoryManager' | 'fcAccountLedger' | 'clientReport' | 'employeeReport' | 'accountReport' | 'treasuryAccountReport';

interface ModalState {
  modalType: ModalType | null;
  props: any;
  isOpen: boolean;
  openModal: (type: ModalType, props?: any) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  modalType: null,
  props: {},
  isOpen: false,
  openModal: (type, props) =>
    set({
      modalType: type,
      props: props as any,
      isOpen: true,
    }),
  closeModal: () =>
    set({
      modalType: null,
      props: {},
      isOpen: false,
    }),
}));
