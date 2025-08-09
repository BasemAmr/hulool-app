import { useState, useEffect } from 'react';
import {  CreditCard } from 'lucide-react';
import { useGetPayableReceivables } from '../../queries/receivableQueries';
import { useModalStore } from '../../stores/modalStore';
import Button from '../ui/Button';
import { formatDate } from '../../utils/dateUtils';

interface SelectReceivableForPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
}

const SelectReceivableForPaymentModal = ({ isOpen, onClose, clientId }: SelectReceivableForPaymentModalProps) => {
  const openModal = useModalStore((state) => state.openModal);
  const [selectedReceivableId, setSelectedReceivableId] = useState<number | null>(null);
  
  const { data: payableData, isLoading } = useGetPayableReceivables(clientId);

  const receivables = payableData?.receivables || [];
  const selectedReceivable = receivables.find(r => r.id === selectedReceivableId);

  useEffect(() => {
    if (!isOpen) {
      setSelectedReceivableId(null);
    }
  }, [isOpen]);

  const handleReceivableSelect = (receivableId: number) => {
    setSelectedReceivableId(receivableId);
  };

  const handleProceedToPayment = () => {
    if (selectedReceivable) {
      onClose();
      openModal('paymentForm', { receivable: selectedReceivable });
    }
  };

  const formatCurrency = (amount: number) => {
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(numAmount);
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content" dir="rtl">
          <div className="modal-header">
            <h5 className="modal-title">اختيار المستحق للسداد</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : receivables.length === 0 ? (
              <div className="text-center text-muted py-4">
                <p>لا توجد مستحقات قابلة للسداد لهذا العميل</p>
              </div>
            ) : (
              <div>
                <p className="mb-3">يرجى اختيار المستحق الذي تريد سداده:</p>
                <div className="list-group">
                  {receivables.map((receivable) => (
                    <div
                      key={receivable.id}
                      className={`list-group-item list-group-item-action ${
                        selectedReceivableId === receivable.id ? 'active' : ''
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleReceivableSelect(receivable.id)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{receivable.description}</h6>
                          <small className="text-muted">
                            تاريخ الأمر: {formatDate(receivable.due_date)}
                          </small>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold text-danger">
                            {formatCurrency(receivable.amount)}
                          </div>
                          <small className="text-success">
                            مدفوع: {formatCurrency(receivable.total_paid || 0)}
                          </small>
                          <div className="fw-bold text-primary">
                            متبقي: {formatCurrency((receivable.amount || 0) - (receivable.total_paid || 0))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <Button variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button 
              variant="primary" 
              onClick={handleProceedToPayment}
              disabled={!selectedReceivableId}
            >
              <CreditCard size={16} className="me-2" />
              متابعة للسداد
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectReceivableForPaymentModal;
