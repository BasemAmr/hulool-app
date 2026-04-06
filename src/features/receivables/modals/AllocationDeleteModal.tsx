import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { useDeleteAllocation } from '@/features/receivables/api/allocationQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';

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
 const closeModal = useModalStore((state) => state.closeModal);
  const props = useModalStore((state) => state.props as AllocationDeleteModalProps);
  const { allocation } = props;
  
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
      <div className="space-y-4">
        {/* Warning Alert */}
        <div className="rounded-lg border border-status-warning-border bg-status-warning-bg p-4 flex gap-3">
          <AlertTriangle className="text-status-warning-text flex-shrink-0 mt-0.5 h-5 w-5" />
          <p className="text-status-warning-text text-sm">{t('allocations.deleteWarning')}</p>
        </div>

        {/* Allocation Details Card */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h6 className="font-semibold text-text-primary text-sm">{t('allocations.allocationDetails')}</h6>
          <dl className="space-y-2">
            <div className="flex justify-between items-start">
              <dt className="font-medium text-muted-foreground text-sm">{t('allocations.amount')}:</dt>
              <dd className="font-semibold text-text-primary">{formatCurrency(allocation.amount)}</dd>
            </div>
            
            <div className="flex justify-between items-start">
              <dt className="font-medium text-muted-foreground text-sm">{t('allocations.description')}:</dt>
              <dd className="font-medium text-text-primary text-right">
                {allocation.description || allocation.credit_description || t('allocations.noDescription')}
              </dd>
            </div>
            
            <div className="flex justify-between items-start">
              <dt className="font-medium text-muted-foreground text-sm">{t('allocations.date')}:</dt>
              <dd className="font-medium text-text-primary">
                {new Date(allocation.allocated_at).toLocaleDateString('ar-SA')}
              </dd>
            </div>
          </dl>
        </div>

        {/* Confirmation Checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            className="rounded border-border-strong"
            id="confirmDelete"
            checked={isConfirmed}
            onChange={(e) => setIsConfirmed(e.target.checked)}
          />
          <label className="text-sm font-medium text-text-primary" htmlFor="confirmDelete">
            {t('allocations.confirmDeleteMessage')}
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
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
      </div>
    </BaseModal>
  );
};

export default AllocationDeleteModal;