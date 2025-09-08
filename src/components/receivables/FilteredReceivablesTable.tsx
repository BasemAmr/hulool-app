import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Receivable } from '../../api/types';
import Button from '../ui/Button';
import { ChevronRight, ChevronDown, FileText, CreditCard, MessageSquare, Edit3, Trash2 } from 'lucide-react';
import { useModalStore } from '../../stores/modalStore';
import { formatDate } from '../../utils/dateUtils';
import { useStickyHeader } from '../../hooks/useStickyHeader';

interface FilteredReceivablesTableProps {
  receivables: Receivable[];
  isLoading: boolean;
  filterType: 'paid' | 'overdue';
}

const FilteredReceivablesTable: React.FC<FilteredReceivablesTableProps> = ({
  receivables,
  isLoading,
  filterType
}) => {
  const navigate = useNavigate();
  const openModal = useModalStore((state) => state.openModal);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const { sentinelRef, isSticky } = useStickyHeader();

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!receivables.length) {
    return (
      <div className="text-center p-5 text-muted">
        <FileText size={48} className="mb-3 opacity-50" />
        <p className="mb-0">
          {filterType === 'paid' ? 'لا توجد مستحقات مسددة' : 'لا توجد مستحقات غير مسددة'}
        </p>
      </div>
    );
  }

  // Sort receivables by newest first (created_at descending)
  const sortedReceivables = [...receivables].sort((a, b) => {
    const dateA = new Date(a.due_date || '').getTime();
    const dateB = new Date(b.due_date || '').getTime();
    return dateB - dateA; // Newest first
  });

  const toggleRow = (receivableId: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(receivableId)) {
      newExpandedRows.delete(receivableId);
    } else {
      newExpandedRows.add(receivableId);
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
      'Accounting': 'محاسبة',
      'RealEstate': 'عقاري',
      'Government': 'حكومي',
      'Other': 'أخرى'
    };

    return (
      <span className={badgeClasses[type as keyof typeof badgeClasses] || badgeClasses.Other}>
        {badgeText[type as keyof typeof badgeText] || badgeText.Other}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleClientClick = (clientId: number) => {
    navigate(`/clients/${clientId}?mode=receivables`);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.startsWith('+') ? phone : `+966${phone}`;
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handlePayment = (receivable: Receivable) => {
    openModal('paymentForm', { receivable });
  };

  // Calculate totals
  const totals = sortedReceivables.reduce(
    (acc, receivable) => ({
      totalDebit: acc.totalDebit + receivable.amount,
      totalCredit: acc.totalCredit + receivable.total_paid,
      totalNet: acc.totalNet + receivable.remaining_amount
    }),
    { totalDebit: 0, totalCredit: 0, totalNet: 0 }
  );

  return (
    <div className="table-responsive" dir="rtl">
      {/* Sentinel element for sticky header detection */}
      <div ref={sentinelRef} ></div>
      
      <table className="table table-hover align-middle">
        <thead className={`${filterType === 'paid' ? 'table-success' : 'table-danger'} ${isSticky ? 'is-sticky' : ''}`}>
          <tr className="fw-bold">
            <th scope="col" className="text-center" style={{ width: '5%', color: '#000' }}></th>
            <th scope="col" className="text-center" style={{ width: '8%', color: '#000' }}>العميل</th>
            <th scope="col" className="text-center" style={{ width: '7%', color: '#000' }}>رقم الهاتف</th>
            <th scope="col" className="text-center" style={{ width: '20%', color: '#000' }}>الوصف</th>
            <th scope="col" className="text-center" style={{ width: '10%', color: '#000' }}>النوع</th>
            <th scope="col" className="text-center" style={{ width: '12%', color: '#000' }}>المبلغ</th>
            <th scope="col" className="text-center" style={{ width: '12%', color: '#000' }}>المدفوع</th>
            <th scope="col" className="text-center" style={{ width: '12%', color: '#000' }}>المتبقي</th>
            <th scope="col" className="text-center" style={{ width: '10%', color: '#000' }}>تاريخ الأمر</th>
            <th scope="col" className="text-center" style={{ width: '4%', color: '#000' }}>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {sortedReceivables.map((receivable) => {
            const isExpanded = expandedRows.has(receivable.id);
            const hasPayments = receivable.payments && receivable.payments.length > 0;
            
            return (
              <React.Fragment key={receivable.id}>
                <tr>
                  <td className="text-center">
                    {hasPayments && (
                      <button
                        className="btn btn-sm btn-link p-0 text-primary"
                        onClick={() => toggleRow(receivable.id)}
                        style={{ fontSize: '14px' }}
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    )}
                  </td>
                  <td className="text-start">
                    <div className="d-flex align-items-center justify-content-between" style={{ direction: 'rtl' }}>
                      <div
                        className="fw-bold text-primary cursor-pointer"
                        onClick={() => handleClientClick(Number(receivable.client_id))}
                        style={{ cursor: 'pointer' }}
                      >
                        {receivable.client?.name}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-muted small d-flex justify-content-center align-items-center justify-content-end">
                        <button
                          className="btn btn-link btn-sm p-0 text-success ms-1"
                          onClick={() => handleWhatsApp(receivable.client?.phone || '')}
                          title="WhatsApp"
                          style={{ fontSize: '12px' }}
                        >
                          <MessageSquare size={12} />
                        </button>
                        <span>{receivable.client?.phone}</span>
                      </div>
                  </td>
                  <td className="text-center">
                    <div className="text-truncate" style={{ maxWidth: '200px' }} title={receivable.description}>
                      {receivable.description}
                    </div>
                  </td>
                  <td className="text-center">
                    {getTypeBadge(receivable.type)}
                  </td>
                  <td className="text-center fw-bold text-danger">
                    {formatCurrency(receivable.amount)}
                  </td>
                  <td className="text-center fw-bold text-success">
                    {formatCurrency(receivable.total_paid)}
                  </td>
                  <td className="text-center fw-bold text-primary">
                    {formatCurrency(receivable.remaining_amount)}
                  </td>
                  <td className="text-center">
                    <small className={new Date(receivable.due_date) < new Date() ? 'text-danger fw-bold' : 'text-muted'}>
                      {formatDate(receivable.due_date)}
                    </small>
                  </td>
                  <td className="text-center">
                    {receivable.remaining_amount > 0 && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handlePayment(receivable)}
                      >
                        <CreditCard size={14} className="me-1" />
                        سداد
                      </Button>
                    )}
                  </td>
                </tr>
                
                {/* Expanded row for payments */}
                {isExpanded && hasPayments && (
                  <tr>
                    <td colSpan={9}>
                      <div className="bg-light p-3 rounded">
                        <h6 className="mb-3 text-primary">تفاصيل المدفوعات</h6>
                        <div className="table-responsive">
                          <table className="table table-sm mb-0">
                            <thead>
                              <tr>
                                <th className="text-center">المبلغ</th>
                                <th className="text-center">طريقة الدفع</th>
                                <th className="text-center">تاريخ الدفع</th>
                                <th className="text-center">الملاحظات</th>
                                <th className="text-center">الإجراءات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {receivable.payments.map((payment) => (
                                <tr key={payment.id}>
                                  <td className="text-center fw-bold text-success">
                                    {formatCurrency(payment.amount)}
                                  </td>
                                  <td className="text-center">
                                    {payment.payment_method?.name_ar || 'غير محدد'}
                                  </td>
                                  <td className="text-center">
                                    {formatDate(payment.paid_at)}
                                  </td>
                                  <td className="text-center">
                                    {payment.note || '-'}
                                  </td>
                                  <td className="text-center">
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      className="me-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openModal('paymentEdit', { payment, receivable });
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
                                        openModal('paymentDelete', { payment });
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
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot className={filterType === 'paid' ? 'table-success' : 'table-danger'}>
          <tr className="fw-bold">
            <td colSpan={4} className="text-start">الإجمالي</td>
            <td className="text-center text-danger">
              {formatCurrency(totals.totalDebit)}
            </td>
            <td className="text-center text-success">
              {formatCurrency(totals.totalCredit)}
            </td>
            <td className="text-center text-primary">
              {formatCurrency(totals.totalNet)}
            </td>
            <td colSpan={2}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default FilteredReceivablesTable;
