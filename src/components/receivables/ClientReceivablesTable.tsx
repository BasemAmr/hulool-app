import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Receivable, Payment, StatementItem, Client, CreditAllocation } from '../../api/types';
import Button from '../ui/Button';
import { ChevronRight, ChevronDown, FileText, CreditCard, Edit3, Trash2 } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { useModalStore } from '../../stores/modalStore';

interface ClientReceivablesTableProps {
  receivables: StatementItem[];
  isLoading: boolean;
  client: Client; // New prop to pass client data
  // onSettlePayment?: (receivable: Receivable) => void;
  filter?: 'all' | 'unpaid' | 'paid';
  hideAmounts?: boolean;
}

const ClientReceivablesTable: React.FC<ClientReceivablesTableProps> = ({
  receivables: statementItems,
  isLoading,
  client,
  filter = 'all',
  hideAmounts = false,
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



  // Filter items based on the filter prop
  const filteredItems = statementItems.filter(item => {
    switch (filter) {
      case 'unpaid':
        return (item.remaining_amount ?? 0) > 0;
      case 'paid':
        return (item.remaining_amount ?? 0) <= 0 && item.debit > 0;
      default:
        return true; // 'all'
    }
  });

  // Sort by date ASCENDING to calculate running balance correctly
  const sortedItems = [...filteredItems].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;
  const itemsWithRunningBalance = sortedItems.map(item => {
    runningBalance += item.debit - item.credit;
    return { ...item, running_balance: runningBalance };
  }).reverse(); // Reverse back for newest-first display

  const totalCredit = filteredItems.reduce((sum, item) => sum + item.credit, 0);
  const totalDebit = filteredItems.reduce((sum, item) => sum + item.debit, 0);
  const totalNet = filteredItems.reduce((sum, item) => sum + item.balance, 0);
  const totals = {
    totalDebit,
    totalCredit,
    totalNet: totalNet
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
                  <th className="text-center py-3">المستحق</th>
                  <th className="text-center py-3">تاريخ الحركة</th>
                  <th className="text-center py-3">النوع</th>
                  <th className="text-center py-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {itemsWithRunningBalance.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr
                      className="receivable-row cursor-pointer"
                      onClick={() => ((item.details?.payments && item.details.payments.length > 0) || (item.details?.allocations && item.details.allocations.length > 0)) && toggleRow(item.id)}
                    >
                      <td className="text-center align-middle">
                        {(item.details?.payments && item.details.payments.length > 0) || (item.details?.allocations && item.details.allocations.length > 0) ? (
                          expandedRows.has(item.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                        ) : null}
                      </td>
                      <td className="fw-medium">{item.description}</td>
                      <td className="text-center">
                        <span className=" fw-semibold">
                          {hideAmounts ? '***' : (item.debit > 0 ? formatCurrency(item.debit) : '—')}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="text-success fw-semibold">
                          {hideAmounts ? '***' : (item.credit > 0 ? formatCurrency(item.credit) : '—')}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="fw-bold text-danger">
                          {hideAmounts ? '***' : formatCurrency(item.balance)}
                        </span>
                      </td>
                      <td className="text-center small">{formatDate(item.date)}</td>
                      <td className="text-center">{getTypeBadge(item.type)}</td>
                      <td className="text-center">
                        <div className="d-flex gap-1 justify-content-center">
                          {/* Edit/Delete buttons for all receivables */}
                          {(item.details?.receivables && item.details.receivables.length > 0 && !item.details.receivables[0].task_id) && (
                            <>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const receivable = item.details?.receivables?.find(r => r.id === item.receivable_id) || {
                                    id: item.details?.receivables && item.details?.receivables[0].id,
                                    client_id: Number(client.id),
                                    task_id: item.task_id ? Number(item.task_id) : null,
                                    type: String(item.type) as any,
                                    description: item.description,
                                    amount: Number(item.debit || item.balance + item.credit),
                                    due_date: item.date,
                                    notes: '',
                                    created_at: item.date,
                                    updated_at: item.date
                                  };
                                  openModal('editReceivable', { receivable });
                                }}
                              >
                                <Edit3 size={12} />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const receivable = item.details?.receivables?.find(r => r.id === item.receivable_id) || {
                                    id: item.details?.receivables && item.details?.receivables[0].id,
                                    client_id: Number(client.id),
                                    task_id: item.task_id ? Number(item.task_id) : null,
                                    type: String(item.type) as any,
                                    description: item.description,
                                    amount: Number(item.debit || item.balance + item.credit),
                                    due_date: item.date,
                                    notes: '',
                                    created_at: item.date,
                                    updated_at: item.date
                                  };
                                  openModal('deleteReceivable', { receivable });
                                }}
                              >
                                <Trash2 size={12} />
                              </Button>
                            </>
                          )}
                          
                          {/* Payment button */}
                          {(item.remaining_amount ?? 0) > 0 && (
                            <Button
                              variant="primary" size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!item.details) {
                                  return;
                                }
                                if (!item.details.receivables) {
                                  return;
                                }
                                if (item.details.receivables.length == 0) {
                                  return;
                                }
                                if (!item.receivable_id) {
                                  console.warn('Statement item missing receivable_id; cannot open payment modal directly', item);
                                  let _id = item?.details?.receivables[0]?.id == item?.details?.receivables[0]?.prepaid_receivable_id ? item?.details?.receivables[1]?.id : item?.details?.receivables[0]?.id;
                                  console.log(_id)
                                  if (!_id) {
                                    return;
                                  }
                                }


                                // Build minimal receivable object compatible with payment modal
                                const pseudoReceivable: Receivable = {
                                  id: item?.details?.receivables[0]?.id == item?.details?.receivables[0]?.prepaid_receivable_id ? item?.details?.receivables[1]?.id : item?.details?.receivables[0]?.id,
                                  client_id: Number(client.id),
                                  task_id: item.task_id ? Number(item.task_id) : null,
                                  // receivable_id:item?.details?.receivables[0]?.id == item?.details?.receivables[0]?.prepaid_receivable_id ? item?.details?.receivables[1]?.id : item?.details?.receivables[0]?.id,
                                  reference_receivable_id: null,
                                  prepaid_receivable_id: item?.details?.receivables[0]?.prepaid_receivable_id,

                                  created_by: Number(client.id),
                                  type: String(item.type) as any,
                                  description: item.description,
                                  amount: Number(item.debit || item.balance + item.credit),
                                  original_amount: null,
                                  amount_details: [],
                                  adjustment_reason: null,
                                  notes: null,
                                  due_date: item.date,
                                  created_at: item.date,
                                  updated_at: item.date,
                                  client_name: client.name,
                                  client_phone: client.phone,
                                  task_name: item.description,
                                  task_type: String(item.type),
                                  total_paid: Number(item.credit),
                                  remaining_amount: Number(item.remaining_amount ?? (item.debit - item.credit)),
                                  payments: item.details?.payments || [],
                                  allocations: [] as CreditAllocation[],
                                  client: {
                                    id: Number(client.id),
                                    name: client.name,
                                    phone: client.phone
                                  }
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
                        </div>
                      </td>
                    </tr>
                    {(expandedRows.has(item.id) && ((item.details?.payments && item.details?.payments.length > 0) || (item.details?.allocations && item.details?.allocations.length > 0))) && (
                      <tr className="payment-details-row">
                        <td colSpan={8} className="p-0">
                          <div style={{ backgroundColor: 'var(--color-gray-50)', padding: '1rem' }}>
                            {(item?.details.payments && item?.details.payments.length > 0) || (item.details?.allocations && item.details.allocations.length > 0) ? (
                              <div>
                                {item?.details.payments && item?.details.payments.length > 0 && (
                                  <div className="mb-3">
                                    <div className="small text-muted mb-2 fw-medium">💳 تفاصيل المدفوعات ({item?.details.payments.length}):</div>
                                    <table className="table table-sm bg-white mb-0">
                                      <thead>
                                        <tr>
                                          <th className="text-center">المبلغ</th>
                                          <th className="text-center">التاريخ</th>
                                          <th className="text-center">طريقة الدفع</th>
                                          <th className="text-center">الإجراءات</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {item?.details.payments.map((p: Payment) => {
                                          let methodName = 'غير محدد';
                                          if (p.payment_method) {
                                            if (typeof p.payment_method === 'object') {
                                              methodName = p.payment_method.name_ar || p.payment_method.name_en || 'غير محدد';
                                            } else if (typeof p.payment_method === 'string') {
                                              methodName = p.payment_method;
                                            }
                                          } else if ((p as any).name_ar) {
                                            methodName = (p as any).name_ar;
                                          } else if ((p as any).payment_method_name) {
                                            methodName = (p as any).payment_method_name;
                                          } else if ((p as any).method_name) {
                                            methodName = (p as any).method_name;
                                          }
                                          return (
                                            <tr key={p.id || `${p.receivable_id}-${p.paid_at}`}>
                                              <td className="text-center text-success fw-bold">{formatCurrency(p.amount)}</td>
                                              <td className="text-center">{formatDate(p.paid_at)}</td>
                                              <td className="text-center fw-medium">{methodName}</td>
                                              <td className="text-center">
                                                <Button
                                                  variant="outline-primary"
                                                  size="sm"
                                                  className="me-1"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openModal('paymentEdit', { payment: p, receivable: { client_id: client.id } });
                                                  }}
                                                >
                                                  <Edit3 size={12} />
                                                </Button>
                                                <Button
                                                  variant="danger"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openModal('paymentDelete', { payment: p });
                                                  }}
                                                >
                                                  <Trash2 size={12} />
                                                </Button>
                                              </td>
                                            </tr>
                                          );
                                        })
                                        }
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {item.details?.allocations && item.details.allocations.length > 0 && (
                                  <div className={item?.details.payments && item?.details.payments.length > 0 ? 'mt-3' : ''}>
                                    <div className="small text-muted mb-2 fw-medium">🔄 تفاصيل التخصيصات ({item.details.allocations.length}):</div>
                                    <table className="table table-sm bg-white mb-0">
                                      <thead>
                                        <tr>
                                          <th className="text-center">المبلغ</th>
                                          <th className="text-center">التاريخ</th>
                                          <th className="text-center">الوصف</th>
                                          <th className="text-center">المصدر</th>
                                          <th className="text-center">الإجراءات</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {item.details.allocations.map((allocation: CreditAllocation) => (
                                          <tr key={allocation.id || `${allocation.credit_id}-${allocation.receivable_id}`}>
                                            <td className="text-center text-info fw-bold">{formatCurrency(allocation.amount)}</td>
                                            <td className="text-center">{formatDate(allocation.allocated_at)}</td>
                                            <td className="text-center">{allocation.description ?? 'تخصيص من رصيد العميل'}</td>
                                            <td className="text-center">
                                              'تخصيص'
                                            </td>
                                            <td className="text-center">
                                              <Button
                                                variant="outline-primary"
                                                size="sm"
                                                className="me-1"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openModal('allocationEdit', { allocation, clientId: client.id });
                                                }}
                                              >
                                                <Edit3 size={12} />
                                              </Button>
                                              <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openModal('allocationDelete', { allocation, clientId : client.id });

                                                }}
                                              >
                                                <Trash2 size={12} />
                                              </Button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            ) : null}
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
        .receivable-row:hover { background-color: #f8f9fa ; }
        .cursor-pointer { cursor: pointer; }
      `}</style>
    </div>
  );
};

export default ClientReceivablesTable;