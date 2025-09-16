import React, { useState } from 'react';
import type { Payment, CreditAllocation } from '../../api/types';
import type { EmployeeReceivableDashboardItem } from '../../queries/employeeFinancialQueries';
import Button from '../ui/Button';
import { ChevronRight, ChevronDown, FileText, Edit3, Trash2 } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { useModalStore } from '../../stores/modalStore';
import { useStickyHeader } from '../../hooks/useStickyHeader';
import WhatsAppIcon from '../ui/WhatsAppIcon';
import { sendPaymentReminder } from '../../utils/whatsappUtils';

interface EmployeeClientsStatementsTableProps {
    receivables: EmployeeReceivableDashboardItem[];
    isLoading: boolean;
    filter?: 'all' | 'unpaid' | 'paid';
    hideAmounts?: boolean;
}

const EmployeeClientsStatementsTable: React.FC<EmployeeClientsStatementsTableProps> = ({
    receivables,
    isLoading,
    filter = 'all',
    hideAmounts = false,
}) => {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const openModal = useModalStore(state => state.openModal);
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
                <p className="mb-0">لا توجد مستحقات</p>
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


    const handleWhatsAppPaymentReminder = (phone: string, clientName: string, remainingAmount: number) => {
        const formattedAmount = formatCurrency(remainingAmount);
        sendPaymentReminder(phone, clientName, formattedAmount);
    };


    // Filter items based on the filter prop
    const filteredItems = receivables.filter(item => {
        switch (filter) {
            case 'unpaid':
                return item.remaining_amount > 0;
            case 'paid':
                return item.remaining_amount <= 0 && Number(item.amount) > 0;
            default:
                return true; // 'all'
        }
    });

    // Sort by date DESCENDING for newest-first display
    const sortedItems = [...filteredItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const totalDebit = filteredItems.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalCredit = filteredItems.reduce((sum, item) => sum + item.total_paid + item.total_allocated, 0);
    const totalDue = filteredItems.reduce((sum, item) => sum + item.remaining_amount, 0);

    const totals = {
        totalDebit,
        totalCredit,
        totalDue
    };

    return (
        <div className="receivables-table-container">
            <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        {/* Sentinel element for sticky header detection */}
                        <div ref={sentinelRef} ></div>

                        <table className="table table-hover mb-0 receivables-table">
                            <thead className={isSticky ? 'is-sticky' : ''}>
                                <tr style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                                    <th className="text-center py-3" style={{ width: '40px' }}></th>
                                    <th className="text-center py-3">العميل</th>
                                    <th className="text-center py-3">الوصف</th>
                                    <th className="text-center py-3">المدين</th>
                                    <th className="text-center py-3">الدائن</th>
                                    <th className="text-center py-3">المستحق</th>
                                    <th className="text-center py-3">تاريخ الاستحقاق</th>
                                    <th className="text-center py-3">النوع</th>
                                    <th className="text-center py-3">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedItems.map((item) => (
                                    <React.Fragment key={item.id}>
                                        <tr
                                            className="receivable-row cursor-pointer"
                                            onClick={() => ((item.payments && item.payments.length > 0) || (item.credit_allocations && item.credit_allocations.length > 0)) && toggleRow(item.id)}
                                        >
                                            <td className="text-center align-middle">
                                                {(item.payments && item.payments.length > 0) || (item.credit_allocations && item.credit_allocations.length > 0) ? (
                                                    expandedRows.has(item.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                                                ) : null}
                                            </td>
                                            <td className="fw-medium">
                                                <div>{item.client_name}</div>
                                                <small className="text-muted">{item.client_phone}</small>
                                            </td>
                                            <td className="fw-medium">
                                                {item.description || item.task_name}
                                                {item.task_name && <div><small className="text-muted">مهمة: {item.task_name}</small></div>}
                                            </td>
                                            <td className="text-center">
                                                <span className="fw-semibold">
                                                    {hideAmounts ? '***' : formatCurrency(Number(item.amount))}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className="text-success fw-semibold">
                                                    {hideAmounts ? '***' : formatCurrency(item.total_paid + item.total_allocated)}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className={`fw-bold ${item.remaining_amount > 0 ? 'text-danger' : 'text-success'}`}>
                                                    {hideAmounts ? '***' : formatCurrency(item.remaining_amount)}
                                                </span>
                                            </td>
                                            <td className="text-center small">{formatDate(item.due_date)}</td>
                                            <td className="text-center">{getTypeBadge(item.type)}</td>
                                            <td className="text-center">
                                                <div className="d-flex gap-1 justify-content-center">
                                                    {/* Edit/Delete buttons for manual receivables (no task_id) */}
                                                    {!item.task_id && (
                                                        <>
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const receivable = {
                                                                        id: item.receivables_details?.[0]?.id || item.id,
                                                                        client_id: Number(item.client_id),
                                                                        task_id: item.task_id ? Number(item.task_id) : null,
                                                                        reference_receivable_id: null,
                                                                        prepaid_receivable_id: null,
                                                                        created_by: Number(item.client_id),
                                                                        type: item.type,
                                                                        description: item.description,
                                                                        amount: Number(item.amount),
                                                                        original_amount: null,
                                                                        amount_details: [],
                                                                        adjustment_reason: null,
                                                                        notes: item.notes || '',
                                                                        due_date: item.due_date,
                                                                        created_at: item.created_at,
                                                                        updated_at: item.updated_at,
                                                                        client_name: item.client_name,
                                                                        client_phone: item.client_phone,
                                                                        task_name: item.task_name,
                                                                        task_type: item.task_type,
                                                                        total_paid: item.total_paid,
                                                                        remaining_amount: item.remaining_amount,
                                                                        payments: item.payments || [],
                                                                        allocations: [] as CreditAllocation[],
                                                                        client: {
                                                                            id: Number(item.client_id),
                                                                            name: item.client_name,
                                                                            phone: item.client_phone
                                                                        }
                                                                    } as any;
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
                                                                    const receivable = {
                                                                        id: item.receivables_details?.[0]?.id || item.id,
                                                                        client_id: Number(item.client_id),
                                                                        task_id: item.task_id ? Number(item.task_id) : null,
                                                                        reference_receivable_id: null,
                                                                        prepaid_receivable_id: null,
                                                                        created_by: Number(item.client_id),
                                                                        type: item.type,
                                                                        description: item.description,
                                                                        amount: Number(item.amount),
                                                                        original_amount: null,
                                                                        amount_details: [],
                                                                        adjustment_reason: null,
                                                                        notes: item.notes || '',
                                                                        due_date: item.due_date,
                                                                        created_at: item.created_at,
                                                                        updated_at: item.updated_at,
                                                                        client_name: item.client_name,
                                                                        client_phone: item.client_phone,
                                                                        task_name: item.task_name,
                                                                        task_type: item.task_type,
                                                                        total_paid: item.total_paid,
                                                                        remaining_amount: item.remaining_amount,
                                                                        payments: item.payments || [],
                                                                        allocations: [] as CreditAllocation[],
                                                                        client: {
                                                                            id: Number(item.client_id),
                                                                            name: item.client_name,
                                                                            phone: item.client_phone
                                                                        }
                                                                    } as any;
                                                                    openModal('deleteReceivable', { receivable });
                                                                }}
                                                            >
                                                                <Trash2 size={12} />
                                                            </Button>
                                                        </>
                                                    )}

                                                    {item.remaining_amount > 0 && (
                                                        <Button
                                                            variant="outline-success"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleWhatsAppPaymentReminder(item.client_phone, item.client_name, item.remaining_amount);
                                                            }}
                                                            title="إرسال تذكير دفع عبر واتساب"
                                                        >
                                                            <WhatsAppIcon size={12} />
                                                            تذكير
                                                        </Button>
                                                    )}

                                                    {item.remaining_amount <= 0 && Number(item.amount) > 0 && (
                                                        <span className="badge bg-success text-white small">مسدد</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {(expandedRows.has(item.id) && ((item.payments && item.payments.length > 0) || (item.credit_allocations && item.credit_allocations.length > 0))) && (
                                            <tr className="payment-details-row">
                                                <td colSpan={9} className="p-0">
                                                    <div style={{ backgroundColor: 'var(--color-gray-50)', padding: '1rem' }}>
                                                        {(item.payments && item.payments.length > 0) || (item.credit_allocations && item.credit_allocations.length > 0) ? (
                                                            <div>
                                                                {item.payments && item.payments.length > 0 && (
                                                                    <div className="mb-3">
                                                                        <div className="small text-muted mb-2 fw-medium">💳 تفاصيل المدفوعات ({item.payments.length}):</div>
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
                                                                                {item.payments.map((p: Payment) => {
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
                                                                                                        openModal('paymentEdit', { payment: p, receivable: { client_id: item.client_id } });
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

                                                                {item.credit_allocations && item.credit_allocations.length > 0 && (
                                                                    <div className={item.payments && item.payments.length > 0 ? 'mt-3' : ''}>
                                                                        <div className="small text-muted mb-2 fw-medium">🔄 تفاصيل التخصيصات ({item.credit_allocations.length}):</div>
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
                                                                                {item.credit_allocations.map((allocation: CreditAllocation) => (
                                                                                    <tr key={allocation.id || `${allocation.credit_id}-${allocation.receivable_id}`}>
                                                                                        <td className="text-center text-info fw-bold">{formatCurrency(allocation.amount)}</td>
                                                                                        <td className="text-center">{formatDate(allocation.allocated_at)}</td>
                                                                                        <td className="text-center">{allocation.description ?? 'تخصيص من رصيد العميل'}</td>
                                                                                        <td className="text-center">
                                                                                            تخصيص
                                                                                        </td>
                                                                                        <td className="text-center">
                                                                                            <Button
                                                                                                variant="outline-primary"
                                                                                                size="sm"
                                                                                                className="me-1"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    openModal('allocationEdit', { allocation, clientId: Number(item.client_id) });
                                                                                                }}
                                                                                            >
                                                                                                <Edit3 size={12} />
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant="danger"
                                                                                                size="sm"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    openModal('allocationDelete', { allocation, clientId: Number(item.client_id) });
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
                                <span className="fw-bold text-primary">{formatCurrency(totals.totalDebit)}</span>
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
                                <span className="small">إجمالي المستحق:</span>
                                <span className="fw-bold">{formatCurrency(totals.totalDue)}</span>
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

export default EmployeeClientsStatementsTable;
