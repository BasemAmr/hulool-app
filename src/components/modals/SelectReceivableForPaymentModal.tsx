import { useState, useEffect } from 'react';
import {  CreditCard } from 'lucide-react';
import { useGetPayableReceivables } from '../../queries/receivableQueries';
import { useModalStore } from '../../stores/modalStore';
import Button from '../ui/Button';
import BaseModal from '../ui/BaseModal';
import { formatDate } from '../../utils/dateUtils';

interface SelectReceivableForPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
}

const SelectReceivableForPaymentModal = ({ isOpen, onClose, clientId }: SelectReceivableForPaymentModalProps) => {
  const openModal = useModalStore((state) => state.openModal);
  const [selectedReceivableId, setSelectedReceivableId] = useState<number | null>(null);
  
  // Handle Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);
  
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
    <BaseModal isOpen={isOpen} onClose={onClose} title="اختيار المستحق للسداد">
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin text-primary">
              <div className="h-6 w-6 border-3 border-primary border-t-transparent rounded-full"></div>
            </div>
          </div>
        ) : receivables.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            <p>لا توجد مستحقات قابلة للسداد لهذا العميل</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-black">يرجى اختيار المستحق الذي تريد سداده:</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {receivables.map((receivable) => (
                <div
                  key={receivable.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedReceivableId === receivable.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => handleReceivableSelect(Number(receivable.id))}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h6 className="font-semibold text-black text-sm">{receivable.description}</h6>
                      <small className="text-muted-foreground text-xs">
                        تاريخ الأمر: {formatDate(receivable.due_date)}
                      </small>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-destructive text-sm">
                        {formatCurrency(receivable.amount)}
                      </div>
                      <small className="text-green-600 text-xs block">
                        مدفوع: {formatCurrency(receivable.total_paid || 0)}
                      </small>
                      <div className="font-semibold text-primary text-sm">
                        متبقي: {formatCurrency((receivable.amount || 0) - (receivable.total_paid || 0))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button 
            variant="primary" 
            onClick={handleProceedToPayment}
            disabled={!selectedReceivableId}
          >
            <CreditCard size={16} className="mr-2" />
            متابعة للسداد
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default SelectReceivableForPaymentModal;
