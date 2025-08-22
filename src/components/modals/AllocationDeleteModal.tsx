import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDeleteAllocation } from '../../queries/allocationQueries';
import { useModalStore } from '../../stores/modalStore';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';

interface AllocationDeleteModalProps {
  allocation: {
    id: number;
    amount: number;
    description: string;
    credit_id: number;
    receivable_id: number;
    allocated_at: string;
    credit_description?: string;
  };
  clientId: number;
}

const AllocationDeleteModal: React.FC = () => {
  const { t } = useTranslation();
  const { closeModal, props } = useModalStore();
  const { allocation } = props as AllocationDeleteModalProps;
  
  const deleteAllocation = useDeleteAllocation();
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleDelete = async () => {
    deleteAllocation.mutate(allocation.id, {
      onSuccess: () => {
        closeModal();
      }
    });
  };
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(amount);

  return (
    <BaseModal
      title={t('allocations.deleteAllocation')}
      onClose={closeModal}
      isOpen={true}
    >
      <div className="modal-body">
        <div className="alert alert-warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {t('allocations.deleteWarning')}
        </div>

        <div className="card">
          <div className="card-body">
            <h6 className="card-title">{t('allocations.allocationDetails')}</h6>
            <dl className="row mb-0">
              <dt className="col-sm-4">{t('allocations.amount')}:</dt>
              <dd className="col-sm-8">{formatCurrency(allocation.amount)}</dd>
              
              <dt className="col-sm-4">{t('allocations.description')}:</dt>
              <dd className="col-sm-8">
                {allocation.description || allocation.credit_description || t('allocations.noDescription')}
              </dd>
              
              <dt className="col-sm-4">{t('allocations.date')}:</dt>
              <dd className="col-sm-8">
                {new Date(allocation.allocated_at).toLocaleDateString('ar-SA')}
              </dd>
            </dl>
          </div>
        </div>

        <div className="form-check mt-3">
          <input
            type="checkbox"
            className="form-check-input"
            id="confirmDelete"
            checked={isConfirmed}
            onChange={(e) => setIsConfirmed(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="confirmDelete">
            {t('allocations.confirmDeleteMessage')}
          </label>
        </div>
      </div>

      <div className="modal-footer">
        <Button
          type="button"
          variant="secondary"
          onClick={closeModal}
          disabled={deleteAllocation.isPending}
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={handleDelete}
          isLoading={deleteAllocation.isPending}
          disabled={!isConfirmed}
        >
          {t('common.delete')}
        </Button>
      </div>
    </BaseModal>
  );
};

export default AllocationDeleteModal;