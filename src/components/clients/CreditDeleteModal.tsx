import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useDeleteClientCredit, useResolveCreditDeletion } from '../../queries/clientCreditQueries';
import type { ClientCredit, CreditDeletionConflictData } from '../../api/types';

interface CreditDeleteModalProps {
  credit: ClientCredit;
  clientId: number;
}

const CreditDeleteModal = ({ credit }: CreditDeleteModalProps) => {
  const { t } = useTranslation();
  const closeModal = useModalStore((state) => state.closeModal);
  const deleteCredit = useDeleteClientCredit();
  const resolveDeletion = useResolveCreditDeletion();

  const [error, setError] = useState<string>('');
  const [isResolving, setIsResolving] = useState(false);
  const [conflictData, setConflictData] = useState<CreditDeletionConflictData | null>(null);
  const [allocationResolutions, setAllocationResolutions] = useState<Record<number, 'convert_to_payment' | 'delete_allocation'>>({});
  const [paymentMethods, setPaymentMethods] = useState<Record<number, number>>({});

  const handleDelete = async () => {
    try {
      await deleteCredit.mutateAsync(credit.id);
      closeModal();
    } catch (error: any) {
      if (error.response?.status === 409 && error.response?.data?.data) {
        setConflictData(error.response.data.data);
        setIsResolving(true);

        // Initialize resolutions
        const resolutions: Record<number, any> = {};
        conflictData?.allocations.forEach(alloc => {
          resolutions[alloc.id] = 'delete_allocation';
        });
        setAllocationResolutions(resolutions);
      } else {
        setError(error.response?.data?.message || t('common.error'));
      }
    }
  };

  const handleResolution = async () => {
    try {
      const resolutions = conflictData!.allocations.map(alloc => ({
        allocation_id: alloc.id,
        action: allocationResolutions[alloc.id] || 'delete_allocation',
        payment_method_id: allocationResolutions[alloc.id] === 'convert_to_payment'
          ? paymentMethods[alloc.id]
          : undefined
      }));

      await resolveDeletion.mutateAsync({
        id: credit.id,
        allocation_resolutions: resolutions
      });
      closeModal();
    } catch (error: any) {
      setError(error.response?.data?.message || t('common.error'));
    }
  };

  const handleAllocationResolutionChange = (allocationId: number, action: 'keep' | 'reduce_allocation' | 'remove_allocation') => {
    setAllocationResolutions(prev => {
      if (action === 'keep' || action === 'reduce_allocation' || action === 'remove_allocation') {
        return { ...prev, [allocationId]: 'delete_allocation' };
      }
      return { ...prev, [allocationId]: action as 'convert_to_payment' | 'delete_allocation' };
    });
  };

  const handlePaymentMethodChange = (allocationId: number, methodId: number) => {
    setPaymentMethods(prev => ({ ...prev, [allocationId]: methodId }));
  };

  const isResolutionComplete = () => {
    if (!isResolving) return true;

    return conflictData!.allocations.every(alloc => {
      const resolution = allocationResolutions[alloc.id];
      if (resolution === 'convert_to_payment') {
        return paymentMethods[alloc.id];
      }
      return true;
    });
  };

  return (
    <div className="modal-body">
      <h5 className="modal-title mb-3">
        {t('clients.deleteCredit')}
      </h5>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {!isResolving ? (
        <>
          <p>
            {t('clients.deleteCreditConfirm', {
              description: credit.description,
              amount: Number(credit.amount).toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })
            })}
          </p>

          {credit.allocated_amount > 0 && (
            <div className="alert alert-warning">
              <strong>{t('clients.warning')}:</strong> {t('clients.creditHasAllocations')}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="alert alert-warning">
            <h6>{t('clients.creditDeletionConflict')}</h6>
            <p>
              {t('clients.creditDeletionConflictMessage', {
                allocated: Number(conflictData!.allocated_amount).toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })
              })}
            </p>
          </div>

          <div className="mb-3">
            <h6>{t('clients.allocationResolutions')}</h6>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>{t('common.description')}</th>
                    <th>{t('common.amount')}</th>
                    <th>{t('clients.resolution')}</th>
                    <th>{t('clients.paymentMethod')}</th>
                  </tr>
                </thead>
                <tbody>
                  {conflictData!.allocations.map((alloc) => (
                    <tr key={alloc.id}>
                      <td>{alloc.description}</td>
                      <td>
                        {Number(alloc.amount).toLocaleString('ar-SA', {
                          style: 'currency',
                          currency: 'SAR'
                        })}
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={allocationResolutions[alloc.id] || 'delete_allocation'}
                          onChange={(e) => handleAllocationResolutionChange(alloc.id, e.target.value as 'keep' | 'reduce_allocation' | 'remove_allocation')}
                        >
                          <option value="delete_allocation">{t('common.delete')}</option>
                          <option value="convert_to_payment">{t('clients.convertToPayment')}</option>
                        </select>
                      </td>
                      <td>
                        {allocationResolutions[alloc.id] === 'convert_to_payment' && (
                          <select
                            className="form-select form-select-sm"
                            value={paymentMethods[alloc.id] || ''}
                            onChange={(e) => handlePaymentMethodChange(alloc.id, Number(e.target.value))}
                          >
                            <option value="">{t('clients.selectPaymentMethod')}</option>
                            <option value="1">{t('paymentMethods.cash')}</option>
                            <option value="2">{t('paymentMethods.bankTransfer')}</option>
                            <option value="3">{t('paymentMethods.check')}</option>
                            <option value="4">{t('paymentMethods.creditCard')}</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="d-flex justify-content-end gap-2">
        <button className="btn btn-secondary" onClick={closeModal}>
          {t('common.cancel')}
        </button>
        {!isResolving ? (
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={deleteCredit.isPending}
          >
            {deleteCredit.isPending ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                {t('common.deleting')}
              </>
            ) : (
              t('common.delete')
            )}
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleResolution}
            disabled={!isResolutionComplete() || resolveDeletion.isPending}
          >
            {resolveDeletion.isPending ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                {t('common.processing')}
              </>
            ) : (
              t('common.resolve')
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default CreditDeleteModal;