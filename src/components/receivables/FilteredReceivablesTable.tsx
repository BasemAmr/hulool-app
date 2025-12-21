import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Receivable } from '../../api/types';
import Button from '../ui/Button';
import { ChevronRight, ChevronDown, FileText, CreditCard, MessageSquare, Edit3, Trash2 } from 'lucide-react';
import { useModalStore } from '../../stores/modalStore';
import { formatDate } from '../../utils/dateUtils';
import { useStickyHeader } from '../../hooks/useStickyHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

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
      <div className="flex justify-center items-center p-5">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  if (!receivables.length) {
    return (
      <div className="text-center p-5 text-black">
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
      'Accounting': 'px-2.5 py-1 rounded-full bg-yellow-500 text-white font-semibold text-sm',
      'RealEstate': 'px-2.5 py-1 rounded-full bg-green-600 text-white font-semibold text-sm',
      'Government': 'px-2.5 py-1 rounded-full bg-primary text-white font-semibold text-sm',
      'Other': 'px-2.5 py-1 rounded-full bg-gray-500 text-white font-semibold text-sm'
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
    openModal('recordPayment', {
      invoiceId: receivable.id,
      amountDue: receivable.remaining_amount,
      clientId: Number(receivable.client_id),
      clientName: receivable.client_name
    });
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
    <div className="w-full overflow-x-auto" dir="rtl">
      {/* Sentinel element for sticky header detection */}
      <div ref={sentinelRef} ></div>
      
      <Table>
        <TableHeader className={isSticky ? 'is-sticky' : ''}>
          <TableRow style={{ backgroundColor: filterType === 'paid' ? '#22c55e' : '#dc2626', color: 'white' }}>
            <TableHead className="text-center text-white font-bold" style={{ width: '5%' }}></TableHead>
            <TableHead className="text-center text-white font-bold" style={{ width: '8%' }}>‏العميل</TableHead>
            <TableHead className="text-center text-white font-bold" style={{ width: '7%' }}>‏رقم الهاتف</TableHead>
            <TableHead className="text-center text-white font-bold" style={{ width: '20%' }}>‏الوصف</TableHead>
            <TableHead className="text-center text-white font-bold" style={{ width: '10%' }}>‏النوع</TableHead>
            <TableHead className="text-center text-white font-bold" style={{ width: '12%' }}>‏المبلغ</TableHead>
            <TableHead className="text-center text-white font-bold" style={{ width: '12%' }}>‏المدفوع</TableHead>
            <TableHead className="text-center text-white font-bold" style={{ width: '12%' }}>‏المتبقي</TableHead>
            <TableHead className="text-center text-white font-bold" style={{ width: '10%' }}>‏تاريخ الأمر</TableHead>
            <TableHead className="text-center text-white font-bold" style={{ width: '4%' }}>‏الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedReceivables.map((receivable) => {
            const isExpanded = expandedRows.has(receivable.id);
            const hasPayments = receivable.payments && receivable.payments.length > 0;
            
            return (
              <React.Fragment key={receivable.id}>
                <TableRow className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-center">
                    {hasPayments && (
                      <button
                        className="p-0 text-primary hover:text-primary/80 transition-colors"
                        onClick={() => toggleRow(receivable.id)}
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-between" style={{ direction: 'rtl' }}>
                      <div
                        className="font-bold text-primary cursor-pointer"
                        onClick={() => handleClientClick(Number(receivable.client_id))}
                        style={{ cursor: 'pointer' }}
                      >
                        {receivable.client?.name}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-black text-sm flex justify-center items-center">
                        <button
                          className="p-0 text-green-600 hover:text-green-700 transition-colors ml-1"
                          onClick={() => handleWhatsApp(receivable.client?.phone || '')}
                          title="WhatsApp"
                        >
                          <MessageSquare size={12} />
                        </button>
                        <span className="text-black">{receivable.client?.phone}</span>
                      </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="truncate" style={{ maxWidth: '200px' }} title={receivable.description}>
                      {receivable.description}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {getTypeBadge(receivable.type)}
                  </TableCell>
                  <TableCell className="text-center font-bold text-red-600">
                    {formatCurrency(receivable.amount)}
                  </TableCell>
                  <TableCell className="text-center font-bold text-green-600">
                    {formatCurrency(receivable.total_paid)}
                  </TableCell>
                  <TableCell className="text-center font-bold text-primary">
                    {formatCurrency(receivable.remaining_amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    <small className={new Date(receivable.due_date) < new Date() ? 'text-red-600 font-bold' : 'text-black'}>
                      {formatDate(receivable.due_date)}
                    </small>
                  </TableCell>
                  <TableCell className="text-center">
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
                  </TableCell>
                </TableRow>
                
                {/* Expanded row for payments */}
                {isExpanded && hasPayments && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <h6 className="mb-3 text-primary font-semibold">تفاصيل المدفوعات</h6>
                        <div className="w-full overflow-x-auto">
                          <div className="grid grid-cols-5 gap-2 divide-y divide-border">
                            {/* Header */}
                            <div className="col-span-5 grid grid-cols-5 gap-2 bg-muted/50 p-2 rounded font-bold text-black text-sm">
                              <div className="text-center">المبلغ</div>
                              <div className="text-center">طريقة الدفع</div>
                              <div className="text-center">تاريخ الدفع</div>
                              <div className="text-center">الملاحظات</div>
                              <div className="text-center">الإجراءات</div>
                            </div>
                            {/* Rows */}
                            {receivable.payments.map((payment) => (
                              <div key={payment.id} className="col-span-5 grid grid-cols-5 gap-2 p-2 hover:bg-muted/20 transition-colors">
                                <div className="text-center font-bold text-green-600">
                                  {formatCurrency(payment.amount)}
                                </div>
                                <div className="text-center text-black">
                                  {payment.payment_method?.name_ar || 'غير محدد'}
                                </div>
                                <div className="text-center text-black">
                                  {formatDate(payment.paid_at)}
                                </div>
                                <div className="text-center text-black">
                                  {payment.note || '-'}
                                </div>
                                <div className="text-center flex gap-1 justify-center">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
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
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
        <TableHeader>
          <TableRow style={{ backgroundColor: filterType === 'paid' ? '#22c55e' : '#dc2626', color: 'white' }}>
            <TableCell colSpan={4} className="text-right text-white font-bold">الإجمالي</TableCell>
            <TableCell className="text-center text-white font-bold">
              {formatCurrency(totals.totalDebit)}
            </TableCell>
            <TableCell className="text-center text-white font-bold">
              {formatCurrency(totals.totalCredit)}
            </TableCell>
            <TableCell className="text-center text-white font-bold">
              {formatCurrency(totals.totalNet)}
            </TableCell>
            <TableCell colSpan={2}></TableCell>
          </TableRow>
        </TableHeader>
      </Table>
    </div>
  );
};

export default FilteredReceivablesTable;
