import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { useModalStore } from '../../stores/modalStore';
import { useDeleteClientCredit, useResolveCreditDeletion } from '../../queries/clientCreditQueries';
import type { ClientCredit, CreditDeletionConflictData } from '../../api/types';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';

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
    <BaseModal isOpen={true} onClose={closeModal} title={t('clients.deleteCredit')}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 flex gap-3">
            <AlertTriangle className="text-destructive flex-shrink-0 mt-0.5 h-5 w-5" />
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {!isResolving ? (
          <>
            {/* Confirmation Message */}
            <div className="space-y-2">
              <p className="text-black text-sm">
                {t('clients.deleteCreditConfirm', {
                  description: credit.description,
                  amount: Number(credit.amount).toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })
                })}
              </p>

              {credit.allocated_amount > 0 && (
                <div className="rounded-lg border border-yellow-600 bg-yellow-50 p-3 flex gap-3">
                  <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5 h-5 w-5" />
                  <div>
                    <p className="font-medium text-yellow-900 text-sm">{t('clients.warning')}:</p>
                    <p className="text-yellow-800 text-sm">{t('clients.creditHasAllocations')}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Conflict Alert */}
            <div className="rounded-lg border border-yellow-600 bg-yellow-50 p-4 space-y-2">
              <h6 className="font-semibold text-yellow-900">{t('clients.creditDeletionConflict')}</h6>
              <p className="text-yellow-800 text-sm">
                {t('clients.creditDeletionConflictMessage', {
                  allocated: Number(conflictData!.allocated_amount).toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })
                })}
              </p>
            </div>

            {/* Allocations Resolution Table */}
            <div className="space-y-2">
              <h6 className="font-semibold text-black">{t('clients.allocationResolutions')}</h6>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 font-semibold text-black">{t('common.description')}</th>
                      <th className="text-left px-3 py-2 font-semibold text-black">{t('common.amount')}</th>
                      <th className="text-left px-3 py-2 font-semibold text-black">{t('clients.resolution')}</th>
                      <th className="text-left px-3 py-2 font-semibold text-black">{t('clients.paymentMethod')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {conflictData!.allocations.map((alloc) => (
                      <tr key={alloc.id} className="hover:bg-muted/50">
                        <td className="px-3 py-2 text-black">{alloc.description}</td>
                        <td className="px-3 py-2 text-black">
                          {Number(alloc.amount).toLocaleString('ar-SA', {
                            style: 'currency',
                            currency: 'SAR'
                          })}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="w-full px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            value={allocationResolutions[alloc.id] || 'delete_allocation'}
                            onChange={(e) => handleAllocationResolutionChange(alloc.id, e.target.value as 'keep' | 'reduce_allocation' | 'remove_allocation')}
                          >
                            <option value="delete_allocation">{t('common.delete')}</option>
                            <option value="convert_to_payment">{t('clients.convertToPayment')}</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          {allocationResolutions[alloc.id] === 'convert_to_payment' && (
                            <select
                              className="w-full px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="secondary" onClick={closeModal}>
            {t('common.cancel')}
          </Button>
          {!isResolving ? (
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteCredit.isPending}
            >
              {t('common.delete')}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleResolution}
              isLoading={resolveDeletion.isPending}
              disabled={!isResolutionComplete()}
            >
              {t('common.resolve')}
            </Button>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

export default CreditDeleteModal;