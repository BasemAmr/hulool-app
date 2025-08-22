import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useUpdateClientCredit, useResolveCreditReduction } from '../../queries/clientCreditQueries';
import type { ClientCredit, CreditReductionConflictData } from '../../api/types';
import SaudiRiyalIcon from '../ui/SaudiRiyalIcon';

interface CreditEditModalProps {
  credit: ClientCredit;
  clientId: number;
}

const CreditEditModal = ({ credit }: CreditEditModalProps) => {
  const { t } = useTranslation();
  const closeModal = useModalStore((state) => state.closeModal);
  const updateCredit = useUpdateClientCredit();
  const resolveReduction = useResolveCreditReduction();

  const [amount, setAmount] = useState<number>(credit.amount);
  const [error, setError] = useState<string>('');
  const [isResolving, setIsResolving] = useState(false);
  const [conflictData, setConflictData] = useState<CreditReductionConflictData | null>(null);
  const [allocationAdjustments, setAllocationAdjustments] = useState<Record<number, 'keep' | 'reduce_allocation' | 'remove_allocation'>>({});
  const [reductionAmounts, setReductionAmounts] = useState<Record<number, number>>({});

  useEffect(() => {
    if (conflictData) {
      const adjustments: Record<number, any> = {};
      conflictData.allocations.forEach(alloc => {
        adjustments[alloc.id] = 'keep';
      });
      setAllocationAdjustments(adjustments);
    }
  }, [conflictData]);

  const handleSubmit = async () => {
    if (amount <= 0) {
      setError(t('validation.positiveAmount'));
      return;
    }

    if (amount === credit.amount) {
      closeModal();
      return;
    }

    try {
      if (isResolving && conflictData) {
        // Handle conflict resolution
        const adjustments = conflictData.allocations.map(alloc => ({
          allocation_id: alloc.id,
          action: allocationAdjustments[alloc.id] || 'keep',
          new_amount: allocationAdjustments[alloc.id] === 'reduce_allocation' 
            ? reductionAmounts[alloc.id] || alloc.amount 
            : undefined
        }));

        await resolveReduction.mutateAsync({
          id: credit.id,
          new_amount: amount,
          allocation_adjustments: adjustments
        });
      } else {
        // Try normal update
        await updateCredit.mutateAsync({ id: credit.id, amount });
      }
      closeModal();
    } catch (error: any) {
      if (error.response?.status === 409 && error.response?.data?.data) {
        setConflictData(error.response.data.data);
        setIsResolving(true);
      } else {
        setError(error.response?.data?.message || t('common.error'));
      }
    }
  };

  const handleAllocationChange = (allocationId: number, action: string) => {
    setAllocationAdjustments(prev => ({ ...prev, [allocationId]: action as 'keep' | 'reduce_allocation' | 'remove_allocation' }));
  };

  const handleReductionAmountChange = (allocationId: number, value: number) => {
    setReductionAmounts(prev => ({ ...prev, [allocationId]: value }));
  };

  const getTotalAdjustedAmount = () => {
    if (!conflictData) return 0;
    
    return conflictData.allocations.reduce((total, alloc) => {
      const action = allocationAdjustments[alloc.id];
      if (action === 'remove_allocation') {
        return total + alloc.amount;
      } else if (action === 'reduce_allocation') {
        const reduction = reductionAmounts[alloc.id] || alloc.amount;
        return total + (alloc.amount - reduction);
      }
      return total;
    }, 0);
  };

  const canSave = () => {
    if (!isResolving) return true;
    
    const totalAdjusted = getTotalAdjustedAmount();
    const requiredReduction = conflictData!.allocated_amount - amount;
    
    return totalAdjusted >= requiredReduction;
  };

  return (
    <div className="modal-body">
      <h5 className="modal-title mb-3">
        {t('clients.editCredit')}
      </h5>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {isResolving && conflictData && (
        <div className="alert alert-warning">
          <h6>{t('clients.creditConflict')}</h6>
          <p>
            {t('clients.creditConflictMessage', {
              allocated: conflictData.allocated_amount.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' }),
              newAmount: amount.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' }),
              deficit: conflictData.deficit.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })
            })}
          </p>
        </div>
      )}

      <div className="mb-3">
        <label className="form-label">{t('common.amount')}</label>
        <div className="input-group">
          <span className="input-group-text">
            <SaudiRiyalIcon size={16} />
          </span>
          <input
            type="number"
            className="form-control"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min="0"
            step="0.01"
            disabled={isResolving}
          />
        </div>
      </div>

      {isResolving && conflictData && (
        <div className="mb-3">
          <h6>{t('clients.allocationAdjustments')}</h6>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>{t('common.description')}</th>
                  <th>{t('common.amount')}</th>
                  <th>{t('common.action')}</th>
                  <th>{t('clients.newAmount')}</th>
                </tr>
              </thead>
              <tbody>
                {conflictData.allocations.map((alloc) => (
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
                        value={allocationAdjustments[alloc.id] || 'keep'}
                        onChange={(e) => handleAllocationChange(alloc.id, e.target.value)}
                      >
                        <option value="keep">{t('common.keep')}</option>
                        <option value="reduce_allocation">{t('common.reduce')}</option>
                        <option value="remove_allocation">{t('common.remove')}</option>
                      </select>
                    </td>
                    <td>
                      {allocationAdjustments[alloc.id] === 'reduce_allocation' && (
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={reductionAmounts[alloc.id] || alloc.amount}
                          onChange={(e) => handleReductionAmountChange(alloc.id, Number(e.target.value))}
                          min="0"
                          max={alloc.amount}
                          step="0.01"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-muted small">
            {t('clients.totalReduction')}: {getTotalAdjustedAmount().toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}
          </div>
        </div>
      )}

      <div className="d-flex justify-content-end gap-2">
        <button className="btn btn-secondary" onClick={closeModal}>
          {t('common.cancel')}
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit}
          disabled={!canSave() || updateCredit.isPending || resolveReduction.isPending}
        >
          {updateCredit.isPending || resolveReduction.isPending ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" role="status"></span>
              {t('common.saving')}
            </>
          ) : (
            t('common.save')
          )}
        </button>
      </div>
    </div>
  );
};

export default CreditEditModal;