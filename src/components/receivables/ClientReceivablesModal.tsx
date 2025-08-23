import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Receivable, Payment, StatementItem } from '../../api/types'; // Import StatementItem
import Button from '../ui/Button';
import { ChevronRight, ChevronDown, FileText, CreditCard, Edit3, Trash2 } from 'lucide-react';
import { useModalStore } from '../../stores/modalStore';
import { formatDate } from '../../utils/dateUtils';

interface ClientReceivablesTableProps {
  receivables: StatementItem[]; // Now expects statement items
  isLoading: boolean;
  clientName: string;
  onSettlePayment?: (receivable: Receivable) => void;
  filter?: 'all' | 'unpaid' | 'paid';
}

const ClientReceivablesTable: React.FC<ClientReceivablesTableProps> = ({
  receivables: statementItems, // Rename prop for clarity
  isLoading,
  onSettlePayment,
}) => {
  const { t } = useTranslation();
  const openModal = useModalStore((state) => state.openModal);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!statementItems.length) {
    return (
      <div className="text-center p-5 text-muted">
        <FileText size={48} className="mb-3 opacity-50" />
        <p className="mb-0">{t('receivables.noReceivables')}</p>
      </div>
    );
  }

  const toggleRow = (itemId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(itemId)) {
      newExpandedRows.delete(itemId);
    } else {
      newExpandedRows.add(itemId);
    }
    setExpandedRows(newExpandedRows);
  };

  const getTypeBadge = (type: string) => {
    const badgeClasses = {
      'Accounting': 'badge bg-warning text-dark fw-semibold',
      'RealEstate': 'badge bg-success text-white fw-semibold',
      'Government': 'badge bg-primary text-white fw-semibold',
      'Other': 'badge bg-secondary text-white fw-semibold'
    };
    const badgeText = {
      'Accounting': 'محاسبة', 'RealEstate': 'عقاري', 'Government': 'حكومي', 'Other': 'أخرى'
    };
    return (
      <span className={badgeClasses[type as keyof typeof badgeClasses] || badgeClasses.Other}>
        {badgeText[type as keyof typeof badgeText] || badgeText.Other}
      </span>
    );
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'SAR', minimumFractionDigits: 2
  }).format(amount);

  const totals = {
    totalDebit: statementItems.reduce((sum, item) => sum + item.debit, 0),
    totalCredit: statementItems.reduce((sum, item) => sum + item.credit, 0),
    totalNet: statementItems.length > 0 ? statementItems[statementItems.length - 1].balance : 0,
  };

  return (
    <div className="receivables-table-container">
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 receivables-table">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                  <th className="text-center py-3" style={{ width: '40px' }}></th>
                  <th className="text-center py-3">الوصف</th>
                  <th className="text-center py-3">النوع</th>
                  <th className="text-center py-3">المدين</th>
                  <th className="text-center py-3">الدائن</th>
                  <th className="text-center py-3">الرصيد</th>
                  <th className="text-center py-3">تاريخ الحركة</th>
                  <th className="text-center py-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {statementItems.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr 
                      className="receivable-row" 
                      style={{ cursor: item.payments && item.payments.length > 0 ? 'pointer' : 'default' }}
                      onClick={() => item.payments && item.payments.length > 0 && toggleRow(item.id)}
                    >
                      <td className="text-center align-middle">
                        {item.payments && item.payments.length > 0 ? (
                          expandedRows.has(item.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                        ) : null}
                      </td>
                      <td className="fw-medium">{item.description}</td>
                      <td className="text-center">{getTypeBadge(item.type)}</td>
                      <td className="text-center">
                        <span className="text-danger fw-semibold">
                          {item.debit > 0 ? formatCurrency(item.debit) : '—'}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="text-success fw-semibold">
                          {item.credit > 0 ? formatCurrency(item.credit) : '—'}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="fw-bold" style={{ color: 'var(--color-primary)' }}>
                          {formatCurrency(item.balance)}
                        </span>
                      </td>
                      <td className="text-center small">{formatDate(item.date)}</td>
                      <td className="text-center">
                        {onSettlePayment && (item.remaining_amount ?? 0) > 0 && (
                          <Button
                            variant="primary" size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSettlePayment({ id: item.receivable_id } as Receivable);
                            }}
                          >
                            <CreditCard size={14} /> دفع
                          </Button>
                        )}
                        {(item.remaining_amount ?? 0) <= 0 && item.debit > 0 && (
                           <span className="badge bg-success text-white small">مسدد</span>
                        )}
                      </td>
                    </tr>
                    {expandedRows.has(item.id) && item.payments && item.payments.length > 0 && (
                      <tr className="payment-details-row">
                        <td colSpan={8} className="p-0">
                          <div style={{ backgroundColor: '#f8f9fa', padding: '1rem' }}>
                            <div className="small text-muted mb-2 fw-medium">تفاصيل المدفوعات:</div>
                            <table className="table table-sm bg-white mb-0">
                              <thead>
                                <tr>
                                  <th className="text-center">المبلغ</th>
                                  <th className="text-center">التاريخ</th>
                                  <th className="text-center">الطريقة</th>
                                  <th className="text-center">الإجراءات</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.payments.map((p: Payment) => (
                                  <tr key={p.id}>
                                    <td className="text-center text-success">{formatCurrency(p.amount)}</td>
                                    <td className="text-center">{formatDate(p.paid_at)}</td>
                                    <td className="text-center">{p.payment_method?.name_ar || 'غير محدد'}</td>
                                    <td className="text-center">
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        className="me-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openModal('paymentEdit', { payment: p, receivable: { id: item.receivable_id } });
                                        }}
                                        title="تعديل"
                                      >
                                        <Edit3 size={14} />
                                      </Button>
                                      <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openModal('paymentDelete', { payment: p });
                                        }}
                                        title="حذف"
                                      >
                                        <Trash2 size={14} />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Summary Totals Row */}
      <div className="card border-0 shadow-sm mt-2">
        <div className="card-body p-2">
          <div className="row text-center">
            <div className="col-md-4">
              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                <span className="text-muted small">إجمالي المدين:</span>
                <span className="fw-bold text-danger">{formatCurrency(totals.totalDebit)}</span>
              </div>
            </div>
            <div className="col-md-4">
              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                <span className="text-muted small">إجمالي الدائن:</span>
                <span className="fw-bold text-success">{formatCurrency(totals.totalCredit)}</span>
              </div>
            </div>
            <div className="col-md-4">
              <div className="d-flex justify-content-between align-items-center p-2 bg-primary text-white rounded">
                <span className="small">الرصيد النهائي:</span>
                <span className="fw-bold">{formatCurrency(totals.totalNet)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .receivable-row:hover { background-color: #f8f9fa !important; }
        .cursor-pointer { cursor: pointer; }
      `}</style>
    </div>
  );
};

export default ClientReceivablesTable;