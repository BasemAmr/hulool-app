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


import Button from '../ui/Button';
import { useTranslation } from 'react-i18next';
import ClientSearchModal from './ClientSearchModal';
import { useGetClientReceivables } from '../../queries/receivableQueries';
import ApplyCreditModal from '../modals/ApplyCreditModal';
import EditManualReceivableModal from '../receivables/EditManualReceivableModal';
import DeleteReceivableModal from '../receivables/DeleteReceivableModal';
import ClientReceivablesEditModal from '../receivables/ClientReceivablesEditModal';

const ModalManager = () => {
  // Fix 1: Use individual selectors instead of selecting an object
  const isOpen = useModalStore((state) => state.isOpen);
  const modalType = useModalStore((state) => state.modalType);
  const props = useModalStore((state) => state.props);
  const closeModal = useModalStore((state) => state.closeModal);
  
  const { t } = useTranslation();

  if (!isOpen) return null;

  const renderModalContent = () => {
    switch (modalType) {
      case 'clientForm':
        return (
          <BaseModal
            isOpen={isOpen}
            onClose={closeModal}
            title={props.clientToEdit ? t('clients.editClient') : t('clients.addNew')}
          >
            <ClientForm clientToEdit={props.clientToEdit} onSuccess={closeModal} />
          </BaseModal>
        );

      case 'taskForm':
        // Fix 2: Add the missing taskForm case
        return <TaskModal />;

      case 'requirements':
        // Add the requirements modal case
        return <RequirementsModal />;

      case 'manualReceivable':
        // Add the manual receivable modal case
        return <ManualReceivableModal />;
       case 'taskDetails':
        return <TaskDetailsModal />;

      case 'clientReceivables': {
        // Create a wrapper component that fetches data and passes props
        const ClientReceivablesWrapper = () => {
          const { data: receivablesData, isLoading } = useGetClientReceivables(props.client?.id || 0);
          
          return (
            <BaseModal
              isOpen={isOpen}
              onClose={closeModal}
              title={`${t('receivables.title')} - ${props.client?.name || ''}`}
            >
              <ClientReceivablesModal
                receivables={receivablesData?.statementItems || []}
                isLoading={isLoading}
                clientName={props.client?.name || ''}
              />
            </BaseModal>
          );
        };
        
        return <ClientReceivablesWrapper />;
      }

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
            isOpen={isOpen}
            onClose={closeModal}
            clientId={props.clientId}
          />
        );

      case 'taskCompletion':
        return <TaskCompletionModal />;

      case 'amountDetails':
        return <AmountDetailsModal />;

      case 'taskSelection':
        return <TaskSelectionModal />;

      case 'recordCreditModal':
        return <RecordCreditModal />;

      case 'applyCreditModal':
        return <ApplyCreditModal />;

      case 'creditEdit':
        return <CreditEditModal />;

      case 'creditDelete':
        return <CreditDeleteModal />;

      case 'allocationEdit':
        return <AllocationEditModal />;

      case 'allocationDelete':
        return <AllocationDeleteModal />;

      case 'editReceivable':
        return <EditManualReceivableModal />;

      case 'deleteReceivable':
        return <DeleteReceivableModal />;

      case 'clientReceivablesEdit':
        return <ClientReceivablesEditModal />;

      case 'urgentAlert':
        return <UrgentAlertModal />;

      case 'confirmDelete':
        return (
          <BaseModal
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

      default:
        return null;
    }
  };

  return renderModalContent();
};

export default ModalManager;