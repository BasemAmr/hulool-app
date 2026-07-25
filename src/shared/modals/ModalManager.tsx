import React from 'react';
import { useModalStore } from '@/shared/stores/modalStore';
import ClientForm from '@/features/clients/components/ClientForm';
import ClientReportModal from '@/features/clients/components/ClientReportModal';
import TaskModal from '@/features/tasks/components/creation/TaskModal';
import RequirementsModal from '@/features/tasks/components/details/RequirementsModal';
import ManualReceivableModal from '@/features/receivables/modals/ManualReceivableModal';
import ClientReceivablesModal from '@/features/receivables/modals/ClientReceivablesModal';
import SelectReceivableForPaymentModal from '@/features/invoices/modals/SelectReceivableForPaymentModal';
import TagFormModal from '@/features/tags/modals/TagFormModal';
import TagManagementModal from '@/features/tags/modals/TagManagementModal';

import ReceivablePaymentModal from '@/features/receivables/modals/ReceivablePaymentModal';
import PaymentHistoryModal from '@/features/receivables/modals/PaymentHistoryModal';
import PaymentEditModal from '@/features/receivables/modals/PaymentEditModal';
import PaymentDeleteModal from '@/features/receivables/modals/PaymentDeleteModal';
import TaskCompletionModal from '@/features/tasks/modals/TaskCompletionModal';
import AmountDetailsModal from '@/features/financials/modals/AmountDetailsModal';
import SubtasksModal from '@/features/tasks/modals/SubtasksModal';
import TaskSelectionModal from '@/features/tasks/modals/TaskSelectionModal';
import TaskDetailsModal from '@/features/tasks/components/details/TaskDetailsModal';
import TaskSubtasksModal from '@/features/tasks/modals/TaskSubtasksModal';

import RecordCreditModal from '@/features/clients/modals/CreateClientModal';
import CreditEditModal from '@/features/clients/modals/CreditEditModal';
import CreditDeleteModal from '@/features/clients/modals/CreditDeleteModal';
import AllocationEditModal from '@/features/receivables/modals/AllocationEditModal';
import AllocationDeleteModal from '@/features/receivables/modals/AllocationDeleteModal';
import UrgentAlertModal from '@/features/tasks/modals/UrgentAlertModal';
import EmployeePayoutModal from '@/features/employees/modals/EmployeePayoutModal';
import EmployeeBorrowModal from '@/features/employees/modals/EmployeeBorrowModal';
import EditEmployeePayoutModal from '@/features/employees/modals/EditEmployeePayoutModal';
import EditTaskExpenseModal from '@/features/tasks/modals/EditTaskExpenseModal';
import TaskAmountEditModal from '@/features/tasks/modals/TaskAmountEditModal';

import ClientSearchModal from '@/shared/search/ClientSearchModal';
import ApplyCreditModal from '@/features/receivables/modals/ApplyCreditModal';
import DeleteReceivableModal from '@/features/receivables/modals/DeleteReceivableModal';

// NEW CONFLICT RESOLUTION MODALS
import PrepaidConflictModal from '@/features/tasks/modals/PrepaidConflictModal';
import TaskAmountConflictModal from '@/features/tasks/modals/TaskAmountConflictModal';
import TaskCancellationModal from '@/features/tasks/modals/TaskCancellationModal';
import ConcurrentModificationModal from '@/features/tasks/modals/ConcurrentModificationModal';
import { CreateAccountModal } from '@/features/financials/modals/CreateAccountModal';
import AssignTaskModal from '@/features/tasks/modals/AssignTaskModal';
import ApprovalModal from '@/features/tasks/modals/ApprovalModal';
import SubmitForReviewModal from '@/features/tasks/modals/SubmitForReviewModal';

// NEW INVOICE/LEDGER MODALS
import InvoiceFormModal from '@/features/invoices/modals/InvoiceFormModal';
import RecordPaymentModal from '@/features/invoices/modals/RecordPaymentModal';
import RecordBatchPaymentModal from '@/features/invoices/modals/RecordBatchPaymentModal';
import InvoiceDetailsModal from '@/features/invoices/components/InvoiceDetailsModal';
import AccountLedgerModal from '@/features/financials/modals/AccountLedgerModal';

// FINANCIAL CENTER MODALS
import ManualTransactionModal from '@/features/financials/modals/ManualTransactionModal';
import JournalEntryDetailsModal from '@/features/financials/modals/JournalEntryDetailsModal';

import InvoiceEditModal from '@/features/invoices/modals/InvoiceEditModal';
import InvoiceDeleteModal from '@/features/invoices/modals/InvoiceDeleteModal';
import TransactionEditModal from '@/features/financials/modals/TransactionEditModal';
import TransactionDeleteModal from '@/features/employees/modals/TransactionDeleteModal';
import TaskRestoreModal from '@/features/tasks/modals/TaskRestoreModal';

// EMPLOYEE MANAGEMENT MODALS
import EmployeeCredentialsModal from '@/features/employees/modals/EmployeeCredentialsModal';
import EmployeeDeletionPreviewModal from '@/features/employees/modals/EmployeeDeletionPreviewModal';
import EmployeeReportModal from '@/features/employees/modals/EmployeeReportModal';
import AccountReportModal from '@/features/financials/modals/AccountReportModal';

// TREASURY MODALS
import { CreateCashBoxModal } from '@/features/financials/modals/CreateCashBoxModal';
import { ReassignCashBoxEmployeeModal } from '@/features/financials/modals/ReassignCashBoxEmployeeModal';
import { RecordVoucherModal } from '@/features/financials/modals/RecordVoucherModal';

import UnifiedTransactionModal from '@/features/financials/components/UnifiedTransactionModal';
import TreasuryEditAccountModal from '@/features/financials/modals/TreasuryEditAccountModal';
import TreasuryPermissionsModal from '@/features/financials/modals/TreasuryPermissionsModal';
import CategoryManagerModal from '@/features/financials/modals/CategoryManagerModal';
import FCAccountLedgerModal from '@/features/financials/modals/FCAccountLedgerModal';
import TreasuryAccountReportModal from '@/features/financials/modals/TreasuryAccountReportModal';

const ModalManager = () => {
  const modalType = useModalStore((state) => state.modalType);
  const props: any = useModalStore((state) => state.props) || {};
  const isOpen = useModalStore((state) => state.isOpen);
  const closeModal = useModalStore((state) => state.closeModal);

  if (!isOpen || !modalType) return null;

  const renderModal = (Component: any, extraProps: Record<string, any> = {}) => {
    return React.createElement(Component, { key: modalType, ...props, ...extraProps });
  };

  const currentType = modalType as string;

  switch (currentType) {
    case 'clientForm':
      return renderModal(ClientForm, { clientToEdit: props.clientToEdit });

    case 'clientReport':
      return renderModal(ClientReportModal, { isOpen, onClose: closeModal });

    case 'employeeReport':
      return renderModal(EmployeeReportModal, { isOpen, onClose: closeModal });

    case 'taskForm':
      return renderModal(TaskModal);

    case 'requirements':
      return renderModal(RequirementsModal, { task: props.task });

    case 'manualReceivable':
      return renderModal(ManualReceivableModal, { client_id: props.client_id, client: props.client });

    case 'clientReceivables':
      return renderModal(ClientReceivablesModal, { client: props.client });

    case 'paymentForm':
      return renderModal(ReceivablePaymentModal, { receivable: props.receivable, isRequired: props.isRequired });

    case 'paymentHistory':
      return renderModal(PaymentHistoryModal, { receivable: props.receivable });

    case 'clientSearch':
      return renderModal(ClientSearchModal);

    case 'tagForm':
      return renderModal(TagFormModal, { tagToEdit: props.tagToEdit });

    case 'tagManagement':
      return renderModal(TagManagementModal);

    case 'selectReceivableForPayment':
      return renderModal(SelectReceivableForPaymentModal, { clientId: props.clientId, isOpen, onClose: closeModal });

    case 'taskCompletion':
      return renderModal(TaskCompletionModal, { task: props.task });

    case 'amountDetails':
      return renderModal(AmountDetailsModal, { task: props.task });

    case 'subtasksModal':
      return renderModal(SubtasksModal, { subtasks: props.subtasks, onSave: props.onSave });

    case 'taskSelection':
      return renderModal(TaskSelectionModal, { tagId: props.tagId });

    case 'taskDetails':
      return renderModal(TaskDetailsModal, { task: props.task });

    case 'taskSubtasks':
      return renderModal(TaskSubtasksModal, { task: props.task });

    case 'recordCreditModal':
      return renderModal(RecordCreditModal, { client: props.client });

    case 'applyCreditModal':
      return renderModal(ApplyCreditModal, { receivable: props.receivable, availableCredit: props.availableCredit, paymentToReplace: props.paymentToReplace });

    case 'creditEdit':
      return renderModal(CreditEditModal, { credit: props.credit, clientId: props.clientId });

    case 'creditDelete':
      return renderModal(CreditDeleteModal, { credit: props.credit, clientId: props.clientId });

    case 'allocationEdit':
      return renderModal(AllocationEditModal, { allocation: props.allocation, clientId: props.clientId });

    case 'allocationDelete':
      return renderModal(AllocationDeleteModal, { allocation: props.allocation, clientId: props.clientId });

    case 'paymentEdit':
      return renderModal(PaymentEditModal, { payment: props.payment, receivable: props.receivable });

    case 'paymentDelete':
      return renderModal(PaymentDeleteModal, { payment: props.payment });

    case 'deleteReceivable':
      return renderModal(DeleteReceivableModal, { receivable: props.receivable });

    case 'urgentAlert':
      return renderModal(UrgentAlertModal, { taskId: props.taskId });

    case 'prepaidConflict':
      return renderModal(PrepaidConflictModal, { taskId: props.taskId, conflictData: props.conflictData, newPrepaidAmount: props.newPrepaidAmount, onResolved: props.onResolved });

    case 'taskAmountConflict':
      return renderModal(TaskAmountConflictModal, { taskId: props.taskId, conflictData: props.conflictData, newTaskAmount: props.newTaskAmount, onResolved: props.onResolved });

    case 'taskCancellation':
      return renderModal(TaskCancellationModal, { taskId: props.taskId, analysisData: props.analysisData, onResolved: props.onResolved });

    case 'concurrentModification':
      return renderModal(ConcurrentModificationModal, { conflictData: props.conflictData, onRetry: props.onRetry, onCancel: props.onCancel });

    case 'assignTask':
      return renderModal(AssignTaskModal, { task: props.task });

    case 'approval':
      return renderModal(ApprovalModal, { task: props.task });

    case 'employeePayout':
      return renderModal(EmployeePayoutModal, { employee: props.employee, onSuccess: props.onSuccess });

    case 'editEmployeePayout':
      return renderModal(EditEmployeePayoutModal, { payout: props.payout, employee: props.employee, onSuccess: props.onSuccess });

    case 'editTaskExpense':
      return renderModal(EditTaskExpenseModal, { transaction: props.transaction, onSuccess: props.onSuccess });

    case 'submitForReview':
      return renderModal(SubmitForReviewModal, { task: props.task });

    case 'employeeBorrow':
      return renderModal(EmployeeBorrowModal, { employee: props.employee, onSuccess: props.onSuccess });

    case 'invoiceForm':
      return renderModal(InvoiceFormModal, { invoiceToEdit: props.invoiceToEdit, client: props.client, defaultItems: props.defaultItems });

    case 'recordPayment':
      return renderModal(RecordPaymentModal, { invoiceId: props.invoiceId, clientId: props.clientId, clientName: props.clientName });

    case 'recordBatchPayment':
      return renderModal(RecordBatchPaymentModal, { clientId: props.clientId, clientName: props.clientName, selectedInvoices: props.selectedInvoices });

    case 'accountLedger':
      return renderModal(AccountLedgerModal, { accountId: props.accountId, accountName: props.accountName });

    case 'invoiceDetails':
      return renderModal(InvoiceDetailsModal, { invoice: props.invoice });

    case 'manualTransaction':
      return renderModal(ManualTransactionModal, { isOpen, onClose: closeModal });

    case 'journalEntryDetails':
      return renderModal(JournalEntryDetailsModal, { journalEntryId: props.journalEntryId });

    case 'taskRestore':
      return renderModal(TaskRestoreModal, { task: props.task, isOpen, onClose: closeModal });

    case 'taskAmountEdit':
      return renderModal(TaskAmountEditModal, { task: props.task, onSuccess: props.onSuccess });

    case 'invoiceEdit':
      return renderModal(InvoiceEditModal, { invoice: props.invoice, isOpen, onClose: closeModal });

    case 'invoiceDelete':
      return renderModal(InvoiceDeleteModal, { invoice: props.invoice, isOpen, onClose: closeModal });

    case 'transactionEdit':
      return renderModal(TransactionEditModal, { transaction: props.transaction, onSuccess: props.onSuccess, isOpen, onClose: closeModal });

    case 'transactionDelete':
      return renderModal(TransactionDeleteModal, { transaction: props.transaction, onSuccess: props.onSuccess, isOpen, onClose: closeModal });

    case 'createEmployee':
      return null;

    case 'employeeCredentials':
      return renderModal(EmployeeCredentialsModal, { credentials: props.credentials, isOpen, onClose: closeModal });

    case 'deleteEmployee':
      return null;

    case 'employeeDeletionPreview':
      return renderModal(EmployeeDeletionPreviewModal, { preview: props.preview, employee: props.employee, onSuccess: props.onSuccess, isOpen, onClose: closeModal });

    case 'cashBoxForm':
      return renderModal(CreateCashBoxModal, { cashBoxToEdit: props.cashBoxToEdit });

    case 'recordVoucher':
      return renderModal(RecordVoucherModal, { cashBox: props.cashBox, defaultDirection: props.defaultDirection });

    case 'treasuryCreateAccount':
      return renderModal(CreateAccountModal, { isOpen, onClose: closeModal, initialSectionId: props.initialSectionId, defaultSubType: props.defaultSubType });

    case 'unifiedTransaction':
      return renderModal(UnifiedTransactionModal);

    case 'treasuryEditAccount':
      return renderModal(TreasuryEditAccountModal);

    case 'treasuryPermissions':
      return renderModal(TreasuryPermissionsModal);

    case 'categoryManager':
      return renderModal(CategoryManagerModal);

    case 'reassignCashBoxEmployee':
      return renderModal(ReassignCashBoxEmployeeModal, { isOpen, onClose: closeModal, cashBox: props.cashBox, onSuccess: props.onSuccess });

    case 'fcAccountLedger':
      return renderModal(FCAccountLedgerModal);

    case 'accountReport':
      return renderModal(AccountReportModal, { isOpen, onClose: closeModal });

    case 'treasuryAccountReport':
      return renderModal(TreasuryAccountReportModal, { isOpen, onClose: closeModal, subType: props.subType });

    default:
      return null;
  }
};

export default ModalManager;