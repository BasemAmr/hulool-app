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
      <div className="modal-content-wrapper">
        {/* Header Info */}
        <div className="bg-light rounded p-3 mb-4" style={{ border: '1px solid #e9ecef' }}>
          <div className="row">
            <div className="col-md-6">
              <small className="text-muted">العميل</small>
              <div className="fw-bold">{task.client.name}</div>
            </div>
            <div className="col-md-6">
              <small className="text-muted">نوع المهمة</small>
              <div className="fw-bold">{t(`type.${task.type}`)}</div>
            </div>
          </div>
          {task.task_name && (
            <div className="mt-2">
              <small className="text-muted">اسم المهمة</small>
              <div className="fw-bold">{task.task_name}</div>
            </div>
          )}
        </div>

        {/* Amount Details List */}
        <div className="amount-details-list">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0 d-flex align-items-center">
              <Layers size={18} className="me-2" style={{ color: '#d4af37' }} />
              بنود المبلغ
            </h6>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleCopyAll}
              className="d-flex align-items-center gap-1"
              style={{ 
                borderColor: '#d4af37', 
                color: copiedAll ? '#28a745' : '#d4af37'
              }}
            >
              {copiedAll ? <Check size={16} /> : <Copy size={16} />}
              {copiedAll ? 'تم النسخ!' : 'نسخ الكل'}
            </Button>
          </div>

          <div className="list-group list-group-flush">
            {amountDetailsArr.map((detail, index) => (
              <div 
                key={index} 
                className="list-group-item d-flex justify-content-between align-items-center py-3"
                style={{ 
                  border: '1px solid #e9ecef', 
                  borderRadius: '8px',
                  marginBottom: '8px',
                  background: '#fafafa'
                }}
              >
                <div className="flex-grow-1">
                  <div className="fw-medium mb-1">{detail.description}</div>
                  <div className="text-muted small d-flex align-items-center">
                    <DollarSign size={14} className="me-1" />
                    {detail.amount.toLocaleString()} ريال
                  </div>
                </div>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => handleCopyItem(index, `${detail.description}: ${detail.amount} ريال`)}
                  className="ms-2"
                  style={{ 
                    borderColor: copiedItems.has(index) ? '#28a745' : '#6c757d',
                    color: copiedItems.has(index) ? '#28a745' : '#6c757d',
                    minWidth: '80px'
                  }}
                >
                  {copiedItems.has(index) ? (
                    <>
                      <Check size={14} className="me-1" />
                      تم النسخ
                    </>
                  ) : (
                    <>
                      <Copy size={14} className="me-1" />
                      نسخ
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>

          {/* Total */}
          <div 
            className="mt-4 p-3 rounded"
            style={{ 
              background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
              color: 'white'
            }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-bold fs-5">المجموع الإجمالي</div>
                <small className="opacity-75">إجمالي جميع البنود</small>
              </div>
              <div className="text-end">
                <div className="fw-bold fs-4">{total.toLocaleString()} ريال</div>
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
        <div className="d-flex justify-content-end gap-2 mt-4 pt-3" style={{ borderTop: '1px solid #e9ecef' }}>
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
        
        .amount-details-list .list-group-item {
          transition: all 0.2s ease;
        }
        
        .amount-details-list .list-group-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .modal-content-wrapper {
          max-height: 70vh;
          overflow-y: auto;
        }
      `}</style>
    </BaseModal>
  );
};

export default AmountDetailsModal;
