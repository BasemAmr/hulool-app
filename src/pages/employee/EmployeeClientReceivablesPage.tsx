/**
 * EmployeeClientReceivablesPage
 * 
 * Shows invoices from tasks assigned to the current employee
 * - Displays client receivables in bordered Excel-style table
 * - Allows search and status filtering
 * - Shows WhatsApp reminder button (no payment actions)
 * - Read-only view for employees
 */

import { useState, useMemo } from 'react';
import { useGetEmployeeReceivables } from '../../queries/invoiceQueries';
import { useModalStore } from '../../stores/modalStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Card } from '../../components/ui/card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Badge } from '../../components/ui/badge';
import { Spinner } from '../../components/ui/spinner';
import WhatsAppIcon from '../../components/ui/WhatsAppIcon';
import { FileText, Search, X } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { useInView } from 'react-intersection-observer';
import { sendPaymentReminder, formatPhoneForWhatsApp } from '../../utils/whatsappUtils';
import type { Invoice, InvoiceStatus } from '../../api/types';

const EmployeeClientReceivablesPage = () => {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'partially_paid' | ''>('');
    const debouncedSearch = useDebounce(search, 500);
    const openModal = useModalStore((state) => state.openModal);

    // Fetch employee's assigned invoices
    const {
        data: invoicesData,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useGetEmployeeReceivables({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        per_page: 20,
    });

    // Flatten invoices
    const allInvoices = useMemo(
        () => invoicesData?.pages.flatMap((page) => page.invoices) || [],
        [invoicesData]
    );

    // Filter to show only unpaid/partially paid
    // const receivables = useMemo(
    //     () => allInvoices.filter(inv => Number(inv.remaining_amount) > 0),
    //     [allInvoices]
    // );

    // Infinite scroll trigger
    const { ref } = useInView({
        threshold: 1,
        onChange: (inView) => {
            if (inView && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        },
    });

    // Status options
    const statusOptions = [
        { value: '', label: 'الكل' },
        { value: 'pending', label: 'معلقة' },
        { value: 'partially_paid', label: 'مدفوعة جزئياً' },
        { value: 'overdue', label: 'متأخرة' },
    ];

    // Get status badge
    const getStatusBadge = (status: InvoiceStatus, paidAmount: number, amount: number) => {
        const isPaid = paidAmount >= amount;
        const isPartial = paidAmount > 0 && paidAmount < amount;

        if (isPaid) {
            return <Badge className="bg-green-100 text-green-700">مدفوعة</Badge>;
        }
        if (isPartial) {
            return <Badge className="bg-yellow-100 text-yellow-700">جزئية</Badge>;
        }
        if (status === 'overdue') {
            return <Badge className="bg-red-100 text-red-700">متأخرة</Badge>;
        }
        return <Badge className="bg-orange-100 text-orange-700">معلقة</Badge>;
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    // Handle WhatsApp reminder
    const handleWhatsAppReminder = (invoice: Invoice) => {
        if (!invoice.client?.phone) return;

        const formattedAmount = formatCurrency(Number(invoice.remaining_amount));
        sendPaymentReminder(
            invoice.client.phone,
            invoice.client.name || `عميل #${invoice.client_id}`,
            formattedAmount
        );
    };

    // Handle view details
    const handleViewDetails = (invoiceId: number) => {
        openModal('invoiceDetails', { invoiceId, isEmployeeView: true });
    };

    return (
        <div className="w-full h-full flex flex-col" dir="rtl">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">مستحقات العملاء</h1>
                <p className="text-gray-600">الفواتير من المهام المكلف بها</p>
            </div>

            {/* Filters */}
            <Card className="p-4 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[250px]">
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            <Search size={16} />
                        </div>
                        <Input
                            placeholder="البحث في الفواتير..."
                            value={search}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                            className="pr-10"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Status Filter */}
                    <div className="w-[200px]">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="w-full h-10 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Summary */}
                    <div className="mr-auto flex items-center gap-2 text-sm">
                        <span className="text-gray-600">إجمالي المستحقات:</span>
                        <span className="font-bold text-lg text-red-600">
                            {formatCurrency(allInvoices.reduce((sum, inv) => sum + Number(inv.remaining_amount), 0))} ر.س
                        </span>
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto">
                    {isLoading && allInvoices.length === 0 ? (
                        <div className="flex justify-center items-center h-full">
                            <Spinner />
                        </div>
                    ) : allInvoices.length === 0 ? (
                        <div className="text-center py-20">
                            <FileText size={48} className="text-gray-200 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">لا توجد مستحقات</h3>
                            <p className="text-gray-500 mt-1">
                                {search || statusFilter ? 'جرب تغيير شروط البحث' : 'جميع الفواتير مدفوعة'}
                            </p>
                        </div>
                    ) : (
                        <Table className="border-collapse border border-gray-300">
                            <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="text-start border border-gray-300 px-3 py-2">#</TableHead>
                                    <TableHead className="text-start border border-gray-300 px-3 py-2">العميل</TableHead>
                                    <TableHead className="text-start border border-gray-300 px-3 py-2">الهاتف</TableHead>
                                    <TableHead className="text-start border border-gray-300 px-3 py-2">المهمة</TableHead>
                                    <TableHead className="text-start border border-gray-300 px-3 py-2">المبلغ</TableHead>
                                    <TableHead className="text-start border border-gray-300 px-3 py-2">المدفوع</TableHead>
                                    <TableHead className="text-start border border-gray-300 px-3 py-2">المتبقي</TableHead>
                                    <TableHead className="text-start border border-gray-300 px-3 py-2">الاستحقاق</TableHead>
                                    <TableHead className="text-start border border-gray-300 px-3 py-2">الحالة</TableHead>
                                    <TableHead className="text-start border border-gray-300 px-3 py-2 w-[120px]">إجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allInvoices.map((invoice) => (
                                    <TableRow key={invoice.id} className="hover:bg-muted/20">
                                        <TableCell className="border border-gray-300 px-3 py-2 font-mono text-xs">
                                            {invoice.id}
                                        </TableCell>
                                        <TableCell className="border border-gray-300 px-3 py-2">
                                            <span className="font-medium text-sm">
                                                {invoice.client?.name || `عميل #${invoice.client_id}`}
                                            </span>
                                        </TableCell>
                                        <TableCell className="border border-gray-300 px-3 py-2">
                                            <span className="text-sm font-mono">
                                                {invoice.client?.phone || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="border border-gray-300 px-3 py-2">
                                            <span className="text-sm text-gray-600 truncate max-w-[200px] block">
                                                {invoice.task?.task_name || invoice.description || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="border border-gray-300 px-3 py-2">
                                            <span className="font-medium">{formatCurrency(Number(invoice.amount))}</span>
                                        </TableCell>
                                        <TableCell className="border border-gray-300 px-3 py-2">
                                            <span className={`text-sm ${Number(invoice.paid_amount) > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                                                {formatCurrency(Number(invoice.paid_amount))}
                                            </span>
                                        </TableCell>
                                        <TableCell className="border border-gray-300 px-3 py-2">
                                            <span className="text-sm text-red-600 font-bold">
                                                {formatCurrency(Number(invoice.remaining_amount))}
                                            </span>
                                        </TableCell>
                                        <TableCell className="border border-gray-300 px-3 py-2">
                                            <span className="text-xs font-mono text-gray-500">
                                                {new Date(invoice.due_date).toLocaleDateString('en-CA')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="border border-gray-300 px-3 py-2">
                                            {getStatusBadge(
                                                invoice.status,
                                                Number(invoice.paid_amount),
                                                Number(invoice.amount)
                                            )}
                                        </TableCell>
                                        <TableCell className="border border-gray-300 px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                {invoice.client?.phone && (
                                                    <button
                                                        onClick={() => handleWhatsAppReminder(invoice)}
                                                        title="إرسال تذكير دفع"
                                                        className="p-1.5 rounded border border-green-500 text-green-500 hover:bg-green-50 transition-colors"
                                                    >
                                                        <WhatsAppIcon size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleViewDetails(invoice.id)}
                                                    title="عرض التفاصيل"
                                                    className="p-1.5 rounded border border-primary text-primary hover:bg-primary/10 transition-colors"
                                                >
                                                    <FileText size={16} />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {/* Load More Trigger */}
                    <div ref={ref} className="h-10 w-full flex justify-center items-center">
                        {isFetchingNextPage && <Spinner size="sm" />}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default EmployeeClientReceivablesPage;
