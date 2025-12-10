import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, DollarSign, Layers } from 'lucide-react';
import type { Task } from '../../api/types';
import { useModalStore } from '../../stores/modalStore';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';

interface AmountDetailsModalProps {
  task: Task;
}

const AmountDetailsModal = () => {
  const { t } = useTranslation();
  const closeModal = useModalStore((state) => state.closeModal);
  const props = useModalStore((state) => state.props as AmountDetailsModalProps);
  const { task } = props;
  const [copiedItems, setCopiedItems] = useState<Set<number>>(new Set());
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyItem = async (index: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => new Set(prev).add(index));
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(index);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyAll = async () => {
    if (!task.amount_details || task.amount_details.length === 0) return;
    
    const allText = task.amount_details
      .map(detail => `${detail.description}: ${detail.amount} ريال`)
      .join('\n') + `\n\nالمجموع: ${task.amount} ريال`;
    
    try {
      await navigator.clipboard.writeText(allText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // task.amount_details may be a JSON string ("[]") or an array. Normalize to array.
  let amountDetailsArr: any[] = [];
  if (Array.isArray(task.amount_details)) {
    amountDetailsArr = task.amount_details;
  } else if (typeof task.amount_details === 'string') {
    try {
      const parsed = JSON.parse(task.amount_details);
      amountDetailsArr = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      amountDetailsArr = [];
    }
  }

  if (!amountDetailsArr || amountDetailsArr.length === 0) {
    return (
      <BaseModal isOpen={true} onClose={closeModal} title="تفاصيل المبلغ">
        <div className="text-center py-4">
          <DollarSign size={48} className="mx-auto mb-3 text-muted" />
          <p className="text-muted">لا توجد تفاصيل للمبلغ في هذه المهمة</p>
          <Button variant="secondary" onClick={closeModal} className="mt-3">
            إغلاق
          </Button>
        </div>
      </BaseModal>
    );
  }

  const total = amountDetailsArr.reduce((sum, detail) => sum + (Number(detail?.amount) || 0), 0);

  return (
    <BaseModal isOpen={true} onClose={closeModal} title="تفاصيل المبلغ" className="amount-details-modal">
      <div className="max-h-screen overflow-y-auto space-y-4">
        {/* Header Info */}
        <div className="bg-gray-100 rounded-lg p-4 border border-gray-300 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <small className="text-muted-foreground text-xs block">العميل</small>
              <div className="font-semibold">{task.client.name}</div>
            </div>
            <div>
              <small className="text-muted-foreground text-xs block">نوع المهمة</small>
              <div className="font-semibold">{t(`type.${task.type}`)}</div>
            </div>
          </div>
          {task.task_name && (
            <div>
              <small className="text-muted-foreground text-xs block">اسم المهمة</small>
              <div className="font-semibold">{task.task_name}</div>
            </div>
          )}
        </div>

        {/* Amount Details List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h6 className="font-semibold text-black flex items-center gap-2 m-0">
              <Layers size={18} className="text-yellow-600" />
              بنود المبلغ
            </h6>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleCopyAll}
              className="flex items-center gap-1"
              style={{ 
                borderColor: '#d4af37', 
                color: copiedAll ? '#28a745' : '#d4af37'
              }}
            >
              {copiedAll ? <Check size={16} /> : <Copy size={16} />}
              {copiedAll ? 'تم النسخ!' : 'نسخ الكل'}
            </Button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {amountDetailsArr.map((detail, index) => (
              <div 
                key={index} 
                className="flex justify-between items-start p-3 rounded-lg border border-gray-200 bg-gray-50 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex-1">
                  <div className="font-medium text-black mb-1">{detail.description}</div>
                  <div className="text-muted-foreground text-sm flex items-center gap-1">
                    <DollarSign size={14} />
                    {detail.amount.toLocaleString()} ريال
                  </div>
                </div>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => handleCopyItem(index, `${detail.description}: ${detail.amount} ريال`)}
                  className="ml-2 flex items-center gap-1"
                  style={{ 
                    borderColor: copiedItems.has(index) ? '#28a745' : '#6c757d',
                    color: copiedItems.has(index) ? '#28a745' : '#6c757d',
                    minWidth: '80px'
                  }}
                >
                  {copiedItems.has(index) ? (
                    <>
                      <Check size={14} />
                      تم النسخ
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      نسخ
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>

          {/* Total */}
          <div 
            className="p-4 rounded-lg text-white"
            style={{ 
              background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)'
            }}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-lg">المجموع الإجمالي</div>
                <small className="opacity-75">إجمالي جميع البنود</small>
              </div>
              <div className="text-right">
                <div className="font-bold text-2xl">{total.toLocaleString()} ريال</div>
                {total !== task.amount && (
                  <small className="opacity-75">
                    (المبلغ في المهمة: {task.amount.toLocaleString()} ريال)
                  </small>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-300">
          <Button variant="secondary" onClick={closeModal}>
            إغلاق
          </Button>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        .amount-details-modal .modal-dialog {
          max-width: 750px;
        }
      `}</style>
    </BaseModal>
  );
};

export default AmountDetailsModal;
