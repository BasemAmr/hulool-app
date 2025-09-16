import { useModalStore } from '../../stores/modalStore';
import BaseModal from '../ui/BaseModal';
import ClientForm from '../clients/ClientForm';
import TaskModal from '../tasks/TaskModal'; // Import TaskModal
import RequirementsModal from '../tasks/RequirementsModal'; // Import RequirementsModal
import ManualReceivableModal from '../receivables/ManualReceivableModal'; // Import ManualReceivableModal
import ClientReceivablesModal from '../receivables/ClientReceivablesModal';
import SelectReceivableForPaymentModal from '../modals/SelectReceivableForPaymentModal';
import TagFormModal from '../modals/TagFormModal'; // Import TagFormModal
import TagManagementModal from '../tags/TagManagementModal'; // Import TagManagementModal

import ReceivablePaymentModal from '../payments/ReceivablePaymentModal';
import PaymentHistoryModal from '../payments/PaymentHistoryModal';
import PaymentEditModal from '../payments/PaymentEditModal';
import PaymentDeleteModal from '../payments/PaymentDeleteModal';
import TaskCompletionModal from '../modals/TaskCompletionModal';
import AmountDetailsModal from '../modals/AmountDetailsModal';
import TaskSelectionModal from '../modals/TaskSelectionModal';
import TaskDetailsModal from '../modals/TaskDetailsModal';

import RecordCreditModal from '../modals/RecordCreditModal';
import CreditEditModal from '../modals/CreditEditModal';
import CreditDeleteModal from '../modals/CreditDeleteModal';
import AllocationEditModal from '../modals/AllocationEditModal';
import AllocationDeleteModal from '../modals/AllocationDeleteModal';
import UrgentAlertModal from '../modals/UrgentAlertModal';
import EmployeePayoutModal from '../modals/EmployeePayoutModal';
import EmployeeBorrowModal from '../modals/EmployeeBorrowModal';
import EditEmployeePayoutModal from '../modals/EditEmployeePayoutModal';
import EditTaskExpenseModal from '../modals/EditTaskExpenseModal';


import Button from '../ui/Button';
import { useTranslation } from 'react-i18next';
import ClientSearchModal from './ClientSearchModal';
import { useGetClientReceivables } from '../../queries/receivableQueries';
import ApplyCreditModal from '../modals/ApplyCreditModal';
import EditManualReceivableModal from '../receivables/EditManualReceivableModal';
import DeleteReceivableModal from '../receivables/DeleteReceivableModal';
import ClientReceivablesEditModal from '../receivables/ClientReceivablesEditModal';

// NEW CONFLICT RESOLUTION MODALS
import PrepaidConflictModal from '../modals/PrepaidConflictModal';
import TaskAmountConflictModal from '../modals/TaskAmountConflictModal';
import TaskCancellationModal from '../modals/TaskCancellationModal';
import ConcurrentModificationModal from '../modals/ConcurrentModificationModal';
import AssignTaskModal from '../modals/AssignTaskModal';
import ApprovalModal from '../modals/ApprovalModal';
import SubmitForReviewModal from '../modals/SubmitForReviewModal';

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

      case 'paymentForm':
        return <ReceivablePaymentModal key="paymentForm" />;

      case 'paymentHistory':
        return <PaymentHistoryModal key="paymentHistory" />;

      case 'paymentEdit':
        return <PaymentEditModal key="paymentEdit" />;

      case 'paymentDelete':
        return <PaymentDeleteModal key="paymentDelete" />;

      case 'clientSearch':
        return <ClientSearchModal key="clientSearch" />;

      case 'tagForm':
        return <TagFormModal key="tagForm" />;

      case 'tagManagement':
        return <TagManagementModal key="tagManagement" />;

      case 'confirmDelete':
        return (
          <BaseModal
            key="confirmDelete"
            isOpen={isOpen}
            onClose={closeModal}
            title={props.title}
          >
            <p>{props.message}</p>
            <footer className="modal-footer">
               <Button variant="secondary" onClick={closeModal}>{t('common.cancel')}</Button>
               <Button variant="danger" onClick={() => { props.onConfirm(); closeModal(); }}>
                 {t('common.confirm')}
               </Button>
            </footer>
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

      default:
        return null;
    }
  };

  return getModalContent();
};

export default ModalManager;