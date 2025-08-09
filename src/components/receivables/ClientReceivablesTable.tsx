import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Receivable, Payment, StatementItem } from '../../api/types';
import Button from '../ui/Button';
import { ChevronRight, ChevronDown, FileText, CreditCard } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { useModalStore } from '../../stores/modalStore';

interface ClientReceivablesTableProps {
  receivables: StatementItem[];
  isLoading: boolean;
  clientName: string;
  onSettlePayment?: (receivable: Receivable) => void;
  filter?: 'all' | 'unpaid' | 'paid';
}

const ClientReceivablesTable: React.FC<ClientReceivablesTableProps> = ({
  receivables: statementItems,
  isLoading,
  onSettlePayment,
}) => {
  const { t } = useTranslation();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const openModal = useModalStore(state => state.openModal);

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
                  <th className="text-center py-3">المدين</th>
                  <th className="text-center py-3">الدائن</th>
                  <th className="text-center py-3">الرصيد</th>
                  <th className="text-center py-3">تاريخ الحركة</th>
                  <th className="text-center py-3">النوع</th>
                  <th className="text-center py-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {statementItems.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr 
                      className="receivable-row cursor-pointer" 
                      onClick={() => item.payments && item.payments.length > 0 && toggleRow(item.id)}
                    >
                      <td className="text-center align-middle">
                        {item.payments && item.payments.length > 0 ? (
                          expandedRows.has(item.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                        ) : null}
                      </td>
                      <td className="fw-medium">{item.description}</td>
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
                      <td className="text-center">{getTypeBadge(item.type)}</td>
                      <td className="text-center">
                        {(item.remaining_amount ?? 0) > 0 && (
                          <Button
                            variant="primary" size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSettlePayment && item.receivable_id) {
                                // Backwards compatibility with parent handler
                                onSettlePayment({ id: item.receivable_id } as Receivable);
                                return;
                              }
                              if (!item.receivable_id) {
                                console.warn('Statement item missing receivable_id; cannot open payment modal directly', item);
                                return;
                              }
                              // Build minimal receivable object compatible with payment modal
                              const pseudoReceivable: Receivable = {
                                id: item.receivable_id,
                                client_id: 0, // unknown in statement item context
                                task_id: item.task_id ?? null,
                                type: item.type as any,
                                description: item.description,
                                amount: item.debit || item.balance + item.credit, // approximate original amount
                                amount_details: null,
                                notes: null,
                                due_date: item.date,
                                created_at: item.date,
                                updated_at: item.date,
                                total_paid: item.credit,
                                remaining_amount: item.remaining_amount ?? (item.debit - item.credit),
                                payments: item.payments || [],
                                client: { id: '', name: '', phone: '' },
                                task: item.task_id ? { id: String(item.task_id), name: item.description, type: item.type as any } : undefined
                              };
                              openModal('paymentForm', { receivable: pseudoReceivable });
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
                          <div style={{ backgroundColor: 'var(--color-gray-50)', padding: '1rem' }}>
                            <div className="small text-muted mb-2 fw-medium">تفاصيل المدفوعات:</div>
                            <table className="table table-sm bg-white mb-0">
                              <thead>
                                <tr>
                                  <th className="text-center">المبلغ</th>
                                  <th className="text-center">التاريخ</th>
                                  <th className="text-center">الطريقة</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.payments.map((p: Payment) => (
                                  <tr key={p.id}>
                                    <td className="text-center text-success">{formatCurrency(p.amount)}</td>
                                    <td className="text-center">{formatDate(p.paid_at)}</td>
                                    <td className="text-center">{p.payment_method?.name_ar || 'غير محدد'}</td>
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