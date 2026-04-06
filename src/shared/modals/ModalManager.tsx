import { useModalStore } from '@/shared/stores/modalStore';
import BaseModal from '@/shared/ui/layout/BaseModal';
import ClientForm from '@/features/clients/components/ClientForm';
import TaskModal from '@/features/tasks/components/creation/TaskModal'; // Import TaskModal
import RequirementsModal from '@/features/tasks/components/details/RequirementsModal'; // Import RequirementsModal
import ManualReceivableModal from '@/features/receivables/modals/ManualReceivableModal'; // Import ManualReceivableModal
import ClientReceivablesModal from '@/features/receivables/modals/ClientReceivablesModal';
import SelectReceivableForPaymentModal from '@/features/invoices/modals/SelectReceivableForPaymentModal';
import TagFormModal from '@/features/tags/modals/TagFormModal'; // Import TagFormModal
import TagManagementModal from '@/features/tags/modals/TagManagementModal'; // Import TagManagementModal

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


import Button from '@/shared/ui/primitives/Button';
import { useTranslation } from 'react-i18next';
import ClientSearchModal from '@/shared/search/ClientSearchModal';
import { useGetClientReceivables } from '@/features/receivables/api/receivableQueries';
import ApplyCreditModal from '@/features/receivables/modals/ApplyCreditModal';
import EditManualReceivableModal from '@/features/receivables/modals/EditManualReceivableModal';
import DeleteReceivableModal from '@/features/receivables/modals/DeleteReceivableModal';
import ClientReceivablesEditModal from '@/features/receivables/modals/ClientReceivablesEditModal';

// NEW CONFLICT RESOLUTION MODALS
import PrepaidConflictModal from '@/features/tasks/modals/PrepaidConflictModal';
import TaskAmountConflictModal from '@/features/tasks/modals/TaskAmountConflictModal';
import TaskCancellationModal from '@/features/tasks/modals/TaskCancellationModal';
import ConcurrentModificationModal from '@/features/tasks/modals/ConcurrentModificationModal';
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

// Missing modal imports - Step 1 fix
import InvoiceEditModal from '@/features/invoices/modals/InvoiceEditModal';
import InvoiceDeleteModal from '@/features/invoices/modals/InvoiceDeleteModal';
import TransactionEditModal from '@/features/financials/modals/TransactionEditModal';
import TransactionDeleteModal from '@/features/employees/modals/TransactionDeleteModal';
import TaskRestoreModal from '@/features/tasks/modals/TaskRestoreModal';
import TaskRestoreValidationWrapper from '@/features/tasks/modals/TaskRestoreValidationWrapper';
import { useRestoreTask } from '@/features/tasks/api/taskQueries';
import { useToast } from '@/shared/hooks/useToast';

// EMPLOYEE ACCOUNT MANAGEMENT MODALS
import EmployeeForm from '@/features/employees/forms/EmployeeForm';
import EmployeeCredentialsModal from '@/features/employees/modals/EmployeeCredentialsModal';
import EmployeeDeletionPreviewModal from '@/features/employees/modals/EmployeeDeletionPreviewModal';

// Separate component for client receivables to avoid re-renders
const ClientReceivablesFetcher = ({ client }: { client?: any }) => {
  const { data: receivablesData, isLoading } = useGetClientReceivables(client?.id || 0);

  return (
    <ClientReceivablesModal
      receivables={receivablesData?.statementItems || []}
      isLoading={isLoading}
      clientName={client?.name || ''}
    />
  );
};

const ModalManager = () => {
  // Fix 1: Use individual selectors instead of selecting an object
  const isOpen = useModalStore((state) => state.isOpen);
  const modalType = useModalStore((state) => state.modalType);
  const props = useModalStore((state) => state.props);
  const closeModal = useModalStore((state) => state.closeModal);

  const { t } = useTranslation();

  if (!isOpen) return null;

  // Memoize the modal content to prevent re-renders
  const getModalContent = () => {
    switch (modalType) {
      case 'clientForm':
        return (
          <BaseModal
            key="clientForm"
            isOpen={isOpen}
            onClose={closeModal}
            title={props.clientToEdit ? t('clients.editClient') : t('clients.addNew')}
          >
            <ClientForm clientToEdit={props.clientToEdit} onSuccess={closeModal} />
          </BaseModal>
        );

      case 'taskForm':
        return <TaskModal key="taskForm" />;

      case 'assignTask':
        return <AssignTaskModal key="assignTask" />;

      case 'approval':
        return <ApprovalModal key="approval" />;

      case 'requirements':
        return <RequirementsModal key="requirements" />;

      case 'manualReceivable':
        return <ManualReceivableModal key="manualReceivable" />;
      case 'taskDetails':
        return <TaskDetailsModal key="taskDetails" />;

      case 'taskSubtasks':
        return <TaskSubtasksModal key="taskSubtasks" />;

      case 'clientReceivables':
        return (
          <BaseModal
            key="clientReceivables"
            isOpen={isOpen}
            onClose={closeModal}
            title={`${t('receivables.title')} - ${props.client?.name || ''}`}
          >
            <ClientReceivablesFetcher client={props.client} />
          </BaseModal>
        );

      case 'paymentForm':
        return <ReceivablePaymentModal />;
      case 'paymentHistory':
        return <PaymentHistoryModal />;
      case 'paymentEdit':
        return <PaymentEditModal />;
      case 'paymentDelete':
        return <PaymentDeleteModal />;

      case 'clientSearch':
        return <ClientSearchModal />;

      case 'tagForm':
        return <TagFormModal />;

      case 'tagManagement':
        return <TagManagementModal />;

      case 'selectReceivableForPayment':
        return (
          <SelectReceivableForPaymentModal
            key="selectReceivableForPayment"
            isOpen={isOpen}
            onClose={closeModal}
            clientId={props.clientId}
          />
        );

      case 'taskCompletion':
        return <TaskCompletionModal key="taskCompletion" />;

      case 'amountDetails':
        return <AmountDetailsModal key="amountDetails" />;

      case 'subtasksModal':
        return <SubtasksModal key="subtasksModal" />;

      case 'taskSelection':
        return <TaskSelectionModal key="taskSelection" />;

      case 'recordCreditModal':
        return <RecordCreditModal key="recordCreditModal" />;

      case 'applyCreditModal':
        return <ApplyCreditModal key="applyCreditModal" />;

      case 'creditEdit':
        return <CreditEditModal key="creditEdit" />;

      case 'creditDelete':
        return <CreditDeleteModal key="creditDelete" />;

      case 'allocationEdit':
        return <AllocationEditModal key="allocationEdit" />;

      case 'allocationDelete':
        return <AllocationDeleteModal key="allocationDelete" />;

      case 'editReceivable':
        return <EditManualReceivableModal key="editReceivable" />;

      case 'deleteReceivable':
        return <DeleteReceivableModal key="deleteReceivable" />;

      case 'clientReceivablesEdit':
        return <ClientReceivablesEditModal key="clientReceivablesEdit" />;

      case 'urgentAlert':
        return <UrgentAlertModal key="urgentAlert" />;

      // NEW CONFLICT RESOLUTION MODALS
      case 'prepaidConflict':
        return (
          <PrepaidConflictModal
            key="prepaidConflict"
            taskId={props.taskId}
            conflictData={props.conflictData}
            newPrepaidAmount={props.newPrepaidAmount}
            onResolved={props.onResolved}
          />
        );

      case 'taskAmountConflict':
        return (
          <TaskAmountConflictModal
            key="taskAmountConflict"
            taskId={props.taskId}
            conflictData={props.conflictData}
            newTaskAmount={props.newTaskAmount}
            onResolved={props.onResolved}
          />
        );

      case 'taskCancellation':
        return (
          <TaskCancellationModal
            key="taskCancellation"
            taskId={props.taskId}
            analysisData={props.analysisData}
            onResolved={props.onResolved}
          />
        );

      case 'concurrentModification':
        return (
          <ConcurrentModificationModal
            key="concurrentModification"
            conflictData={props.conflictData}
            onRetry={props.onRetry}
            onCancel={props.onCancel}
          />
        );

      case 'confirmDelete':
        return (
          <BaseModal
            key="confirmDelete"
            isOpen={isOpen}
            onClose={closeModal}
            title={props.title}
          >
            <p>{props.message}</p>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" onClick={closeModal}>{t('common.cancel')}</Button>
              <Button variant="danger" onClick={() => { props.onConfirm(); closeModal(); }}>
                {t('common.confirm')}
              </Button>
            </div>
          </BaseModal>
        );

      case 'employeePayout':
        return <EmployeePayoutModal key="employeePayout" />;

      case 'employeeBorrow':
        return <EmployeeBorrowModal key="employeeBorrow" />;

      case 'editEmployeePayout':
        return <EditEmployeePayoutModal key="editEmployeePayout" />;

      case 'editTaskExpense':
        return <EditTaskExpenseModal key="editTaskExpense" />;

      case 'submitForReview':
        return <SubmitForReviewModal key="submitForReview" />;

      // NEW INVOICE/LEDGER MODALS
      case 'invoiceForm':
        return <InvoiceFormModal key="invoiceForm" />;

      case 'recordPayment':
        return <RecordPaymentModal key="recordPayment" />;

      case 'recordBatchPayment':
        return <RecordBatchPaymentModal key="recordBatchPayment" />;

      case 'invoiceDetails':
        return <InvoiceDetailsModal key="invoiceDetails" />;

      case 'accountLedger':
        return <AccountLedgerModal key="accountLedger" />;

      // FINANCIAL CENTER MODALS
      case 'manualTransaction':
        return (
          <ManualTransactionModal
            key="manualTransaction"
            isOpen={isOpen}
            onClose={closeModal}
            preselectedAccount={props?.preselectedAccount}
            direction={props?.direction}
            accountType={props?.accountType}
          />
        );

      case 'createInvoice':
        return <InvoiceFormModal key="createInvoice" />;

      case 'journalEntryDetails':
        return <JournalEntryDetailsModal key="journalEntryDetails" />;

      case 'taskAmountEdit':
        return (
          <TaskAmountEditModal
            key="taskAmountEdit"
            isOpen={isOpen}
            onClose={closeModal}
            task={props.task}
          />
        );

      // Step 1: Missing modal registrations
      case 'invoiceEdit':
        return (
          <InvoiceEditModal
            key="invoiceEdit"
            isOpen={isOpen}
            onClose={closeModal}
            invoice={props.invoice}
          />
        );

      case 'invoiceDelete':
        return (
          <InvoiceDeleteModal
            key="invoiceDelete"
            isOpen={isOpen}
            onClose={closeModal}
            invoice={props.invoice}
          />
        );

      case 'transactionEdit':
        return (
          <TransactionEditModal
            key="transactionEdit"
            isOpen={isOpen}
            onClose={closeModal}
            transaction={props.transaction}
          />
        );

      case 'transactionDelete':
        return (
          <TransactionDeleteModal
            key="transactionDelete"
            isOpen={isOpen}
            onClose={closeModal}
            transaction={props.transaction}
          />
        );

      case 'taskRestore':
        return (
          <TaskRestoreModal
            key="taskRestore"
            isOpen={isOpen}
            onClose={closeModal}
            task={props.task}
          />
        );

      case 'taskRestoreValidation':
        return (
          <TaskRestoreValidationWrapper
            key="taskRestoreValidation"
            taskId={Number(props.taskId)}
            onClose={closeModal}
          />
        );

      // EMPLOYEE ACCOUNT MANAGEMENT MODALS
      case 'createEmployee':
        return (
          <BaseModal
            key="createEmployee"
            isOpen={isOpen}
            onClose={closeModal}
            title="إنشاء موظف جديد"
          >
            <EmployeeForm
              onSubmit={props.onSubmit}
              isLoading={props.isLoading}
              onCancel={closeModal}
            />
          </BaseModal>
        );

      case 'employeeCredentials':
        return (
          <EmployeeCredentialsModal
            key="employeeCredentials"
            isOpen={isOpen}
            onClose={closeModal}
            credentials={props.credentials}
          />
        );

      case 'deleteEmployee':
        return (
          <BaseModal
            key="deleteEmployee"
            isOpen={isOpen}
            onClose={closeModal}
            title="حذف الموظف"
          >
            <div className="space-y-4" dir="rtl">
              <p className="text-foreground">
                هل أنت متأكد من حذف الموظف <strong>{props.employee?.display_name}</strong>؟
              </p>
              <p className="text-sm text-foreground/60">
                لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex items-center justify-start gap-3 pt-4 border-t border-border">
                <Button
                  variant="danger"
                  onClick={() => {
                    props.onConfirm?.();
                    closeModal();
                  }}
                  isLoading={props.isLoading}
                >
                  حذف
                </Button>
                <Button
                  variant="outline-info"
                  onClick={closeModal}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </BaseModal>
        );

      case 'employeeDeletionPreview':
        return (
          <EmployeeDeletionPreviewModal
            key="employeeDeletionPreview"
            isOpen={isOpen}
            onClose={closeModal}
            employee={props.employee}
            onConfirmDelete={props.onConfirmDelete}
          />
        );

      default:
        return null;
    }
  };

  return getModalContent();
};

export default ModalManager;